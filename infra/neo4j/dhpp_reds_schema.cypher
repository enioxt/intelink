// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DHPP REDS Schema Extension — EGOS Inteligência / Intelink
// Patos de Minas — REDS homicídios + porte/posse arma de fogo (2010-2025)
//
// Nodes:   :Occurrence  (BO policial REDS)
// Rels:    ENVOLVIDO_EM  (Person → Occurrence)
//           OCORREU_EM   (Occurrence → Location — já existe)
//           UTILIZOU     (Person → Weapon — nova instância por Occurrence)
// Indexes: rg_mg, nome_mae_normalized, data_nascimento  (person dedup MG)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Constraint: Occurrence por número REDS ──────────────────────────────────
CREATE CONSTRAINT occurrence_reds_unique IF NOT EXISTS
  FOR (o:Occurrence) REQUIRE o.reds_number IS UNIQUE;

// ── Constraint: envolvido por chave composta (evita duplicatas de re-ingest) ─
// chave_envolvido = "{reds_number}_{seq}" do SISPOL
CREATE CONSTRAINT envolvido_key_unique IF NOT EXISTS
  FOR (e:EnvolvidoEdge) REQUIRE e.chave IS UNIQUE;
// Nota: EnvolvidoEdge é virtual — a chave fica na rel ENVOLVIDO_EM.chave_envolvido
// Neo4j não suporta constraint em rel, guardamos no nó Person como property.

// ── Indexes existentes que REDS vai usar ────────────────────────────────────
// person_cpf_unique — já existe
// person_name       — já existe
// person_cpf_middle6 — já existe

// ── Novos indexes para dedup MG/REDS ────────────────────────────────────────

// RG emitido em MG (SSP-MG) — identificador forte dentro do estado
CREATE INDEX person_rg_mg IF NOT EXISTS
  FOR (p:Person) ON (p.rg_mg);
// Valor: "{digits_only}_MG", ex "2796812_MG"

// Nome da mãe normalizado — 2o sinal mais forte após CPF/RG no padrão REDS
CREATE INDEX person_nome_mae IF NOT EXISTS
  FOR (p:Person) ON (p.nome_mae_normalized);

// Data de nascimento — parte do triplete de dedup
CREATE INDEX person_data_nascimento IF NOT EXISTS
  FOR (p:Person) ON (p.data_nascimento);

// Chave composta nome+nasc para dedup rápido (sem CPF/RG)
CREATE INDEX person_reds_key IF NOT EXISTS
  FOR (p:Person) ON (p.reds_person_key);
// Valor: MD5("{nome_normalized}_{nome_mae_normalized}_{data_nascimento}")[:16]

// ── Index para :Occurrence ───────────────────────────────────────────────────
CREATE INDEX occurrence_type IF NOT EXISTS
  FOR (o:Occurrence) ON (o.type);

CREATE INDEX occurrence_ano IF NOT EXISTS
  FOR (o:Occurrence) ON (o.ano_fato);

CREATE INDEX occurrence_bairro IF NOT EXISTS
  FOR (o:Occurrence) ON (o.bairro);

CREATE INDEX occurrence_municipio IF NOT EXISTS
  FOR (o:Occurrence) ON (o.municipio);

// Composite: ano + tipo (for time-series queries)
CREATE INDEX occurrence_ano_tipo IF NOT EXISTS
  FOR (o:Occurrence) ON (o.ano_fato, o.type);

// ── Full-text index: histórico narrativo ────────────────────────────────────
// Permite busca por placa, nome, calibre dentro do texto do BO
CREATE FULLTEXT INDEX occurrence_historico IF NOT EXISTS
  FOR (o:Occurrence) ON EACH [o.historico, o.modo_acao];

// ── Relationship type ENVOLVIDO_EM ───────────────────────────────────────────
// (:Person)-[:ENVOLVIDO_EM {tipo, prisao, grau_lesao, natureza_delito, chave_envolvido}]->(:Occurrence)
//
// tipo values: AUTOR | CO_AUTOR | SUSPEITO | VITIMA | TESTEMUNHA | OUTROS
// prisao: FLAGRANTE | SEM_PRISAO | APREENDIDO (menor) | MANDADO
// grau_lesao: SEM_LESOES | LEVES | GRAVES | FATAL

// ── Marker: confirms schema was applied ─────────────────────────────────────
MERGE (m:_SchemaMeta {key: "dhpp_reds_schema"})
SET m.applied_at = datetime(), m.version = "1.0.0";
