#!/usr/bin/env bash
# download-data.sh — Download all ETL pipeline data sources
# Run on the VPS (or locally) before running pipelines
#
# Usage:
#   bash scripts/download-data.sh [DATA_DIR]
#   DATA_DIR defaults to ./data
#
# Requires: curl, wget, unzip, python3
# Est. disk: ~25GB total (TSE largest at ~15GB)
set -euo pipefail

DATA_DIR="${1:-./data}"
mkdir -p "$DATA_DIR"

log() { echo "[$(date -u +%H:%M:%SZ)] $*"; }
ok()  { echo "  ✅ $*"; }
skip(){ echo "  ⏭  $*"; }

# ── Helpers ──────────────────────────────────────────────────────────────────

dl() {
  local url="$1" dest="$2"
  if [[ -f "$dest" ]]; then
    skip "$(basename "$dest") already exists"
    return 0
  fi
  log "Downloading $(basename "$dest")..."
  curl -fsSL --retry 3 --retry-delay 5 -o "$dest" "$url"
  ok "$(basename "$dest") ($(du -sh "$dest" | cut -f1))"
}

dl_wget() {
  local url="$1" destdir="$2"
  mkdir -p "$destdir"
  log "Downloading to $destdir ..."
  wget -q --show-progress --retry-connrefused -P "$destdir" "$url"
  ok "$destdir"
}

# ── Group 0: Sanctions & compliance ──────────────────────────────────────────

log "=== Group 0: Sanctions & Compliance ==="

# OFAC SDN list (US Treasury)
mkdir -p "$DATA_DIR/ofac"
dl "https://www.treasury.gov/ofac/downloads/sdn.csv" \
   "$DATA_DIR/ofac/sdn.csv"
dl "https://www.treasury.gov/ofac/downloads/add.csv" \
   "$DATA_DIR/ofac/add.csv"

# EU Sanctions (Financial Sanctions Files)
mkdir -p "$DATA_DIR/eu_sanctions"
dl "https://webgate.ec.europa.eu/fsd/fsf/public/files/csvFullSanctionsList/content?token=dG9rZW4tMjAxNw" \
   "$DATA_DIR/eu_sanctions/eu_full_sanctions.csv"

# UN Sanctions (Consolidated list)
mkdir -p "$DATA_DIR/un_sanctions"
dl "https://scsanctions.un.org/resources/xml/en/consolidated.xml" \
   "$DATA_DIR/un_sanctions/consolidated.xml"

# OpenSanctions (open-source aggregator — entities JSON)
mkdir -p "$DATA_DIR/opensanctions"
dl "https://data.opensanctions.org/datasets/latest/default/entities.ftm.json" \
   "$DATA_DIR/opensanctions/entities.ftm.json"

# World Bank debarred firms
mkdir -p "$DATA_DIR/world_bank"
dl "https://www.worldbank.org/content/dam/documents/sanctions/Debarred-firms-and-individuals.xls" \
   "$DATA_DIR/world_bank/debarred.xls"

# CGU — Leniência (Portal da Transparência)
mkdir -p "$DATA_DIR/leniency"
dl "https://portaldatransparencia.gov.br/download-de-dados/acordos-leniencia/$(date +%Y%m)" \
   "$DATA_DIR/leniency/acordos_$(date +%Y%m).zip" || \
dl "https://portaldatransparencia.gov.br/download-de-dados/acordos-leniencia/$(date -d '-1 month' +%Y%m)" \
   "$DATA_DIR/leniency/acordos_$(date -d '-1 month' +%Y%m).zip"

# CGU — Sanções (CEIS, CNEP, CEPIM, CEAF)
mkdir -p "$DATA_DIR/sanctions"
for dataset in "ceis" "cnep"; do
  dl "https://portaldatransparencia.gov.br/download-de-dados/${dataset}/$(date +%Y%m)" \
     "$DATA_DIR/sanctions/${dataset}_$(date +%Y%m).zip" || \
  dl "https://portaldatransparencia.gov.br/download-de-dados/${dataset}/$(date -d '-1 month' +%Y%m)" \
     "$DATA_DIR/sanctions/${dataset}_$(date -d '-1 month' +%Y%m).zip"
