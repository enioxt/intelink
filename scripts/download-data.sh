#!/usr/bin/env bash
# download-data.sh — Download production data for all ETL pipelines
# Requires: curl, unzip, python3
# Est. disk: ~30GB (PGFN ~5GB, OpenSanctions ~2.5GB, TSE ~10GB)
#
# Usage:
#   bash scripts/download-data.sh [DATA_DIR]
#   DATA_DIR defaults to ./data
set -uo pipefail  # no -e: individual downloads may fail, script continues

DATA_DIR="${1:-./data}"
mkdir -p "$DATA_DIR"
ERRORS=()

log()  { echo "[$(date -u +%H:%M:%SZ)] $*"; }
ok()   { echo "  ✅ $*"; }
fail() { echo "  ❌ $*"; ERRORS+=("$*"); }
skip() { echo "  ⏭  $*"; }

# Download a file with retry; skip if already exists
dl() {
  local url="$1" dest="$2"
  if [ -f "$dest" ]; then skip "$(basename "$dest") already exists"; return 0; fi
  log "Downloading $(basename "$dest")..."
  if curl -fsSL --retry 3 --retry-delay 5 \
      -H 'User-Agent: Mozilla/5.0 (compatible; EGOS-ETL/1.0)' \
      -o "$dest" "$url"; then
    ok "$(basename "$dest") ($(du -sh "$dest" | cut -f1))"
  else
    fail "$(basename "$dest") — url: $url"
    rm -f "$dest"
  fi
}

# Download ZIP and extract a specific inner file with a target name
dl_zip_extract() {
  local url="$1" zip_dest="$2" inner_pattern="$3" final_dest="$4"
  if [ -f "$final_dest" ]; then skip "$(basename "$final_dest") already exists"; return 0; fi
  log "Downloading $(basename "$zip_dest")..."
  local tmp_zip
  tmp_zip=$(mktemp --suffix=.zip)
  if ! curl -fsSL --retry 3 --retry-delay 5 \
      -H 'User-Agent: Mozilla/5.0 (compatible; EGOS-ETL/1.0)' \
      -o "$tmp_zip" "$url"; then
    fail "$(basename "$zip_dest") — url: $url"
    rm -f "$tmp_zip"
    return 1
  fi
  local extract_dir
  extract_dir=$(mktemp -d)
  if unzip -q "$tmp_zip" -d "$extract_dir" 2>/dev/null; then
    local found
    found=$(find "$extract_dir" -name "$inner_pattern" | head -1)
    if [ -n "$found" ]; then
      cp "$found" "$final_dest"
      ok "$(basename "$final_dest") extracted ($(du -sh "$final_dest" | cut -f1))"
    else
      # No pattern match — copy largest CSV in the zip
      found=$(find "$extract_dir" -name "*.csv" | xargs ls -S 2>/dev/null | head -1)
      if [ -n "$found" ]; then
        cp "$found" "$final_dest"
        ok "$(basename "$final_dest") extracted largest CSV ($(du -sh "$final_dest" | cut -f1))"
      else
        fail "$(basename "$zip_dest") — no CSV found inside ZIP"
      fi
    fi
  else
    fail "$(basename "$zip_dest") — unzip failed"
  fi
  rm -rf "$tmp_zip" "$extract_dir"
}

# Current + previous month helper
ym_now()  { date +%Y%m; }
ym_prev() { date -d '-1 month' +%Y%m; }

