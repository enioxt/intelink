// ─── Inline Types for Demo Data ─────────────────────────────
export interface Entity {
    id: string;
    type: string;
    label: string;
    properties: Record<string, string | number>;
    riskScore: number;
    status: string;
}

export interface Relationship {
    id: string;
    source: string;
    target: string;
    type: string;
    label: string;
    properties: Record<string, string | number>;
}

export interface TimelineEvent {
    id: string;
    date: string;
    title: string;
    description: string;
    type: string;
    source: string;
}

// ─── Synthetic Entities ─────────────────────────────────────
export const syntheticEntities: Record<string, Entity> = {
    'dep_federal_1': {
        id: 'dep_federal_1',
        type: 'person',
        label: 'Deputado Federal [Oculto]',
        properties: {
            cpf: '***.456.789-**',
            role: 'Deputado Federal (MDB/SP)',
            declared_assets: 2800000,
            estimated_assets: 80000000,
            monthly_salary: 44600,
            cabinet_expense_quota: 1200000,
            donations_received: 4700000
        },
        riskScore: 97,
        status: 'flagged'
    },
    'pref_santo_andre': {
        id: 'pref_santo_andre',
        type: 'government',
        label: 'Prefeitura de Santo André',
        properties: {
            cnpj: '45.748.435/0001-33',
            mayor_party: 'MDB',
            budget: 1540000000
        },
        riskScore: 50,
        status: 'active'
    },
    'abc_construcoes': {
        id: 'abc_construcoes',
        type: 'company',
        label: 'ABC Construções Ltda',
        properties: {
            cnpj: '11.222.333/0001-44',
            status: 'Ativa',
            founded: '2017-06-15'
        },
        riskScore: 85,
        status: 'flagged'
    },
    'jsj_comunicacao': {
        id: 'jsj_comunicacao',
        type: 'company',
        label: 'JSJ Comunicação',
        properties: {
            cnpj: '55.666.777/0001-88',
            status: 'Ativa',
            founded: '2020-02-10'
        },
        riskScore: 80,
        status: 'flagged'
    },
    'ms_saude': {
        id: 'ms_saude',
        type: 'company',
        label: 'MS Saúde e Serviços',
        properties: {
            cnpj: '99.888.777/0001-22',
            status: 'Ativa',
            founded: '2019-01-20'
        },
        riskScore: 91,
        status: 'flagged'
    }
};

// ─── Synthetic Relationships ────────────────────────────────
export const syntheticRelationships: Relationship[] = [
    {
        id: 'rel_1',
        source: 'dep_federal_1',
        target: 'pref_santo_andre',
        type: 'assigned_emenda',
        label: 'Emenda Parlamentar',
        properties: { amount: 47000000, year: 2023, instrument: 'Transferência Especial (Pix)' }
    },
    {
        id: 'rel_2',
        source: 'pref_santo_andre',
        target: 'abc_construcoes',
        type: 'contracted',
        label: 'Contrato Administrativo',
        properties: { amount: 32000000, percentage_of_emenda: 67, purpose: 'Obras de infraestrutura' }
    },
    {
        id: 'rel_3',
        source: 'dep_federal_1',
        target: 'abc_construcoes',
        type: 'family_tie',
        label: 'Irmão é sócio-administrador',
        properties: {}
    },
    {
        id: 'rel_4',
        source: 'pref_santo_andre',
        target: 'jsj_comunicacao',
        type: 'contracted',
        label: 'Licitação Comunicação',
        properties: { amount: 5000000 }
    },
    {
        id: 'rel_5',
        source: 'dep_federal_1',
        target: 'jsj_comunicacao',
        type: 'family_tie',
        label: 'Filho é proprietário',
        properties: {}
    },
    {
        id: 'rel_6',
        source: 'ms_saude',
        target: 'dep_federal_1',
        type: 'donated',
        label: 'Doação de Campanha',
        properties: { amount: 150000, year: 2022 }
    },
    {
        id: 'rel_7',
        source: 'pref_santo_andre',
        target: 'ms_saude',
        type: 'contracted',
        label: 'Repasse SUS',
        properties: { amount: 12000000, year: 2023 }
    }
];

// ─── Synthetic Anomalies ────────────────────────────────────
export const syntheticAnomalies = [
    {
        id: 'anom_1',
        type: 'critical',
        title: 'Auto-direcionamento de emendas',
        description: 'Deputado destinou R$ 47M em emendas para município aliado, sendo que 67% destes recursos viraram contratos para empresa de seu irmão.',
        score: 97,
        value: 47000000,
        entities: ['dep_federal_1', 'pref_santo_andre', 'abc_construcoes']
    },
    {
        id: 'anom_2',
        type: 'critical',
        title: '34 Funcionários fantasma detectados',
        description: 'Cruzamento RAIS x Folha Municipal revela 34 pessoas com duplo vínculo (empregadas na ABC Construções e servidores públicos do município simultaneamente).',
        score: 94,
        value: 2400000,
        entities: ['pref_santo_andre', 'abc_construcoes']
    },
    {
        id: 'anom_3',
        type: 'critical',
        title: 'Circuito fechado: Doação → SUS',
        description: 'Empresa doou R$ 150K para campanha, e logo depois começou a receber repasses milionários do SUS via município aliado ao deputado.',
        score: 91,
        value: 12150000,
        entities: ['ms_saude', 'dep_federal_1', 'pref_santo_andre']
    },
    {
        id: 'anom_4',
        type: 'high',
        title: 'Patrimônio incompatível',
        description: 'Deputado declarou R$ 2.8M ao TSE, mas estimativas baseadas em offshores e imóveis rurais (INPE/Receita) sugerem R$ 80M+.',
        score: 89,
        value: 77200000,
        entities: ['dep_federal_1']
    }
];

// ─── Synthetic Timeline ─────────────────────────────────────
export const syntheticTimeline: TimelineEvent[] = [
    { id: 't1', date: '2017-06-15', title: 'Empresa do Irmão fundada', description: 'ABC Construções registrada na Receita Federal.', type: 'registration', source: 'Receita Federal' },
    { id: 't2', date: '2018-01-01', title: 'Offshore Panamá registrada', description: 'Empresa sediada em paraíso fiscal identificada (possível ocultação de patrimônio).', type: 'registration', source: 'Receita Federal' },
    { id: 't3', date: '2018-10-07', title: 'Eleito para 1º Mandato', description: 'Eleito Deputado Federal com 187K votos.', type: 'election', source: 'TSE' },
    { id: 't4', date: '2020-01-10', title: 'Início Faturamento SUS', description: 'MS Saúde (Doadora de Campanha) começa a receber repasses volumosos do FNS.', type: 'financial', source: 'DATASUS' },
    { id: 't5', date: '2022-08-15', title: 'Doação de Campanha', description: 'MS Saúde doou R$ 150.000 para a campanha de reeleição.', type: 'transaction', source: 'TSE Doações' },
    { id: 't6', date: '2023-03-10', title: 'Emenda Parlamentar Destinada', description: 'R$ 47M destinados à Prefeitura de Santo André via "Transferência Especial".', type: 'financial', source: 'Portal da Transparência' },
    { id: 't7', date: '2023-06-25', title: 'Contrato Adjudicado (Família)', description: 'ABC Construções ganha licitação de R$ 32M bancada com a emenda recebida meses antes.', type: 'legal', source: 'Compras.gov' },
];
