#!/bin/bash
# deploy-hetzner.sh — Deploy EGOS Inteligência no Hetzner VPS
# Uso: ./deploy-hetzner.sh [--env-file /path/to/.env]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configurações
VPS_HOST="${VPS_HOST:-204.168.217.125}"
VPS_USER="${VPS_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/egos-inteligencia}"

echo "🚀 EGOS Inteligência — Deploy Hetzner VPS"
echo "=========================================="
echo "Host: $VPS_HOST"
echo "Path: $DEPLOY_PATH"
echo "Local project: $PROJECT_ROOT"
echo ""

# Step 1: Verificar conectividade
echo "📡 Step 1: Verificando conectividade..."
if ! ssh -q -o ConnectTimeout=5 "$VPS_USER@$VPS_HOST" exit; then
    echo "❌ Falha ao conectar ao VPS"
    exit 1
fi
echo "✅ VPS acessível"

# Step 2: Sincronizar código
echo "📥 Step 2: Sincronizando código..."
ssh "$VPS_USER@$VPS_HOST" "mkdir -p '$DEPLOY_PATH'"

rsync -av --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.venv' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  "$PROJECT_ROOT/" "$VPS_USER@$VPS_HOST:$DEPLOY_PATH/"

echo "✅ Código sincronizado"

# Step 3: Deploy containers
echo "🏗️ Step 3: Deploy containers..."
ssh "$VPS_USER@$VPS_HOST" "
    cd '$DEPLOY_PATH'
    
    # Verificar se .env existe
    if [ ! -f .env ]; then
        echo '⚠️  Criando .env de exemplo - EDITE ANTES DE PRODUÇÃO!'
        cp .env.example .env
    fi
    
    # Pull e build
    docker compose pull
    docker compose build
    docker compose up -d
    
    # Health check
    sleep 10
    docker compose ps
    
    echo '✅ Deploy concluído'
"

echo ""
echo "🎉 Deploy finalizado!"
echo "URL: https://$DOMAIN"
echo ""
echo "Para ver logs: ssh $VPS_USER@$VPS_HOST 'cd $DEPLOY_PATH && docker compose logs -f'"
