#!/usr/bin/env bash
# DATA-SAFE-001 — Daily backup: Supabase (pg_dump) + Neo4j (intelink-neo4j only)
#
# Installed on VPS at /opt/intelink-nextjs/scripts/backup-daily.sh
# Cron: 0 3 * * * /opt/intelink-nextjs/scripts/backup-daily.sh
#
# Outputs:
#   /opt/backups/supabase/intelink-YYYY-MM-DD.sql.gz
#   /opt/backups/neo4j/intelink-YYYY-MM-DD.dump
#
# Env required (in /opt/intelink-nextjs/.env.local):
#   SUPABASE_DB_URL           — Supabase connection URI (postgres://...)
#   NEO4J_REDS_PASSWORD       — intelink-neo4j password
#
# Retention: keep last 30 daily + last 12 monthly (1st of month).

set -euo pipefail

BACKUP_ROOT="/opt/backups"
DATE="$(date +%Y-%m-%d)"
DAY_OF_MONTH="$(date +%d)"

# Load env
if [ -f /opt/intelink-nextjs/.env.local ]; then
    set -a
    source /opt/intelink-nextjs/.env.local
    set +a
fi

mkdir -p "$BACKUP_ROOT/supabase" "$BACKUP_ROOT/neo4j" "$BACKUP_ROOT/logs"

LOG="$BACKUP_ROOT/logs/backup-$DATE.log"
exec > >(tee -a "$LOG") 2>&1

echo "=== Intelink backup — $DATE ==="

# ── Supabase ─────────────────────────────────────────
# Supabase managed does daily backups automatically (retained 7 days free tier).
# Set SUPABASE_DB_URL in /opt/intelink-nextjs/.env.local only if you want an
# additional local copy (useful for offline restore or longer retention).
echo "[supabase] pg_dump..."
if [ -z "${SUPABASE_DB_URL:-}" ]; then
    echo "[supabase] SKIP — SUPABASE_DB_URL not set (managed backups active)"
else
    SUPA_OUT="$BACKUP_ROOT/supabase/intelink-$DATE.sql.gz"
    pg_dump "$SUPABASE_DB_URL" \
        --no-owner --no-acl \
        --schema=public \
        --exclude-table-data='auth.audit_log_entries' \
        --exclude-table-data='auth.flow_state' \
        --exclude-table-data='auth.refresh_tokens' \
        2>"$BACKUP_ROOT/logs/supabase-err-$DATE.log" \
        | gzip -9 > "$SUPA_OUT"
    SIZE=$(du -h "$SUPA_OUT" | cut -f1)
    echo "[supabase] OK — $SUPA_OUT ($SIZE)"
fi

# ── Neo4j (intelink-neo4j only; bracc-neo4j backed up separately) ──
# Use `docker exec` + neo4j-admin on the running container (no downtime needed
# for hot backup; falls back to stop+dump if hot mode unavailable).
echo "[neo4j] backup intelink-neo4j..."
NEO4J_OUT="$BACKUP_ROOT/neo4j/intelink-$DATE.dump"
if docker ps --format '{{.Names}}' | grep -q '^intelink-neo4j$'; then
    DBNAME="neo4j"  # Neo4j CE default database name
    VOLUME=$(docker inspect intelink-neo4j --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' 2>/dev/null)
    if [ -z "$VOLUME" ]; then
        VOLUME="intelink-neo4j_data"  # fallback
    fi
    echo "[neo4j] database=$DBNAME volume=$VOLUME"

    # Stop briefly (CE doesn't support hot backup)
    docker stop intelink-neo4j >/dev/null 2>&1 || true
    mkdir -p /tmp/intelink-neo4j-dump
    chmod 777 /tmp/intelink-neo4j-dump

    if docker run --rm \
        -v "$VOLUME:/data" \
        -v /tmp/intelink-neo4j-dump:/backups \
        neo4j:5-community \
        neo4j-admin database dump "$DBNAME" --to-path=/backups --overwrite-destination=true \
        >"$BACKUP_ROOT/logs/neo4j-err-$DATE.log" 2>&1; then
        if [ -f "/tmp/intelink-neo4j-dump/${DBNAME}.dump" ]; then
            mv "/tmp/intelink-neo4j-dump/${DBNAME}.dump" "$NEO4J_OUT"
            SIZE=$(du -h "$NEO4J_OUT" | cut -f1)
            echo "[neo4j] OK — $NEO4J_OUT ($SIZE)"
        else
            echo "[neo4j] dump file not found at /tmp/intelink-neo4j-dump/${DBNAME}.dump"
            ls -la /tmp/intelink-neo4j-dump/ 2>&1 | head -5
        fi
    else
        echo "[neo4j] dump FAILED — logs:"
        tail -5 "$BACKUP_ROOT/logs/neo4j-err-$DATE.log"
    fi
    rm -rf /tmp/intelink-neo4j-dump
    docker start intelink-neo4j >/dev/null 2>&1 || true
else
    echo "[neo4j] SKIP — intelink-neo4j container not running"
fi

# ── Retention ────────────────────────────────────────
echo "[retention] pruning old backups..."
# Keep all from last 30 days
find "$BACKUP_ROOT/supabase" -name 'intelink-*.sql.gz' -mtime +30 -delete 2>/dev/null || true
find "$BACKUP_ROOT/neo4j" -name 'intelink-*.dump' -mtime +30 -delete 2>/dev/null || true
# Monthly archive: on day 1, copy to monthly/
if [ "$DAY_OF_MONTH" = "01" ]; then
    MONTH=$(date +%Y-%m)
    mkdir -p "$BACKUP_ROOT/monthly"
    cp "$BACKUP_ROOT/supabase/intelink-$DATE.sql.gz" "$BACKUP_ROOT/monthly/supabase-$MONTH.sql.gz" 2>/dev/null || true
    cp "$BACKUP_ROOT/neo4j/intelink-$DATE.dump" "$BACKUP_ROOT/monthly/neo4j-$MONTH.dump" 2>/dev/null || true
    # Prune monthly beyond 12 months
    find "$BACKUP_ROOT/monthly" -mtime +365 -delete 2>/dev/null || true
fi

# ── Logs retention ───────────────────────────────────
find "$BACKUP_ROOT/logs" -name '*.log' -mtime +30 -delete 2>/dev/null || true

echo "=== Done — $DATE ==="
