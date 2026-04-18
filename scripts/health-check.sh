#!/bin/bash
# health-check.sh — Verify EGOS Inteligência deployment
# Usage: ./health-check.sh [URL]

set -euo pipefail

URL="${1:-https://intelink.ia.br}"

echo "🔍 Health Check — EGOS Inteligência"
echo "===================================="
echo "Target: $URL"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_endpoint() {
    local name=$1
    local path=$2
    local expected=$3
    
    echo -n "Checking $name... "
    
    if response=$(curl -sf "${URL}${path}" 2>/dev/null); then
        if echo "$response" | grep -q "$expected"; then
            echo -e "${GREEN}✓ OK${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠ Unexpected response${NC}"
            echo "  Got: $response"
            return 1
        fi
    else
        echo -e "${RED}✗ Failed${NC}"
        return 1
    fi
}

echo "📡 Endpoints:"
check_endpoint "Root" "/" "html" || true
check_endpoint "Health" "/health" "ok" || true
check_endpoint "API Health" "/api/health" "ok" || true
check_endpoint "API v1 Health" "/api/v1/health" "ok" || true

echo ""
echo "🐳 Docker (if local):"
if command -v docker &> /dev/null; then
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  No Docker access"
else
    echo "  Docker not available"
fi

echo ""
echo "🎉 Health check complete!"
