// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REDS Person Identity Linking — MG Pattern
// Liga :Person nodes do REDS com nodes existentes (77M base) via SAME_AS.
//
// Padrão MG/SISPOL: RG é mais usado que CPF. Dedup em 4 fases:
//   1. CPF válido             → confidence 0.95 (certeza)
//   2. RG + estado MG         → confidence 0.90 (forte — SSP-MG)
//   3. Nome + Mãe + Nascimento → confidence 0.88 (alta — triplete)
//   4. Nome + Nascimento       → POSSIBLE_SAME_AS 0.70 (média — review manual)
//
// Run após cada ingest REDS:
//   python -m egos_inteligencia.etl.runner run dhpp_reds --exec
//   then apply this via: python scripts/apply_cypher.py infra/neo4j/link_persons_reds.cypher
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Phase 0: Pre-compute cpf_middle6 para nodes REDS recém-criados ──────────
CALL {
  MATCH (p:Person)
  WHERE p.cpf IS NOT NULL AND p.cpf_middle6 IS NULL AND p.source STARTS WITH "reds"
  WITH p, replace(replace(p.cpf, '.', ''), '-', '') AS digits
  WHERE size(digits) = 11
  SET p.cpf_middle6 = substring(digits, 3, 6)
} IN TRANSACTIONS OF 10000 ROWS;

// ── Phase 1: CPF match com base existente (confidence 0.95) ─────────────────
// REDS node com CPF → qualquer outro Person com mesmo CPF
CALL {
  MATCH (r:Person)
  WHERE r.source STARTS WITH "reds" AND r.cpf IS NOT NULL
  WITH r
  MATCH (b:Person {cpf: r.cpf})
  WHERE b <> r
    AND NOT EXISTS { (r)-[:SAME_AS]-(b) }
  MERGE (r)-[:SAME_AS {
    confidence: 0.95,
    method: "reds_cpf_match",
    evidence: "cpf_exact"
  }]->(b)
} IN TRANSACTIONS OF 5000 ROWS;

// ── Phase 2: RG + estado MG (confidence 0.90) ───────────────────────────────
// RG emitido pela SSP-MG é único dentro do estado — forte identificador.
// rg_mg = "{digits_only}_MG", ex "2796812_MG"
// Só linka quando o outro node também tem rg_mg (mesmo estado).
CALL {
  MATCH (r:Person)
  WHERE r.source STARTS WITH "reds"
    AND r.rg_mg IS NOT NULL
  WITH r
  MATCH (b:Person {rg_mg: r.rg_mg})
  WHERE b <> r
    AND NOT EXISTS { (r)-[:SAME_AS]-(b) }
  MERGE (r)-[:SAME_AS {
    confidence: 0.90,
    method: "reds_rg_mg",
    evidence: "rg_ssp_mg_exact"
  }]->(b)
} IN TRANSACTIONS OF 5000 ROWS;

// ── Phase 3: Triplete nome + mãe + nascimento (confidence 0.88) ─────────────
// O padrão brasileiro de identificação civil usa esses 3 campos.
// Todos normalizados (sem acento, uppercase, sem espaço duplo).
// Proteção: só linka se EXATAMENTE 1 candidato na base (evita confusão com
// nomes comuns como "JOSE SILVA" que teriam muitos matches).
CALL {
  MATCH (r:Person)
  WHERE r.source STARTS WITH "reds"
    AND r.name IS NOT NULL
    AND r.nome_mae_normalized IS NOT NULL
    AND r.data_nascimento IS NOT NULL
    AND NOT EXISTS { (r)-[:SAME_AS]-() }
  WITH r
  MATCH (b:Person {
    name: r.name,
    nome_mae_normalized: r.nome_mae_normalized,
    data_nascimento: r.data_nascimento
  })
  WHERE b <> r
  WITH r, collect(b) AS candidates
  WHERE size(candidates) = 1
  WITH r, candidates[0] AS b
  WHERE NOT EXISTS { (r)-[:SAME_AS]-(b) }
  MERGE (r)-[:SAME_AS {
    confidence: 0.88,
    method: "reds_nome_mae_nasc",
    evidence: "nome_normalizado+mae+nascimento_triplete"
  }]->(b)
} IN TRANSACTIONS OF 2000 ROWS;