# Try current month, fall back to previous
dl_cgu() {
  local dataset="$1" final_dest="$2" inner_pattern="${3:-*.csv}"
  local url_now="https://portaldatransparencia.gov.br/download-de-dados/${dataset}/$(ym_now)"
  local url_prev="https://portaldatransparencia.gov.br/download-de-dados/${dataset}/$(ym_prev)"
  local tmp_zip
  tmp_zip=$(mktemp --suffix=.zip)
  for url in "$url_now" "$url_prev"; do
    if curl -fsSL --retry 2 --retry-delay 3 \
        -H 'User-Agent: Mozilla/5.0 (compatible; EGOS-ETL/1.0)' \
        -H 'Referer: https://portaldatransparencia.gov.br/' \
        -o "$tmp_zip" "$url" 2>/dev/null && [ -s "$tmp_zip" ]; then
      local extract_dir
      extract_dir=$(mktemp -d)
      if unzip -q "$tmp_zip" -d "$extract_dir" 2>/dev/null; then
        local found
        found=$(find "$extract_dir" -name "$inner_pattern" | head -1)
        [ -z "$found" ] && found=$(find "$extract_dir" -name "*.csv" | xargs ls -S 2>/dev/null | head -1)
        if [ -n "$found" ]; then
          cp "$found" "$final_dest"
          ok "$(basename "$final_dest") from CGU ($(du -sh "$final_dest" | cut -f1))"
          rm -rf "$tmp_zip" "$extract_dir"
          return 0
        fi
      fi
      rm -rf "$extract_dir"
      break
    fi
  done
  rm -f "$tmp_zip"
  fail "CGU $dataset — 403/404 (may need VPN or manual download)"
}

# ── Group 0: Sanctions & compliance ──────────────────────────────────────────

log "=== Group 0: Sanctions & Compliance ==="

mkdir -p "$DATA_DIR/ofac"
dl "https://www.treasury.gov/ofac/downloads/sdn.csv" "$DATA_DIR/ofac/sdn.csv"
dl "https://www.treasury.gov/ofac/downloads/add.csv" "$DATA_DIR/ofac/add.csv"

mkdir -p "$DATA_DIR/eu_sanctions"
if [ ! -f "$DATA_DIR/eu_sanctions/eu_sanctions.csv" ]; then
  # Try FSF token-free URL first, then fallback
  if ! dl "https://webgate.ec.europa.eu/fsd/fsf/public/files/csvFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw" \
          "$DATA_DIR/eu_sanctions/eu_sanctions.csv"; then
    dl "https://data.opensanctions.org/datasets/latest/eu_fsf/targets.csv" \
       "$DATA_DIR/eu_sanctions/eu_sanctions.csv"
  fi
fi

mkdir -p "$DATA_DIR/un_sanctions"
if [ ! -f "$DATA_DIR/un_sanctions/consolidated.xml" ]; then
  dl "https://scsanctions.un.org/resources/xml/en/consolidated.xml" \
     "$DATA_DIR/un_sanctions/consolidated.xml"
fi

mkdir -p "$DATA_DIR/opensanctions"
dl "https://data.opensanctions.org/datasets/latest/default/entities.ftm.json" \
   "$DATA_DIR/opensanctions/entities.ftm.json"

# World Bank — correct URL (debarred firms page as CSV export)
mkdir -p "$DATA_DIR/world_bank"
dl "https://apigwext.worldbank.org/dvsvc/v1.0/json/APPLICATION/ADOBE_PDF/CONTENT/1045+1046+1047+1048+1049+1050+1051+1052+1053/1/debarred.csv" \
   "$DATA_DIR/world_bank/debarred.csv" || \
dl "https://www.worldbank.org/content/dam/documents/sanctions/Debarred_consolidated.xlsx" \
   "$DATA_DIR/world_bank/debarred.xlsx"

# CGU datasets (may return 403 from VPS — use setup-fixtures.sh for smoke test)
mkdir -p "$DATA_DIR/leniency"
[ -f "$DATA_DIR/leniency/leniencia.csv" ] || \
  dl_cgu "acordos-leniencia" "$DATA_DIR/leniency/leniencia.csv" "*.csv"

mkdir -p "$DATA_DIR/sanctions"
[ -f "$DATA_DIR/sanctions/ceis.csv" ] || \
  dl_cgu "ceis" "$DATA_DIR/sanctions/ceis.csv" "*.csv"
[ -f "$DATA_DIR/sanctions/cnep.csv" ] || \
  dl_cgu "cnep" "$DATA_DIR/sanctions/cnep.csv" "*.csv"

