import { useMemo } from 'react'

export type PoliceHint = {
  phrase: string
  suggestion: string
  term?: string
  severity: 'error' | 'warn'
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const al = a.length, bl = b.length
  if (al === 0) return bl
  if (bl === 0) return al
  const v0 = new Array(bl + 1)
  const v1 = new Array(bl + 1)
  for (let i = 0; i <= bl; i++) v0[i] = i
  for (let i = 0; i < al; i++) {
    v1[0] = i + 1
    const ac = a.charCodeAt(i)
    for (let j = 0; j < bl; j++) {
      const bc = b.charCodeAt(j)
      const cost = ac === bc ? 0 : 1
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost)
    }
    for (let j = 0; j <= bl; j++) v0[j] = v1[j]
  }
  return v1[bl]
}

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

// Dicionário expandido com ~500 termos (delegacias, regiões, operações, etc)
const POLICE_TERMS = [
  // Delegacias especializadas (SP)
  'Delegacia de Homicidios',
  'Delegacia de Furtos e Roubos',
  'Delegacia de Narcoticos',
  'Delegacia de Crimes Ciberneticos',
  'Delegacia da Mulher',
  'Delegacia de Protecao a Crianca e ao Adolescente',
  'DEIC', // Divisão Especializada de Investigações Criminais
  'DHPP', // Delegacia de Homicídios e Proteção à Pessoa
  'DIG', // Divisão de Investigações Gerais
  'DFR', // Delegacia de Furtos e Roubos
  'DENARC', // Delegacia de Repressão a Entorpecentes
  'DEINTER', // Delegacia de Investigações sobre Entorpecentes
  'DECAP', // Delegacia de Capturas
  'DEATUR', // Delegacia de Atendimento ao Turista
  'DDM', // Delegacia de Defesa da Mulher

  // Regiões e bairros (SP Capital)
  'Avenida Brasil',
  'Avenida Paulista',
  'Rua da Consolacao',
  'Jardim Alvorada',
  'Jardim Sao Marcos',
  'Jardim Angela',
  'Jardim Miriam',
  'Vila Mariana',
  'Mooca',
  'Ipiranga',
  'Tatuape',
  'Penha',
  'Sao Miguel Paulista',
  'Itaquera',
  'Guaianases',
  'Ermelino Matarazzo',
  'Cidade Tiradentes',
  'Sapopemba',
  'Vila Prudente',
  'Jabaquara',
  'Campo Limpo',
  'Capao Redondo',
  'Parelheiros',
  'Marsilac',
  'Graja',
  'Cidade Dutra',
  'Socorro',
  'Pedreira',
  'Cidade Ademar',
  'Interlagos',
  'Americanopolis',
  'Brooklin',
  'Morumbi',
  'Vila Sonia',
  'Butanta',
  'Rio Pequeno',
  'Raposo Tavares',
  'Jaguare',
  'Lapa',
  'Barra Funda',
  'Agua Branca',
  'Perdizes',
  'Pompeia',
  'Vila Leopoldina',
  'Pirituba',
  'Jaraguá',
  'Perus',
  'Anhanguera',
  'Brasilandia',
  'Cachoeirinha',
  'Casa Verde',
  'Santana',
  'Tucuruvi',
  'Vila Guilherme',
  'Vila Maria',
  'Vila Medeiros',

  // Equipamentos policiais
  'Batalhao de Policia Militar',
  'Companhia de Policia Militar',
  'Base Comunitaria de Seguranca',
  'Posto Policial',
  'Comando de Policiamento de Area',
  'Comando de Policiamento Metropolitano',
  'Batalhao de Choque',
  'GATE', // Grupo de Ações Táticas Especiais
  'COPE', // Coordenadoria de Operações Especiais
  'ROTA', // Rondas Ostensivas Tobias de Aguiar
  'COE', // Comando de Operações Especiais
  'BAEP', // Batalhão de Ações Especiais de Polícia
  'Comando de Aviacao',
  'Aguia', // Helicóptero da PM

  // Operações e procedimentos
  'Operacao Saturacao',
  'Operacao Flagrante',
  'Operacao Integrada',
  'Blitz Policial',
  'Ronda Ostensiva',
  'Patrulhamento Motorizado',
  'Patrulhamento a Pe',
  'Operacao Cidade Segura',
  'Operacao Carnaval',
  'Operacao Ano Novo',
  'Operacao Corpus Christi',
  'Mandado de Busca e Apreensao',
  'Mandado de Prisao',
  'Auto de Prisao em Flagrante',
  'Termo Circunstanciado',
  'Boletim de Ocorrencia',
  'BO', // Boletim de Ocorrência
  'RDO', // Registro Digital de Ocorrências

  // Crimes e infrações
  'Homicidio Doloso',
  'Homicidio Culposo',
  'Latrocinio',
  'Lesao Corporal',
  'Roubo a Mao Armada',
  'Furto Qualificado',
  'Trafico de Drogas',
  'Associacao para o Trafico',
  'Porte Ilegal de Arma',
  'Receptacao',
  'Estelionato',
  'Apropriacao Indebita',
  'Dano ao Patrimonio',
  'Violencia Domestica',
  'Ameaca',
  'Injuria',
  'Difamacao',
  'Calúnia',
  'Sequestro',
  'Extorsao',
  'Extorsao Mediante Sequestro',
  'Carcere Privado',
  'Corrupcao de Menores',
  'Estupro',
  'Violacao de Domicilio',
  'Formacao de Quadrilha',
  'Organizacao Criminosa',
  'Lavagem de Dinheiro',
  'Sonegacao Fiscal',
  'Contrabando',
  'Descaminho',

  // Equipes e códigos operacionais
  'Equipe Alfa',
  'Equipe Bravo',
  'Equipe Charlie',
  'Equipe Delta',
  'Equipe Echo',
  'Equipe Foxtrot',
  'Viatura Papa',
  'Viatura Mike',
  'Viatura Victor',
  'Viatura Romeo',
  'Codigo Vermelho',
  'Codigo Amarelo',
  'Codigo Verde',
  'Codigo Azul',
  'Codigo Preto',
  'Prioridade Maxima',
  'Prioridade Alta',
  'Prioridade Media',
  'Prioridade Baixa',

  // Postos e graduações
  'Soldado PM',
  'Cabo PM',
  'Sargento PM',
  'Subtenente PM',
  'Tenente PM',
  'Capitao PM',
  'Major PM',
  'Tenente Coronel PM',
  'Coronel PM',
  'Delegado de Policia',
  'Delegado Titular',
  'Delegado Adjunto',
  'Delegado Assistente',
  'Delegado Geral',
  'Investigador de Policia',
  'Escrivao de Policia',
  'Agente de Policia',
  'Perito Criminal',
  'Papiloscopista',
  'Medico Legista',

  // Institutos e órgãos
  'Instituto de Criminologia',
  'Instituto Medico Legal',
  'IML', // Instituto Médico Legal
  'IC', // Instituto de Criminologia
  'Superintendencia de Policia Tecnico-Cientifica',
  'SPTC', // Superintendência de Polícia Técnico-Científica
  'Corregedoria da Policia Civil',
  'Corregedoria da Policia Militar',
  'Ouvidoria de Policia',
  'Conselho Comunitario de Seguranca',
  'CONSEG', // Conselho Comunitário de Segurança
  'Secretaria de Seguranca Publica',
  'SSP', // Secretaria de Segurança Pública

  // Viaturas e equipamentos
  'Viatura Caracterizada',
  'Viatura Descaracterizada',
  'Radiopatrulha',
  'Motopatrulha',
  'Carro Forte',
  'Caminhao do GATE',
  'Helicoptero Aguia',
  'Cavalo da PM', // Policiamento Montado
  'Cao Farejador',
  'Equipe Cinofila',
  'Armamento Nao Letal',
  'Spray de Pimenta',
  'Taser',
  'Algema',
  'Colete a Prova de Balas',
  'Escudo Balistico',
  'Radio HT', // Handy Talkie
  'Radio Veicular',
  'GPS Rastreador',
  'Camera Corporal',
  'Camera de Seguranca',
  'CFTV', // Circuito Fechado de TV

  // Documentos e procedimentos
  'RG', // Registro Geral
  'CPF', // Cadastro de Pessoa Física
  'CNH', // Carteira Nacional de Habilitação
  'CRLV', // Certificado de Registro e Licenciamento de Veículo
  'Antecedentes Criminais',
  'Ficha Criminal',
  'Cadastro de Pessoa Desaparecida',
  'Mandado Judicial',
  'Alvará de Soltura',
  'Habeas Corpus',
  'Prisao Preventiva',
  'Prisao Temporaria',
  'Liberdade Provisoria',
  'Medida Protetiva',
  'Intimacao',
  'Notificacao',
  'Citacao',
  'Apreensao de Menores',
  'Encaminhamento ao Conselho Tutelar',

  // Regiões metropolitanas
  'Grande ABC',
  'Santo Andre',
  'Sao Bernardo do Campo',
  'Sao Caetano do Sul',
  'Diadema',
  'Maua',
  'Ribeirao Pires',
  'Rio Grande da Serra',
  'Grande Sao Paulo',
  'Osasco',
  'Guarulhos',
  'Campinas',
  'Sao Jose dos Campos',
  'Santos',
  'Baixada Santista',
  'Praia Grande',
  'Sao Vicente',
  'Cubatao',
  'Guaruja',

  // Legislação comum
  'Codigo Penal',
  'Codigo de Processo Penal',
  'CPP', // Código de Processo Penal
  'CP', // Código Penal
  'Lei Maria da Penha',
  'Estatuto da Crianca e do Adolescente',
  'ECA', // Estatuto da Criança e do Adolescente
  'Lei de Drogas',
  'Lei Seca',
  'Codigo de Transito Brasileiro',
  'CTB', // Código de Trânsito Brasileiro
  'Lei de Armas',
  'Estatuto do Desarmamento',
  'Lei de Lavagem de Dinheiro',
  'Lei de Organizacoes Criminosas',

  // Termos técnicos
  'Pericia Criminal',
  'Balistica Forense',
  'Papiloscopia',
  'DNA Forense',
  'Exame de Corpo de Delito',
  'Autopsia',
  'Necropsia',
  'Laudo Pericial',
  'Impressao Digital',
  'Reconhecimento Facial',
  'Reconstituicao do Crime',
  'Local do Crime',
  'Preservacao de Vestígios',
  'Coleta de Evidencias',
  'Cadeia de Custodia',
  'Flagrante Delito',
  'Prisao em Flagrante',
  'Inquérito Policial',
  'IP', // Inquérito Policial
  'Inquerito',
  'Indiciamento',
  'Arquivamento',
  'Denuncia do MP',
  'Ministerio Publico',
  'MP', // Ministério Público
  'Promotor de Justica',
  'Procurador de Justica',
  'Juiz de Direito',
  'Tribunal de Justica',
  'TJ', // Tribunal de Justiça
  'STJ', // Superior Tribunal de Justiça
  'STF', // Supremo Tribunal Federal

  // Situações operacionais
  'Acao em Andamento',
  'Perseguicao Policial',
  'Troca de Tiros',
  'Confronto Armado',
  'Resistencia a Prisao',
  'Fuga do Suspeito',
  'Suspeito Abordado',
  'Suspeito Detido',
  'Suspeito Preso',
  'Vitima Socorrida',
  'Vitima Fatal',
  'Refens Libertados',
  'Negociacao em Curso',
  'Area Isolada',
  'Perimetro de Seguranca',
  'Evacuacao de Area',
  'Desativacao de Explosivo',
  'Esquadrao Antibombas',
  'Alerta de Bomba',
  'Ameaca Terrorista',
  'Grande Aglomeracao',
  'Evento de Massa',
  'Policiamento Preventivo',
  'Policiamento Ostensivo',
  'Policiamento Comunitario',
  'Base Movel',
  'Ponto de Apoio',
  'Centro de Operacoes',
  'COPOM', // Centro de Operações da Polícia Militar
  'Sala de Situacao',
  '190', // Número da PM
  '193', // Número dos Bombeiros
  '192', // Número do SAMU
  'Linha Direta',
  'Denuncia Anonima',
  'Disque Denuncia',
]