// ── Phase 4: Nome + nascimento → POSSIBLE_SAME_AS (confidence 0.70) ─────────
// Sem nome da mãe: risco de falso positivo para nomes comuns.
// Usa POSSIBLE_SAME_AS (não SAME_AS) — requer review manual no Intelink.
// Proteção dupla de unicidade: só 1 REDS com esse par, só 1 base com esse par.
CALL {
  MATCH (r:Person)
  WHERE r.source STARTS WITH "reds"
    AND r.name IS NOT NULL
    AND r.data_nascimento IS NOT NULL
    AND r.nome_mae_normalized IS NULL
    AND NOT EXISTS { (r)-[:SAME_AS]-(r) }
    AND NOT EXISTS { (r)-[:POSSIBLE_SAME_AS]-() }

  // Unicidade no lado REDS
  WITH r.name AS name, r.data_nascimento AS nasc, collect(r) AS reds_nodes
  WHERE size(reds_nodes) = 1
  WITH name, nasc, reds_nodes[0] AS r

  // Candidatos na base
  MATCH (b:Person {name: name, data_nascimento: nasc})
  WHERE b <> r
  WITH r, collect(b) AS candidates
  WHERE size(candidates) = 1
  WITH r, candidates[0] AS b
  WHERE NOT EXISTS { (r)-[:POSSIBLE_SAME_AS]-(b) }

  MERGE (r)-[:POSSIBLE_SAME_AS {
    confidence: 0.70,
    method: "reds_nome_nasc_sem_mae",
    evidence: "nome_normalizado+nascimento_sem_mae",
    review_required: true
  }]->(b)
} IN TRANSACTIONS OF 1000 ROWS;

// ── Phase 5: Cross-REDS dedup (mesma pessoa em homicídio E porte_arma) ───────
// A pessoa mais interessante investigativamente aparece em AMBAS as bases.
// Detecta quando um REDS-homicídio e um REDS-arma têm CPF ou rg_mg iguais.
CALL {
  MATCH (rh:Person)
  WHERE rh.source = "reds_homicidio"
    AND rh.cpf IS NOT NULL
  MATCH (ra:Person {cpf: rh.cpf})
  WHERE ra.source = "reds_arma_fogo"
    AND ra <> rh
    AND NOT EXISTS { (rh)-[:SAME_AS]-(ra) }
  MERGE (rh)-[:SAME_AS {
    confidence: 0.95,
    method: "cross_reds_cpf",
    evidence: "aparece_em_homicidio_E_porte_arma",
    flag: "REINCIDENTE_MULTIPLOS_CRIMES"
  }]->(ra)
} IN TRANSACTIONS OF 2000 ROWS;

// RG cross
CALL {
  MATCH (rh:Person)
  WHERE rh.source = "reds_homicidio"
    AND rh.rg_mg IS NOT NULL
  MATCH (ra:Person {rg_mg: rh.rg_mg})
  WHERE ra.source = "reds_arma_fogo"
    AND ra <> rh
    AND NOT EXISTS { (rh)-[:SAME_AS]-(ra) }
  MERGE (rh)-[:SAME_AS {
    confidence: 0.90,
    method: "cross_reds_rg",
    evidence: "aparece_em_homicidio_E_porte_arma",
    flag: "REINCIDENTE_MULTIPLOS_CRIMES"
  }]->(ra)
} IN TRANSACTIONS OF 2000 ROWS;

// ── Phase 6: Reincidência — mesma pessoa em múltiplas :Occurrence ────────────
// Conta ocorrências por pessoa via ENVOLVIDO_EM.
// Adiciona property reincidencia_count ao nó Person para surfacing na UI.
CALL {
  MATCH (p:Person)-[:ENVOLVIDO_EM]->(o:Occurrence)
  WHERE p.source STARTS WITH "reds"
  WITH p, count(DISTINCT o) AS total_ocorrencias,
    collect(DISTINCT o.type) AS tipos_crime
  WHERE total_ocorrencias > 1
  SET p.reincidencia_count = total_ocorrencias,
      p.tipos_crime = tipos_crime,
      p.flag_reincidente = true
} IN TRANSACTIONS OF 5000 ROWS;

// ── Marker ───────────────────────────────────────────────────────────────────
MERGE (m:_SchemaMeta {key: "link_persons_reds"})
SET m.applied_at = datetime(), m.version = "1.0.0";