done

# CGU — CEAF (Controle de Elegibilidade de Agentes Federais)
mkdir -p "$DATA_DIR/ceaf"
dl "https://portaldatransparencia.gov.br/download-de-dados/ceaf/$(date +%Y%m)" \
   "$DATA_DIR/ceaf/ceaf_$(date +%Y%m).zip" || \
dl "https://portaldatransparencia.gov.br/download-de-dados/ceaf/$(date -d '-1 month' +%Y%m)" \
   "$DATA_DIR/ceaf/ceaf_$(date -d '-1 month' +%Y%m).zip"

# CGU — PEP (Pessoas Expostas Politicamente)
mkdir -p "$DATA_DIR/pep_cgu"
dl "https://portaldatransparencia.gov.br/download-de-dados/pep/$(date +%Y%m)" \
   "$DATA_DIR/pep_cgu/pep_$(date +%Y%m).zip" || \
dl "https://portaldatransparencia.gov.br/download-de-dados/pep/$(date -d '-1 month' +%Y%m)" \
   "$DATA_DIR/pep_cgu/pep_$(date -d '-1 month' +%Y%m).zip"

# CGU — CEPIM (Entidades sem fins lucrativos impedidas)
mkdir -p "$DATA_DIR/cepim"
dl "https://portaldatransparencia.gov.br/download-de-dados/cepim/$(date +%Y%m)" \
   "$DATA_DIR/cepim/cepim_$(date +%Y%m).zip" || \
dl "https://portaldatransparencia.gov.br/download-de-dados/cepim/$(date -d '-1 month' +%Y%m)" \
   "$DATA_DIR/cepim/cepim_$(date -d '-1 month' +%Y%m).zip"

# ── Group 1: Electoral & offshore ─────────────────────────────────────────────

log "=== Group 1: Electoral & Offshore ==="

# TSE — Candidatos + Bens declarados (múltiplos anos)
mkdir -p "$DATA_DIR/tse"
for year in 2022 2024; do
  dl "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_${year}.zip" \
     "$DATA_DIR/tse/candidatos_${year}.zip"
done

mkdir -p "$DATA_DIR/tse_bens"
for year in 2022 2024; do
  dl "https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_${year}.zip" \
     "$DATA_DIR/tse_bens/bens_${year}.zip"
done

# ICIJ — Offshore Leaks Database (public bulk download)
mkdir -p "$DATA_DIR/icij"
log "Downloading ICIJ Offshore Leaks (this may be large)..."
for f in nodes-addresses nodes-entities nodes-intermediaries nodes-officers relationships; do
  dl "https://offshoreleaks-data.icij.org/offshoreleaks/csv/${f}.csv.gz" \
     "$DATA_DIR/icij/${f}.csv.gz"
done

# ── Group 2: Legislative investigations ───────────────────────────────────────

log "=== Group 2: Legislative ==="
log "NOTE: Senado CPIs and Câmara inquéritos are scraped via API — no static download"
log "  senado_cpis uses: https://legis.senado.leg.br/dadosabertos/materia/pesquisa/lista"
log "  camara_inquiries uses: https://dadosabertos.camara.leg.br/api/v2/proposicoes"
skip "senado_cpis — API-scraped at runtime"
skip "camara_inquiries — API-scraped at runtime"

# ── Group 3: Government finance & procurement ─────────────────────────────────

log "=== Group 3: Government Finance & Procurement ==="