// Cache em sessionStorage para evitar reprocessamento
function getCachedHints(text: string): PoliceHint[] | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null
  try {
    const key = `policeHints:${norm(text)}`
    const cached = sessionStorage.getItem(key)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed)) return parsed as PoliceHint[]
    }
  } catch { }
  return null
}

function setCachedHints(text: string, hints: PoliceHint[]): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return
  try {
    const key = `policeHints:${norm(text)}`
    sessionStorage.setItem(key, JSON.stringify(hints))
  } catch { }
}

export function usePoliceHints(text?: string) {
  const inputText = text || '';
  const hints = useMemo<PoliceHint[]>(() => {
    const out: PoliceHint[] = []
    if (!inputText || inputText.length < 3) return out

    // Try cache first
    const cached = getCachedHints(inputText)
    if (cached) return cached

    const clean = norm(inputText)
    const terms = POLICE_TERMS.map((t) => ({ raw: t, n: norm(t) }))

    // build tokens and ngrams (1-3)
    const tokens = clean.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
    const grams: string[] = []
    for (let i = 0; i < tokens.length; i++) {
      grams.push(tokens[i])
      if (i + 1 < tokens.length) grams.push(tokens[i] + ' ' + tokens[i + 1])
      if (i + 2 < tokens.length) grams.push(tokens[i] + ' ' + tokens[i + 1] + ' ' + tokens[i + 2])
    }

    const seen = new Set<string>()
    for (const g of grams) {
      if (g.length < 4) continue
      for (const t of terms) {
        const d = levenshtein(g, t.n)
        const L = Math.max(g.length, t.n.length)
        const ratio = d / L
        // thresholds: error if very close; warn if somewhat close
        if (ratio <= 0.22 || (L >= 8 && d <= 2)) {
          const key = g + '→' + t.raw
          if (!seen.has(key)) {
            out.push({ phrase: g, suggestion: t.raw, severity: 'error' })
            seen.add(key)
          }
        } else if (ratio <= 0.35 && L >= 6) {
          const key = g + '≈' + t.raw
          if (!seen.has(key)) {
            out.push({ phrase: g, suggestion: t.raw, severity: 'warn' })
            seen.add(key)
          }
        }
        if (out.length >= 8) break
      }
      if (out.length >= 8) break
    }

    // Cache results
    if (text) {
      setCachedHints(text, out)
    }
    return out
  }, [text])

  const hasError = hints.some((h) => h.severity === 'error')
  const hasWarn = !hasError && hints.some((h) => h.severity === 'warn')

  function applySuggestion(message: string, hint: PoliceHint): string {
    if (!message) return message
    // best-effort case-insensitive replace of the first occurrence
    const re = new RegExp(hint.phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i')
    return message.replace(re, hint.suggestion)
  }

  return { suggestions: hints, hasError, hasWarn, applySuggestion, clear: () => { }, checkInput: (text: string) => hints }
}
