#!/bin/bash
# deploy-hetzner.sh — Deploy Intelink Next.js no Hetzner VPS
# Fluxo: backup .env → rsync --delete → restore .env → rebuild --no-cache → health check
# Uso: ./deploy-hetzner.sh [--skip-build]

set -euo pipefail

VPS_HOST="${VPS_HOST:-204.168.217.125}"
VPS_USER="${VPS_USER:-root}"
VPS_KEY="${VPS_KEY:-$HOME/.ssh/hetzner_ed25519}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/intelink-nextjs}"
DOMAIN="${DOMAIN:-intelink.ia.br}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SKIP_BUILD=0
for arg in "$@"; do
    [[ "$arg" == "--skip-build" ]] && SKIP_BUILD=1
done

SSH="ssh -i $VPS_KEY -o ConnectTimeout=10 $VPS_USER@$VPS_HOST"

echo "Intelink Deploy → $DEPLOY_PATH on $VPS_HOST"
echo ""

# 1. Conectividade
$SSH exit || { echo "ERRO: VPS inacessível"; exit 1; }

# 2. Backup do .env de produção ANTES do rsync (--delete pode apagá-lo)
echo "[1/5] Backup do .env de produção..."
$SSH "[ -f $DEPLOY_PATH/.env ] && cp $DEPLOY_PATH/.env /tmp/intelink_env_backup_$(date +%s) && echo '.env backed up' || echo '.env missing — will restore from container env later'"

# 3. Rsync
echo "[2/5] Rsync do código..."
rsync -az --delete \
  --exclude '.git' --exclude 'node_modules' --exclude '.next' \
  --exclude '.venv' --exclude '__pycache__' --exclude '*.pyc' \
  --exclude '.env' --exclude '.env.local' \
  -e "ssh -i $VPS_KEY" \
  "$PROJECT_ROOT/" "$VPS_USER@$VPS_HOST:$DEPLOY_PATH/" | tail -3

# 4. Restaurar .env se foi apagado
echo "[3/5] Garantir .env presente..."
$SSH "
if [ ! -f $DEPLOY_PATH/.env ]; then
    LATEST_BACKUP=\$(ls -t /tmp/intelink_env_backup_* 2>/dev/null | head -1)
    if [ -n \"\$LATEST_BACKUP\" ]; then
        cp \"\$LATEST_BACKUP\" $DEPLOY_PATH/.env
        echo '.env restored from backup'
    elif docker ps --filter name=intelink-web --format '{{.Names}}' | grep -q intelink-web; then
        docker exec intelink-web env | grep -E '^(JWT_SECRET|NEO4J|NEXT_PUBLIC|OPENROUTER|PHOTOS_DIR|SUPABASE|TELEGRAM|OPENAI|GROQ|ANTHROPIC|ALLOWED_ORIGINS)' > $DEPLOY_PATH/.env
        echo 'NODE_ENV=production' >> $DEPLOY_PATH/.env
        echo 'PORT=3000' >> $DEPLOY_PATH/.env
        echo 'HOSTNAME=0.0.0.0' >> $DEPLOY_PATH/.env
        echo 'NEXT_TELEMETRY_DISABLED=1' >> $DEPLOY_PATH/.env
        echo '.env recovered from running container'
    else
        echo 'WARN: no .env found and no running container — deploy may fail'
    fi
fi
ls -la $DEPLOY_PATH/.env
"

# 5. Rebuild + restart
if [ $SKIP_BUILD -eq 0 ]; then
    echo "[4/5] Rebuild container (no cache)..."
    $SSH "cd $DEPLOY_PATH && docker compose build --no-cache intelink-web 2>&1 | tail -5"
fi

echo "[5/5] Up + health check..."
$SSH "cd $DEPLOY_PATH && docker compose up -d intelink-web && sleep 15 && docker ps --filter name=intelink-web --format '{{.Names}}: {{.Status}}'"

# 6. Smoke test via HTTPS
echo ""
echo "Smoke test:"
HTTP_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/login")
HTTP_BRIDGE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://$DOMAIN/api/auth/bridge" \
    -H "Origin: https://$DOMAIN" -H "Content-Type: application/json" -d '{"email":"test@test"}')
echo "  /login → $HTTP_LOGIN (expected 200)"
echo "  /api/auth/bridge → $HTTP_BRIDGE (expected 401 = CSRF OK)"

if [[ "$HTTP_LOGIN" == "200" && "$HTTP_BRIDGE" == "401" ]]; then
    echo ""
    echo "DEPLOY OK"
else
    echo ""
    echo "DEPLOY WARN — checar logs: $SSH 'docker logs intelink-web --tail 50'"
    exit 2
fi
