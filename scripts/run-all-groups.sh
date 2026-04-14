#!/usr/bin/env bash
# run-all-groups.sh — Run all 4 pipeline groups sequentially on VPS
# Groups are dependency-ordered: 0 → 1 → 2 → 3
# Each group runs its pipelines in parallel (--workers).
#
# Usage (on VPS):
#   bash scripts/run-all-groups.sh [DATA_DIR] [WORKERS]
set -uo pipefail

DATA_DIR="${1:-/opt/bracc/data}"
WORKERS="${2:-4}"
LOG_DIR="/tmp/egos-etl-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOG_DIR"

log() { echo "[$(date -u +%H:%M:%SZ)] $*" | tee -a "$LOG_DIR/main.log"; }

cd /opt/bracc/egos-inteligencia/api
source .venv/bin/activate

export NEO4J_URI="${NEO4J_URI:-bolt://neo4j:7687}"
export NEO4J_USER="${NEO4J_USER:-neo4j}"
export NEO4J_DATABASE="${NEO4J_DATABASE:-neo4j}"
# NEO4J_PASSWORD must be set in environment

if [ -z "${NEO4J_PASSWORD:-}" ]; then
  echo "ERROR: NEO4J_PASSWORD not set"
  exit 1
fi

FAILED_GROUPS=()
TOTAL_START=$(date +%s)

for group in 0 1 2 3; do
  log "=== Starting Group $group ==="
  group_start=$(date +%s)
  log_file="$LOG_DIR/group${group}.log"

  if python -m egos_inteligencia.etl.runner \
      run-group "$group" \
      --data-dir "$DATA_DIR" \
      --workers "$WORKERS" \
      2>&1 | tee "$log_file"; then
    elapsed=$(( $(date +%s) - group_start ))
    log "✅ Group $group complete in ${elapsed}s"
  else
    elapsed=$(( $(date +%s) - group_start ))
    log "❌ Group $group FAILED after ${elapsed}s — check $log_file"
    FAILED_GROUPS+=("$group")
    log "Continuing with next group..."
  fi
done

total_elapsed=$(( $(date +%s) - TOTAL_START ))
log ""
log "=== All groups finished in ${total_elapsed}s ==="
log "Logs: $LOG_DIR/"

if [ ${#FAILED_GROUPS[@]} -gt 0 ]; then
  log "FAILED groups: ${FAILED_GROUPS[*]}"
  exit 1
fi

log "✅ Full ETL run complete — verifying IngestionRun records..."
docker exec "$(docker ps -q -f 'name=.*neo4j')" \
  cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
  "MATCH (r:IngestionRun) WHERE r.status = 'loaded' RETURN r.source_id, r.finished_at ORDER BY r.finished_at DESC LIMIT 20" \
  2>/dev/null || log "(neo4j verify skipped — cypher-shell not available)"
