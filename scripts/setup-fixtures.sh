#!/usr/bin/env bash
# setup-fixtures.sh — Populate /opt/bracc/data with br-acc test fixtures
# Use for smoke-testing pipelines before real data is available.
# Run on VPS: bash /opt/bracc/egos-inteligencia/scripts/setup-fixtures.sh
set -euo pipefail

FX="/opt/bracc/etl/tests/fixtures"
DATA="/opt/bracc/data"

log() { echo "[$(date -u +%H:%M:%SZ)] $*"; }
ok()  { echo "  ✅ $*"; }
skip(){ echo "  ⏭  $*"; }

if [ ! -d "$FX" ]; then
  echo "ERROR: br-acc fixtures not found at $FX"
  echo "Expected: /opt/bracc/etl/tests/fixtures/"
  exit 1
fi

# ── Group 0: Sanctions & compliance ──────────────────────────────────────────
log "Group 0: Sanctions & compliance"

mkdir -p "$DATA/leniency"
[ -f "$DATA/leniency/leniencia.csv" ] || cp "$FX/leniency/leniencia.csv" "$DATA/leniency/" && ok "leniency/leniencia.csv"

mkdir -p "$DATA/ofac"
[ -f "$DATA/ofac/sdn.csv" ] || cp "$FX/ofac/sdn.csv" "$DATA/ofac/" && ok "ofac/sdn.csv"
# add.csv not in fixtures — create minimal
[ -f "$DATA/ofac/add.csv" ] || printf "ent_num,add_num,city,country\n1,1,Dubai,AE\n" > "$DATA/ofac/add.csv" && ok "ofac/add.csv (minimal)"

mkdir -p "$DATA/eu_sanctions"
[ -f "$DATA/eu_sanctions/eu_sanctions.csv" ] || cp "$FX/eu_sanctions/eu_sanctions.csv" "$DATA/eu_sanctions/" && ok "eu_sanctions/eu_sanctions.csv"
# Production alias: eu_full_sanctions.csv → eu_sanctions.csv
[ -f "$DATA/eu_sanctions/eu_full_sanctions.csv" ] && \
  [ ! -f "$DATA/eu_sanctions/eu_sanctions.csv" ] && \
  cp "$DATA/eu_sanctions/eu_full_sanctions.csv" "$DATA/eu_sanctions/eu_sanctions.csv" && \
  ok "eu_sanctions: aliased eu_full_sanctions.csv → eu_sanctions.csv"

mkdir -p "$DATA/un_sanctions"
[ -f "$DATA/un_sanctions/un_sanctions.json" ] || cp "$FX/un_sanctions/un_sanctions.json" "$DATA/un_sanctions/" && ok "un_sanctions/un_sanctions.json"

mkdir -p "$DATA/opensanctions"
[ -f "$DATA/opensanctions/entities.ftm.json" ] || cp "$FX/opensanctions/entities.ftm.json" "$DATA/opensanctions/" && ok "opensanctions/entities.ftm.json"

mkdir -p "$DATA/world_bank"
[ -f "$DATA/world_bank/debarred.csv" ] || cp "$FX/world_bank/debarred.csv" "$DATA/world_bank/" && ok "world_bank/debarred.csv"

mkdir -p "$DATA/sanctions"
[ -f "$DATA/sanctions/ceis.csv" ] || cp "$FX/ceis_sample.csv" "$DATA/sanctions/ceis.csv" && ok "sanctions/ceis.csv"
[ -f "$DATA/sanctions/cnep.csv" ] || cp "$FX/cnep_sample.csv" "$DATA/sanctions/cnep.csv" && ok "sanctions/cnep.csv"

mkdir -p "$DATA/ceaf"
[ -f "$DATA/ceaf/ceaf.csv" ] || cp "$FX/ceaf/ceaf.csv" "$DATA/ceaf/" && ok "ceaf/ceaf.csv"

mkdir -p "$DATA/pep_cgu"
[ -f "$DATA/pep_cgu/pep.csv" ] || cp "$FX/pep_cgu/pep.csv" "$DATA/pep_cgu/" && ok "pep_cgu/pep.csv"

mkdir -p "$DATA/cepim"
[ -f "$DATA/cepim/cepim.csv" ] || cp "$FX/cepim/cepim.csv" "$DATA/cepim/" && ok "cepim/cepim.csv"

# ── Group 1: Electoral & offshore ─────────────────────────────────────────────
log "Group 1: Electoral & offshore"

mkdir -p "$DATA/tse"
[ -f "$DATA/tse/candidatos.csv" ] || cp "$FX/tse_candidatos.csv" "$DATA/tse/candidatos.csv" && ok "tse/candidatos.csv"
[ -f "$DATA/tse/doacoes.csv"    ] || cp "$FX/tse_doacoes.csv"    "$DATA/tse/doacoes.csv"    && ok "tse/doacoes.csv"

mkdir -p "$DATA/tse_bens"
[ -f "$DATA/tse_bens/bens.csv" ] || cp "$FX/tse_bens/bens.csv" "$DATA/tse_bens/" && ok "tse_bens/bens.csv"

mkdir -p "$DATA/icij"
for f in nodes-entities nodes-intermediaries nodes-officers relationships; do
  [ -f "$DATA/icij/${f}.csv" ] || cp "$FX/icij/${f}.csv" "$DATA/icij/" && ok "icij/${f}.csv"
done