mkdir -p "$DATA_DIR/ceaf"
[ -f "$DATA_DIR/ceaf/ceaf.csv" ] || \
  dl_cgu "ceaf" "$DATA_DIR/ceaf/ceaf.csv" "*.csv"

mkdir -p "$DATA_DIR/pep_cgu"
[ -f "$DATA_DIR/pep_cgu/pep.csv" ] || \
  dl_cgu "pep" "$DATA_DIR/pep_cgu/pep.csv" "*.csv"

mkdir -p "$DATA_DIR/cepim"
[ -f "$DATA_DIR/cepim/cepim.csv" ] || \
  dl_cgu "cepim" "$DATA_DIR/cepim/cepim.csv" "*.csv"

# ── Group 1: Electoral & offshore ─────────────────────────────────────────────

log "=== Group 1: Electoral & Offshore ==="

mkdir -p "$DATA_DIR/tse"
for year in 2022 2024; do
  if [ ! -f "$DATA_DIR/tse/candidatos_${year}.csv" ]; then
    dl_zip_extract \
      "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_${year}.zip" \
      "$DATA_DIR/tse/candidatos_${year}.zip" \
      "consulta_cand_${year}_BRASIL.csv" \
      "$DATA_DIR/tse/candidatos_${year}.csv"
  fi
done
# Create combined candidatos.csv for pipeline (expects single file)
if [ ! -f "$DATA_DIR/tse/candidatos.csv" ] && ls "$DATA_DIR/tse"/candidatos_*.csv 2>/dev/null | head -1 | grep -q .; then
  head -1 "$DATA_DIR/tse"/candidatos_*.csv | grep -v "^==>" | head -1 > "$DATA_DIR/tse/candidatos.csv"
  tail -n +2 -q "$DATA_DIR/tse"/candidatos_*.csv >> "$DATA_DIR/tse/candidatos.csv"
  ok "tse/candidatos.csv (combined)"
fi

mkdir -p "$DATA_DIR/tse_bens"
for year in 2022 2024; do
  if [ ! -f "$DATA_DIR/tse_bens/bens_${year}.csv" ]; then
    dl_zip_extract \
      "https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_${year}.zip" \
      "$DATA_DIR/tse_bens/bens_${year}.zip" \
      "bem_candidato_${year}_BRASIL.csv" \
      "$DATA_DIR/tse_bens/bens_${year}.csv"
  fi
done
if [ ! -f "$DATA_DIR/tse_bens/bens.csv" ] && ls "$DATA_DIR/tse_bens"/bens_*.csv 2>/dev/null | head -1 | grep -q .; then
  head -1 "$DATA_DIR/tse_bens"/bens_*.csv | grep -v "^==>" | head -1 > "$DATA_DIR/tse_bens/bens.csv"
  tail -n +2 -q "$DATA_DIR/tse_bens"/bens_*.csv >> "$DATA_DIR/tse_bens/bens.csv"
  ok "tse_bens/bens.csv (combined)"
fi

mkdir -p "$DATA_DIR/icij"
for f in nodes-addresses nodes-entities nodes-intermediaries nodes-officers relationships; do
  if [ ! -f "$DATA_DIR/icij/${f}.csv" ]; then
    if curl -fsSL --retry 3 --retry-delay 5 \
        -o "$DATA_DIR/icij/${f}.csv.gz" \
        "https://offshoreleaks-data.icij.org/offshoreleaks/csv/${f}.csv.gz" 2>/dev/null; then
      gunzip -f "$DATA_DIR/icij/${f}.csv.gz" && ok "icij/${f}.csv"
    else
      fail "icij/${f}.csv — download failed"
    fi
  fi
done

# ── Group 2: Legislative ───────────────────────────────────────────────────────

log "=== Group 2: Legislative (API-scraped at runtime) ==="
skip "senado_cpis — live Senado API"
skip "camara_inquiries — live Câmara API"

# ── Group 3: Government finance ────────────────────────────────────────────────

log "=== Group 3: Government Finance ==="

