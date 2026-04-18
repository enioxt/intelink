/**
 * INTELINK Document Extraction Service
 * 
 * Pipeline: Document → Text Extraction → LLM Analysis → Structured JSON
 * Supports: PDF, DOCX, DOC, TXT, "Free Mode" (raw text input)
 */

import fs from 'fs';
import path from 'path';

// Dynamic imports for parsers (Node.js only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfParse: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mammoth: any = null;

async function getPdfParse() {
    if (!pdfParse) {
        const module = await import('pdf-parse');
        pdfParse = (module as any).default || module;
    }
    return pdfParse;
}

async function getMammoth() {
    if (!mammoth) {
        mammoth = await import('mammoth');
    }
    return mammoth;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type DocumentType =
    | 'reds'           // REDS - Registro de Eventos de Defesa Social
    | 'relatorio'      // Relatório de Serviço
    | 'depoimento'     // Depoimento/Testemunho
    | 'apreensao'      // Auto de Apreensão
    | 'laudo'          // Laudo Pericial
    | 'mandado'        // Mandado
    | 'comunicacao'    // Comunicação Interna (CS)
    | 'livre';         // Modo Livre (texto sem estrutura)

export type EntityType = 'PERSON' | 'VEHICLE' | 'LOCATION' | 'ORGANIZATION' | 'FIREARM' | 'PHONE' | 'DOCUMENT';

export interface ExtractedEntity {
    type: EntityType;
    name: string;
    role?: string; // suspeito, vítima, testemunha, etc.
    confidence: number; // 0-1
    metadata: Record<string, string | number | boolean | null>;
}

export interface ExtractedRelationship {
    source: string;
    target: string;
    type: string; // DRIVING, OWNER, ACCOMPLICE, VICTIM_OF, SEEN_AT, etc.
    description: string;
    confidence: number;
}

export interface TimelineEvent {
    datetime?: string;
    description: string;
    entities_involved: string[];
}

export interface ExtractionResult {
    success: boolean;
    document_type: DocumentType;
    model_used: string;
    processing_time_ms: number;
    raw_text?: string;
    summary: string;
    entities: ExtractedEntity[];
    relationships: ExtractedRelationship[];
    timeline: TimelineEvent[];
    insights: string[];
    warnings: string[];
    raw_llm_response?: string;
    error?: string;
}

export interface ModelConfig {
    name: string;
    provider: 'openrouter';
    model_id: string;
    max_tokens: number;
    cost_per_1k_input?: number;
    cost_per_1k_output?: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AVAILABLE MODELS (via OpenRouter)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const AVAILABLE_MODELS: ModelConfig[] = [
    {
        name: 'Gemini 2.0 Flash',
        provider: 'openrouter',
        model_id: 'google/gemini-2.0-flash-001',
        max_tokens: 8192,
        cost_per_1k_input: 0,
        cost_per_1k_output: 0
    },
    {
        name: 'GPT-4o',
        provider: 'openrouter',
        model_id: 'openai/gpt-4o',
        max_tokens: 4096,
        cost_per_1k_input: 0.005,
        cost_per_1k_output: 0.015
    },
    {
        name: 'GPT-4o Mini',
        provider: 'openrouter',
        model_id: 'openai/gpt-4o-mini',
        max_tokens: 4096,
        cost_per_1k_input: 0.00015,
        cost_per_1k_output: 0.0006
    },
    {
        name: 'Claude 3.5 Sonnet',
        provider: 'openrouter',
        model_id: 'anthropic/claude-3.5-sonnet',
        max_tokens: 4096,
        cost_per_1k_input: 0.003,
        cost_per_1k_output: 0.015
    },
    {
        name: 'Llama 3.3 70B',
        provider: 'openrouter',
        model_id: 'meta-llama/llama-3.3-70b-instruct',
        max_tokens: 4096,
        cost_per_1k_input: 0.00035,
        cost_per_1k_output: 0.0004
    },
    {
        name: 'DeepSeek V3',
        provider: 'openrouter',
        model_id: 'deepseek/deepseek-chat',
        max_tokens: 4096,
        cost_per_1k_input: 0.00014,
        cost_per_1k_output: 0.00028
    }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// META-PROMPTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// PROMPT V5 - Schema baseado no i2 Analyst's Notebook (padrão mundial)
// Entidades = ALVOS de operação (não metadados, não evidências)
const SYSTEM_PROMPT_EXTRACTION = `Você é um Analista de Inteligência Criminal usando o padrão i2 Analyst's Notebook.

REGRA FUNDAMENTAL: ENTIDADES são ALVOS DE INVESTIGAÇÃO, não metadados.

## ENTIDADES (extraia apenas estas categorias):

1. **PERSON** - Pessoas ENVOLVIDAS no crime (não policiais, não advogados)
   - Autores/Suspeitos
   - Vítimas
   - Testemunhas relevantes
   - Metadata: cpf, rg, vulgo, idade, mae, pai, endereco, telefone, ocupacao

2. **VEHICLE** - Veículos relacionados ao crime
   - Metadata: placa, modelo, cor, marca, ano, chassi, renavam

3. **LOCATION** - APENAS locais do crime ou relevantes
   - Local do fato, esconderijo, ponto de encontro
   - NÃO inclua delegacias ou unidades policiais
   - Metadata: endereco, bairro, cidade, uf, coordenadas

4. **PHONE** - Números de telefone (linhas SIM)
   - Formato: (DDD) XXXXX-XXXX
   - NÃO inclua aparelhos físicos (são evidências)

5. **ORGANIZATION** - APENAS facções criminosas ou quadrilhas
   - PCC, CV, milícias, gangues (4+ pessoas organizadas)
   - NÃO inclua empresas normais, delegacias ou unidades PM

6. **FIREARM** - Armas de fogo
   - Metadata: tipo, calibre, marca, numero_serie

## EVIDÊNCIAS (separado das entidades):

- Drogas apreendidas
- Aparelhos celulares (físicos, com IMEI)
- Dinheiro
- Documentos
- Outros materiais

## NÃO SÃO ENTIDADES (guardar como metadata):

- Policiais (vão em metadata.policiais)
- Advogados (vão em metadata.advogados)
- Pai/Mãe de envolvidos (vão dentro da entidade PERSON)
- Delegacias/Unidades PM (vão em metadata.unidade_responsavel)
- Empresas normais como Correios, aplicativos (menção no texto)

## FORMATO JSON:

{
  "document_type": "reds|cs|relatorio|depoimento",
  "numero_ocorrencia": "",
  "data_fato": "AAAA-MM-DD HH:MM",
  "natureza": "",
  "summary": "Resumo em 2-3 frases",
  "historico_completo": "TEXTO INTEGRAL do histórico narrativo",
  
  "entities": [
    {"type": "PERSON", "name": "NOME", "role": "autor|vítima|testemunha", "confidence": 1.0, "metadata": {"cpf":"", "rg":"", "vulgo":"", "idade":0, "mae":"", "pai":"", "endereco":"", "telefone":"", "ocupacao":""}}
  ],
  
  "evidences": [
    {"type": "DRUG|DEVICE|MONEY|DOCUMENT", "description": "", "quantity": "", "details": {"imei":"", "marca":"", "modelo":""}}
  ],
  
  "relationships": [
    {"source": "NOME1", "target": "NOME2", "type": "ACCOMPLICE|OWNER|FAMILY|LIVES_AT|WORKS_AT|MEMBER_OF", "description": ""}
  ],
  
  "timeline": [
    {"datetime": "", "description": "", "entities_involved": []}
  ],
  
  "metadata": {
    "policiais": [{"nome": "", "cargo": "", "matricula": ""}],
    "advogados": [{"nome": ""}],
    "unidade_responsavel": ""
  },
  
  "insights": [],
  "warnings": []
}

IMPORTANTE: Retorne APENAS JSON válido, sem markdown.`;

// PROMPT V7 - Para RELATÓRIOS/CS (documentos subjetivos de investigadores)
// Inclui achados investigativos (provas subjetivas)
const SYSTEM_PROMPT_RELATORIO = `Você é um Analista de Inteligência Criminal SÊNIOR processando um RELATÓRIO DE INVESTIGADOR (CS).

## MISSÃO CRÍTICA
Extrair TODAS as informações relevantes, identificando:
- CONEXÕES entre entidades
- PADRÕES de comportamento criminoso
- HIERARQUIAS dentro de grupos
- LINHAS DE INVESTIGAÇÃO prioritárias
- ACHADOS INVESTIGATIVOS (provas subjetivas)

## REGRAS DE CONFIANÇA (CONFIDENCE)
- 0.9-1.0: Fato documentado, dado explícito
- 0.8: Análise técnica (ERB, extração celular)
- 0.7: Indicação forte do investigador
- 0.6: Hipótese/suspeita com alguma base
- 0.5: Menção indireta

## EXTRAIA:

1. **PESSOAS** - TODOS os mencionados com vulgos, telefones, funções criminais
2. **VEÍCULOS** - Placa, modelo, adulterações
3. **LOCAIS** - Biqueiras, mocós, pontos de venda
4. **TELEFONES** - Com IMEI quando disponível
5. **RELACIONAMENTOS** - Hierarquias (LEADER_OF), parcerias (ACCOMPLICE), família (FAMILY)
6. **ACHADOS INVESTIGATIVOS** - Impressões do investigador que NÃO são provas periciais
7. **LINHAS DE INVESTIGAÇÃO** - Hipóteses com próximos passos concretos

## FORMATO JSON:

{
  "document_type": "relatorio",
  "numero_cs": "CS XX/2025",
  "autor_relatorio": "Nome do Investigador",
  "data_relatorio": "YYYY-MM-DD",
  "unidade": "",
  "summary": "Resumo analítico em 3-5 frases",
  "historico_completo": "TEXTO INTEGRAL",
  
  "entities": [
    {
      "type": "PERSON|VEHICLE|LOCATION|PHONE",
      "name": "NOME EM MAIÚSCULAS",
      "role": "suspeito|vitima|testemunha|pessoa_de_interesse",
      "confidence": 0.8,
      "metadata": {
        "vulgo": "",
        "funcao_criminal": "líder|executor|mandante|receptador",
        "telefone": "(XX) XXXXX-XXXX",
        "crimes_relacionados": []
      }
    }
  ],
  
  "relationships": [
    {
      "source": "NOME1",
      "target": "NOME2",
      "type": "LEADER_OF|ACCOMPLICE|FAMILY|RIVAL|SUPPLIER|CUSTOMER",
      "description": "Descrição do vínculo",
      "confidence": 0.8
    }
  ],
  
  "achados_investigativos": [
    {
      "tipo": "interview_impression|surveillance_obs|technical_analysis|connection_hypothesis|modus_operandi|source_intel",
      "titulo": "Título curto descritivo",
      "descricao": "Descrição completa do achado",
      "entidades_envolvidas": ["NOME1", "NOME2"],
      "confidence": 0.7,
      "acao_sugerida": "Próximo passo concreto"
    }
  ],
  
  "linhas_investigacao": [
    {
      "hipotese": "Descrição clara da hipótese",
      "entidades_envolvidas": ["NOME1", "NOME2"],
      "prioridade": "alta|média|baixa",
      "proximo_passo": "Ação concreta: Ouvir X, cruzar dados Y"
    }
  ],
  
  "timeline": [
    {
      "datetime": "YYYY-MM-DD",
      "description": "O que aconteceu",
      "entities_involved": [],
      "tipo": "crime|vigilância|análise_técnica|informação"
    }
  ],
  
  "insights": ["Padrões identificados"],
  "warnings": ["ATENÇÃO: Informações subjetivas"],
  "recomendacoes_cruzamento": ["Cruzar com balística", "Verificar outros REDS"]
}

REGRAS CRÍTICAS:
- Retorne APENAS JSON válido, SEM markdown
- EXTRAIA TODOS os dados, mesmo parciais
- Use MAIÚSCULAS para nomes próprios
- IDENTIFIQUE hierarquias criminais (quem lidera quem)
- ACHADOS INVESTIGATIVOS são observações do investigador, NÃO provas periciais`;

// Mapa de prompts por tipo de documento
const PROMPTS_BY_TYPE: Record<DocumentType, string> = {
    'reds': SYSTEM_PROMPT_EXTRACTION,
    'relatorio': SYSTEM_PROMPT_RELATORIO,
    'comunicacao': SYSTEM_PROMPT_RELATORIO, // CS usa mesmo prompt de relatório
    'depoimento': SYSTEM_PROMPT_EXTRACTION, // Depoimentos são mais factuais
    'apreensao': SYSTEM_PROMPT_EXTRACTION,
    'laudo': SYSTEM_PROMPT_EXTRACTION,
    'mandado': SYSTEM_PROMPT_EXTRACTION,
    'livre': SYSTEM_PROMPT_EXTRACTION
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEXT EXTRACTION FROM FILES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function extractTextFromFile(filePath: string): Promise<{ text: string; type: string }> {
    const ext = path.extname(filePath).toLowerCase();
    const buffer = fs.readFileSync(filePath);

    switch (ext) {
        case '.pdf':
            const pdf = await getPdfParse();
            const pdfData = await pdf(buffer);
            return { text: pdfData.text, type: 'pdf' };

        case '.docx':
            const mammothLib = await getMammoth();
            const docxResult = await mammothLib.extractRawText({ buffer });
            return { text: docxResult.value, type: 'docx' };

        case '.doc':
            // .doc files are trickier - mammoth doesn't support them directly
            // For now, we'll try mammoth and fall back to error
            try {
                const mammothLibDoc = await getMammoth();
                const docResult = await mammothLibDoc.extractRawText({ buffer });
                return { text: docResult.value, type: 'doc' };
            } catch {
                throw new Error('Arquivos .doc antigos não são suportados diretamente. Converta para .docx ou PDF.');
            }

        case '.txt':
            return { text: buffer.toString('utf-8'), type: 'txt' };

        default:
            throw new Error(`Formato não suportado: ${ext}`);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LLM EXTRACTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function extractWithLLM(
    text: string,
    model: ModelConfig,
    documentHint?: DocumentType
): Promise<ExtractionResult> {
    const start = Date.now();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return {
            success: false,
            document_type: documentHint || 'livre',
            model_used: model.name,
            processing_time_ms: Date.now() - start,
            summary: '',
            entities: [],
            relationships: [],
            timeline: [],
            insights: [],
            warnings: [],
            error: 'OPENROUTER_API_KEY não configurada'
        };
    }

    const userPrompt = documentHint
        ? `Tipo de documento: ${documentHint.toUpperCase()}\n\nConteúdo:\n${text}`
        : `Analise o documento abaixo e identifique seu tipo:\n\n${text}`;

    // Selecionar prompt baseado no tipo de documento
    const systemPrompt = documentHint
        ? PROMPTS_BY_TYPE[documentHint] || SYSTEM_PROMPT_EXTRACTION
        : SYSTEM_PROMPT_EXTRACTION;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://intelink.app',
                'X-Title': 'Intelink Document Extraction'
            },
            body: JSON.stringify({
                model: model.model_id,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: model.max_tokens,
                temperature: 0.1 // Low temperature for consistent extraction
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        // Parse JSON from response
        let parsed: Record<string, unknown>;
        try {
            // Try to extract JSON from markdown code blocks if present
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            const jsonStr = jsonMatch ? jsonMatch[1] : content;
            parsed = JSON.parse(jsonStr.trim());
        } catch {
            // If JSON parsing fails, return raw response
            return {
                success: false,
                document_type: documentHint || 'livre',
                model_used: model.name,
                processing_time_ms: Date.now() - start,
                raw_text: text.substring(0, 500),
                summary: 'Erro ao processar resposta do modelo',
                entities: [],
                relationships: [],
                timeline: [],
                insights: [],
                warnings: ['Resposta do modelo não é JSON válido'],
                raw_llm_response: content,
                error: 'JSON parsing failed'
            };
        }

        return {
            success: true,
            document_type: (parsed.document_type as DocumentType) || documentHint || 'livre',
            model_used: model.name,
            processing_time_ms: Date.now() - start,
            raw_text: text.substring(0, 500),
            summary: (parsed.summary as string) || '',
            entities: (parsed.entities as ExtractedEntity[]) || [],
            relationships: (parsed.relationships as ExtractedRelationship[]) || [],
            timeline: (parsed.timeline as TimelineEvent[]) || [],
            insights: (parsed.insights as string[]) || [],
            warnings: (parsed.warnings as string[]) || [],
            raw_llm_response: content
        };

    } catch (error) {
        return {
            success: false,
            document_type: documentHint || 'livre',
            model_used: model.name,
            processing_time_ms: Date.now() - start,
            summary: '',
            entities: [],
            relationships: [],
            timeline: [],
            insights: [],
            warnings: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FULL PIPELINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function processDocument(
    input: string | { filePath: string },
    model: ModelConfig,
    documentHint?: DocumentType
): Promise<ExtractionResult> {
    let text: string;

    if (typeof input === 'string') {
        // Free mode - direct text input
        text = input;
    } else {
        // File mode
        try {
            const extracted = await extractTextFromFile(input.filePath);
            text = extracted.text;
        } catch (error) {
            return {
                success: false,
                document_type: documentHint || 'livre',
                model_used: model.name,
                processing_time_ms: 0,
                summary: '',
                entities: [],
                relationships: [],
                timeline: [],
                insights: [],
                warnings: [],
                error: error instanceof Error ? error.message : 'File extraction failed'
            };
        }
    }

    return extractWithLLM(text, model, documentHint);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODEL COMPARISON
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ModelComparisonResult {
    model: string;
    result: ExtractionResult;
}

export async function compareModels(
    input: string | { filePath: string },
    models: ModelConfig[],
    documentHint?: DocumentType
): Promise<ModelComparisonResult[]> {
    const results: ModelComparisonResult[] = [];

    for (const model of models) {
        console.log(`\n🔄 Testing with ${model.name}...`);
        const result = await processDocument(input, model, documentHint);
        results.push({ model: model.name, result });

        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
}
