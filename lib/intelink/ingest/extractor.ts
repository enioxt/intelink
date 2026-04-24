/**
 * INGEST-003: Extração estruturada via LLM (OpenRouter → Gemini 2.0 Flash).
 * Recebe texto bruto, retorna campos estruturados de Person.
 */

export interface ExtractedPerson {
    nome?: string;
    cpf?: string;
    rg?: string;
    data_nascimento?: string;
    nome_mae?: string;
    nome_pai?: string;
    sexo?: string;
    endereco?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    telefone?: string;
    reds_numbers?: string[];
    source_description?: string;
    confidence_notes?: string;
}

export interface ExtractionResult {
    persons: ExtractedPerson[];
    document_summary: string;
    model_used: string;
}

const EXTRACTION_PROMPT = `Você é um assistente especializado em extração de dados de documentos policiais brasileiros.

Analise o texto fornecido e extraia TODAS as pessoas mencionadas com seus dados.

Retorne SOMENTE um JSON válido no formato:
{
  "persons": [
    {
      "nome": "NOME COMPLETO EM MAIÚSCULAS",
      "cpf": "apenas dígitos, sem pontuação",
      "rg": "número do RG como aparece",
      "data_nascimento": "DD/MM/AAAA",
      "nome_mae": "NOME DA MÃE",
      "nome_pai": "NOME DO PAI",
      "sexo": "M ou F",
      "endereco": "endereço completo",
      "bairro": "bairro",
      "cidade": "cidade",
      "estado": "UF",
      "telefone": "número",
      "reds_numbers": ["lista de números BO/REDS mencionados"],
      "source_description": "descrição breve de onde vieram os dados",
      "confidence_notes": "observações sobre confiabilidade"
    }
  ],
  "document_summary": "resumo de 1-2 frases sobre o documento"
}

Regras:
- CPF: extraia apenas se tiver 11 dígitos (com ou sem formatação)
- Nomes: normalize para MAIÚSCULAS
- Se um campo não aparecer, omita-o (não inclua null)
- Separe pessoas distintas em elementos diferentes do array`;

export async function extractPersonsFromText(text: string): Promise<ExtractionResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY não configurada');

    const models = [
        'anthropic/claude-haiku-4-5',
        'anthropic/claude-haiku-4-5-20251001',
        'minimax/minimax-m1',
    ];

    let lastError: Error | null = null;

    for (const model of models) {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://intelink.ia.br',
                    'X-Title': 'Intelink Document Ingestion',
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: EXTRACTION_PROMPT },
                        { role: 'user', content: `TEXTO DO DOCUMENTO:\n\n${text.slice(0, 8000)}` },
                    ],
                    temperature: 0.1,
                    max_tokens: 3000,
                }),
                signal: AbortSignal.timeout(30000),
            });

            if (!response.ok) {
                throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
            }

            const data = await response.json() as {
                choices: Array<{ message: { content: string } }>;
            };
            const raw = data.choices[0]?.message?.content ?? '{}';

            let parsed: { persons?: ExtractedPerson[]; document_summary?: string };
            try {
                parsed = JSON.parse(raw);
            } catch {
                // Try to extract JSON from markdown code block
                const match = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
                parsed = match ? JSON.parse(match[1]) : { persons: [] };
            }

            return {
                persons: parsed.persons ?? [],
                document_summary: parsed.document_summary ?? '',
                model_used: model,
            };
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            continue;
        }
    }

    throw lastError ?? new Error('Todos os modelos LLM falharam');
}