# PGFN — large (~5GB)
mkdir -p "$DATA_DIR/pgfn"
if [ ! -f "$DATA_DIR/pgfn/arquivo_lai_SIDA_01_01.csv" ]; then
  log "PGFN devedores (~5GB) — this will take a while..."
  dl "https://www.gov.br/pgfn/pt-br/acesso-a-informacao/dados-abertos/representacao-fiscal/devedores/Devedores_PGFN.zip" \
     "/tmp/pgfn_devedores.zip" && \
  unzip -q /tmp/pgfn_devedores.zip -d "$DATA_DIR/pgfn/" && \
  rm -f /tmp/pgfn_devedores.zip && ok "pgfn/ extracted"
fi

# TCU — inabilitados
mkdir -p "$DATA_DIR/tcu"
dl "https://certidoes-apf.apps.tcu.gov.br/certidoes/download/inabilitados" \
   "$DATA_DIR/tcu/inabilitados-funcao-publica.csv" || \
dl "https://portal.tcu.gov.br/data/files/E0/68/B0/9C/0E1B37108B4D7011F18818A8/inabilitados.csv" \
   "$DATA_DIR/tcu/inabilitados-funcao-publica.csv"

# TransfereGov — Emendas Parlamentares
mkdir -p "$DATA_DIR/transferegov"
for ds in "convenios" "emendas-parlamentares"; do
  if [ ! -f "$DATA_DIR/transferegov/${ds}.csv" ]; then
    dl_cgu "convenios" "$DATA_DIR/transferegov/EmendasParlamentares.csv" "*.csv"
    break
  fi
done

# CVM — Processo Sancionador
mkdir -p "$DATA_DIR/cvm"
if [ ! -f "$DATA_DIR/cvm/processo_sancionador.csv" ]; then
  dl_zip_extract \
    "https://dados.cvm.gov.br/dados/PAS/PROCESSO_SANCIONADOR/DADOS/processo_sancionador.zip" \
    "/tmp/cvm_pas.zip" \
    "processo_sancionador.csv" \
    "$DATA_DIR/cvm/processo_sancionador.csv"
fi

# CVM Funds
mkdir -p "$DATA_DIR/cvm_funds"
dl "https://dados.cvm.gov.br/dados/FI/CAD/DADOS/cad_fi.csv" "$DATA_DIR/cvm_funds/cad_fi.csv"

# Renúncias
mkdir -p "$DATA_DIR/renuncias"
[ -f "$DATA_DIR/renuncias/renuncias.csv" ] || \
  dl_cgu "renuncia-tributaria" "$DATA_DIR/renuncias/renuncias.csv" "*.csv"

# SIOP — manual download required (form-based)
skip "siop — requires manual download from siop.planejamento.gov.br/siopdatadownload"

# Camara, Senado, BNDES, ComprasNet, SICONFI, Transparencia — API-scraped at runtime
skip "camara — dadosabertos.camara.leg.br API"
skip "senado — dadosabertos.senado.leg.br API"
skip "bndes — portaldatransparencia.bndes.gov.br API"
skip "comprasnet — pncp.gov.br API"
skip "siconfi — apidatalake.tesouro.gov.br API"
skip "transparencia — portaldatransparencia.gov.br API (use CGU above for CSV fallback)"

# ── Summary ───────────────────────────────────────────────────────────────────

log ""
log "=== Download complete ==="
log "Data dir: $DATA_DIR"
du -sh "$DATA_DIR"/*/  2>/dev/null | sort -rh || true
log ""

if [ ${#ERRORS[@]} -gt 0 ]; then
  log "⚠️  ${#ERRORS[@]} download(s) failed:"
  for e in "${ERRORS[@]}"; do
    echo "    - $e"
  done
  log "Tip: CGU datasets (leniency, CEIS, CNEP, CEAF, PEP, CEPIM) often block VPS IPs."
  log "     Run scripts/setup-fixtures.sh for smoke testing with sample data."
  log "     For production, download manually from a desktop and rsync to VPS."
fi

log ""
log "Next: bash scripts/setup-fixtures.sh  (if any missing)"
log "Then: python -m egos_inteligencia.etl.runner run-group 0 --dry --data-dir $DATA_DIR"
