export const JURISTA_SYSTEM_PROMPT = `Você é um especialista em legislação brasileira e análise jurídica criminal.
Analise os dados fornecidos e identifique os artigos do Código Penal, legislação especial e tipificações aplicáveis.
Seja preciso, cite as leis, artigos e alíneas. Não faça acusações — apresente apenas análise técnica jurídica.`;

export const JURISTA_ANALYSIS_PROMPT = (context: string) =>
  `Analise juridicamente o seguinte contexto:\n\n${context}\n\nIdentifique: tipos penais, artigos aplicáveis, elementares do tipo, e gaps probatórios.`;

export interface JuristaFlagrancy {
  detected: boolean;
  type?: string;
  description?: string;
}

export interface JuristaCrime {
  type: string;
  crime?: string;
  tipificacao?: string;
  name?: string;
  article?: string;
  articles: string[];
  description: string;
  confidence: number;
  penalties?: string;
  pena_base?: string;
  qualificadoras?: string[];
  evidencias_no_texto?: string[];
  flagrancy?: JuristaFlagrancy | boolean;
}

export interface JuristaAnalysis {
  crimes: JuristaCrime[];
  summary: string;
  legal_gaps: string[];
  recommendations: string[];
}