# CGU — Transparência (Servidores, Benefícios, Gastos)
mkdir -p "$DATA_DIR/transparencia"
for dataset in "servidores" "beneficios-cidadao"; do
  dl "https://portaldatransparencia.gov.br/download-de-dados/${dataset}/$(date +%Y%m)" \
     "$DATA_DIR/transparencia/${dataset}_$(date +%Y%m).zip" || \
  dl "https://portaldatransparencia.gov.br/download-de-dados/${dataset}/$(date -d '-1 month' +%Y%m)" \
     "$DATA_DIR/transparencia/${dataset}_$(date -d '-1 month' +%Y%m).zip"
done

# PGFN — Devedores da União (maior arquivo ~5GB)
mkdir -p "$DATA_DIR/pgfn"
log "PGFN devedores — large file (~5GB), this will take a while..."
dl "https://www.gov.br/pgfn/pt-br/acesso-a-informacao/dados-abertos/representacao-fiscal/devedores/Devedores_PGFN.zip" \
   "$DATA_DIR/pgfn/Devedores_PGFN.zip"

# TCU — Acordãos e Inabilitados
mkdir -p "$DATA_DIR/tcu"
dl "https://portal.tcu.gov.br/data/files/E0/68/B0/9C/0E1B37108B4D7011F18818A8/inabilitados.csv" \
   "$DATA_DIR/tcu/inabilitados.csv"

# ComprasNet — Licitações (PNCP API — runtime, not static)
skip "comprasnet — PNCP API scraped at runtime"

# TransfereGov — Convênios e Transferências
mkdir -p "$DATA_DIR/transferegov"
dl "https://portaldatransparencia.gov.br/download-de-dados/convenios/$(date +%Y%m)" \
   "$DATA_DIR/transferegov/convenios_$(date +%Y%m).zip" || \
dl "https://portaldatransparencia.gov.br/download-de-dados/convenios/$(date -d '-1 month' +%Y%m)" \
   "$DATA_DIR/transferegov/convenios_$(date -d '-1 month' +%Y%m).zip"

# BNDES — Operações (API-based, skip static)
skip "bndes — REST API scraped at runtime"

# SIOP — Orçamento Federal
mkdir -p "$DATA_DIR/siop"
dl "https://www1.siop.planejamento.gov.br/mto/dspDownload.jsf" \
   "$DATA_DIR/siop/siop_latest.zip" || skip "siop requires form submission — check siop.planejamento.gov.br/siopdatadownload"

# Renúncias Tributárias — CGU
mkdir -p "$DATA_DIR/renuncias"
dl "https://portaldatransparencia.gov.br/download-de-dados/renuncia-tributaria/$(date +%Y%m)" \
   "$DATA_DIR/renuncias/renuncias_$(date +%Y%m).zip" || \
dl "https://portaldatransparencia.gov.br/download-de-dados/renuncia-tributaria/$(date -d '-1 month' +%Y%m)" \
   "$DATA_DIR/renuncias/renuncias_$(date -d '-1 month' +%Y%m).zip"

# Câmara dos Deputados — Despesas (API-based)
skip "camara — REST API scraped at runtime"

# Senado Federal — Despesas (API-based)
skip "senado — REST API scraped at runtime"

# CVM — Fundos de Investimento
mkdir -p "$DATA_DIR/cvm"
mkdir -p "$DATA_DIR/cvm_funds"
dl "https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv" \
   "$DATA_DIR/cvm/cad_cia_aberta.csv"
dl "https://dados.cvm.gov.br/dados/FI/CAD/DADOS/cad_fi.csv" \
   "$DATA_DIR/cvm_funds/cad_fi.csv"

# SICONFI — Contas dos municípios
skip "siconfi — IBGE/STN API scraped at runtime"

# ── Summary ──────────────────────────────────────────────────────────────────

log ""
log "=== Download complete ==="
du -sh "$DATA_DIR"/*/  2>/dev/null | sort -rh || true
log ""
log "Next step — smoke test (dry run):"
log "  python -m egos_inteligencia.etl.runner run leniency --dry --data-dir $DATA_DIR"
log "  python -m egos_inteligencia.etl.runner run ofac --dry --data-dir $DATA_DIR"