# ── Group 2: Legislative ───────────────────────────────────────────────────────
log "Group 2: Legislative"

mkdir -p "$DATA/senado_cpis"
[ -f "$DATA/senado_cpis/cpis.csv" ] || cp "$FX/senado_cpis/cpis.csv" "$DATA/senado_cpis/" && ok "senado_cpis/cpis.csv"

mkdir -p "$DATA/camara_inquiries"
for f in inquiries requirements sessions; do
  [ -f "$DATA/camara_inquiries/${f}.csv" ] || cp "$FX/camara_inquiries/${f}.csv" "$DATA/camara_inquiries/" && ok "camara_inquiries/${f}.csv"
done

# ── Group 3: Government finance ────────────────────────────────────────────────
log "Group 3: Government finance"

mkdir -p "$DATA/pgfn"
[ -f "$DATA/pgfn/arquivo_lai_SIDA_01_01.csv" ] || cp "$FX/pgfn/arquivo_lai_SIDA_01_01.csv" "$DATA/pgfn/" && ok "pgfn/arquivo_lai_SIDA_01_01.csv"

mkdir -p "$DATA/tcu"
for f in "$FX"/tcu/*.csv; do
  dest="$DATA/tcu/$(basename "$f")"
  [ -f "$dest" ] || cp "$f" "$dest" && ok "tcu/$(basename "$f")"
done

mkdir -p "$DATA/comprasnet"
[ -f "$DATA/comprasnet/pncp_contratos.json" ] || cp "$FX/comprasnet_contratos.json" "$DATA/comprasnet/pncp_contratos.json" && ok "comprasnet/pncp_contratos.json"

mkdir -p "$DATA/transferegov"
for f in "$FX"/transferegov/*.csv; do
  dest="$DATA/transferegov/$(basename "$f")"
  [ -f "$dest" ] || cp "$f" "$dest" && ok "transferegov/$(basename "$f")"
done

mkdir -p "$DATA/bndes"
[ -f "$DATA/bndes/operacoes-nao-automaticas.csv" ] || cp "$FX/bndes/operacoes-nao-automaticas.csv" "$DATA/bndes/" && ok "bndes/operacoes-nao-automaticas.csv"

mkdir -p "$DATA/transparencia"
[ -f "$DATA/transparencia/contratos.csv"  ] || cp "$FX/transparencia_contratos.csv"  "$DATA/transparencia/contratos.csv"  && ok "transparencia/contratos.csv"
[ -f "$DATA/transparencia/servidores.csv" ] || cp "$FX/transparencia_servidores.csv" "$DATA/transparencia/servidores.csv" && ok "transparencia/servidores.csv"
[ -f "$DATA/transparencia/emendas.csv"    ] || cp "$FX/transparencia_emendas.csv"    "$DATA/transparencia/emendas.csv"    && ok "transparencia/emendas.csv"

mkdir -p "$DATA/siop"
[ -f "$DATA/siop/emendas.csv" ] || cp "$FX/siop/emendas.csv" "$DATA/siop/" && ok "siop/emendas.csv"

mkdir -p "$DATA/renuncias"
[ -f "$DATA/renuncias/renuncias.csv" ] || cp "$FX/renuncias/renuncias.csv" "$DATA/renuncias/" && ok "renuncias/renuncias.csv"

# camara: needs *.csv with CEAP columns (txNomeParlamentar, cpf, nuDeputadoId, etc.)
mkdir -p "$DATA/camara"
[ -f "$DATA/camara/despesas.csv" ] || cp "$FX/camara_ceap.csv" "$DATA/camara/despesas.csv" && ok "camara/despesas.csv"

# senado: needs *.csv with CEAPS columns (SENADOR, TIPO_DESPESA, CNPJ_CPF, etc.)
mkdir -p "$DATA/senado"
[ -f "$DATA/senado/ceaps.csv" ] || cp "$FX/senado_ceaps.csv" "$DATA/senado/ceaps.csv" && ok "senado/ceaps.csv"

mkdir -p "$DATA/cvm"
[ -f "$DATA/cvm/processo_sancionador.csv" ] || cp "$FX/cvm_pas_processo.csv" "$DATA/cvm/processo_sancionador.csv" && ok "cvm/processo_sancionador.csv"
[ -f "$DATA/cvm/processo_sancionador_acusado.csv" ] || cp "$FX/cvm_pas_resultado.csv" "$DATA/cvm/processo_sancionador_acusado.csv" && ok "cvm/processo_sancionador_acusado.csv"

mkdir -p "$DATA/cvm_funds"
[ -f "$DATA/cvm_funds/cad_fi.csv" ] || cp "$FX/cvm_funds/cad_fi.csv" "$DATA/cvm_funds/" && ok "cvm_funds/cad_fi.csv"

mkdir -p "$DATA/siconfi"
[ -f "$DATA/siconfi/dca_2023.json" ] || cp "$FX/siconfi/dca_2023.json" "$DATA/siconfi/" && ok "siconfi/dca_2023.json"

# ── Summary ────────────────────────────────────────────────────────────────────
log ""
log "=== Setup complete ==="
echo "Files in data/:"
find "$DATA" -type f | grep -v download.log | sort | sed 's|/opt/bracc/data/||'
log ""
log "Run smoke test:"
log "  cd /opt/bracc/egos-inteligencia/api && source .venv/bin/activate"
log "  python -m egos_inteligencia.etl.runner run-group 0 --dry --data-dir $DATA --workers 4"
