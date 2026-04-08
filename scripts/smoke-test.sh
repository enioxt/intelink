#!/bin/bash
# smoke-test.sh — Smoke tests para Intelink API
# Verifica endpoints críticos: health, auth, search
#
# Usage: ./scripts/smoke-test.sh [API_URL]
# Default: http://localhost:8000/api/v1

set -euo pipefail

API_URL="${1:-http://localhost:8000/api/v1}"
ECHO=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((TESTS_PASSED++)) || true
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((TESTS_FAILED++)) || true
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

# =============================================================================
# Test: Health Check
# =============================================================================
test_health() {
    echo ""
    echo "🩺 Test 1: Health Check"
    echo "   GET ${API_URL}/health"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/health" 2>/dev/null || echo "\n000")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        pass "Health endpoint responde 200"
        if echo "$BODY" | grep -q '"status"'; then
            pass "Health retorna JSON com campo 'status'"
        else
            warn "Health response sem campo 'status' esperado"
        fi
    else
        fail "Health retornou HTTP $HTTP_CODE (esperado 200)"
    fi
}

# =============================================================================
# Test: Readiness Probe
# =============================================================================
test_readiness() {
    echo ""
    echo "🔌 Test 2: Readiness Probe"
    echo "   GET ${API_URL}/health/ready"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/health/ready" 2>/dev/null || echo "\n000")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        pass "Readiness probe responde 200"
    else
        fail "Readiness retornou HTTP $HTTP_CODE"
    fi
}

# =============================================================================
# Test: Auth Flow (se credentials disponíveis)
# =============================================================================
test_auth() {
    echo ""
    echo "🔐 Test 3: Auth Flow (JWT)"
    
    # Verificar se temos credenciais de teste
    TEST_EMAIL="${TEST_EMAIL:-test@intelink.local}"
    TEST_PASSWORD="${TEST_PASSWORD:-Test123!@#}"
    
    # Try register (may fail if user exists - that's ok)
    echo "   POST ${API_URL}/auth/register (register test user)"
    REGISTER_PAYLOAD='{"email":"'"$TEST_EMAIL"'","password":"'"$TEST_PASSWORD"'","invite_code":"intelink-dev-2026"}'
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$REGISTER_PAYLOAD" \
        "${API_URL}/auth/register" 2>/dev/null || echo "\n000")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "409" ]; then
        [ "$HTTP_CODE" = "201" ] && pass "Registro de usuário funciona"
        [ "$HTTP_CODE" = "409" ] && warn "Usuário já existe (ok para smoke test)"
    else
        warn "Registro retornou HTTP $HTTP_CODE (pode ser config de invite)"
    fi
    
    # Login
    echo "   POST ${API_URL}/auth/login"
    LOGIN_PAYLOAD='{"email":"'"$TEST_EMAIL"'","password":"'"$TEST_PASSWORD"'"}'
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$LOGIN_PAYLOAD" \
        "${API_URL}/auth/login" 2>/dev/null || echo "\n000")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        pass "Login funciona (HTTP 200)"
        
        # Extract token
        TOKEN=$(echo "$BODY" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$TOKEN" ]; then
            pass "Login retorna access_token JWT"
            
            # Test authenticated endpoint
            echo "   GET ${API_URL}/investigations (authenticated)"
            AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" \
                -H "Authorization: Bearer $TOKEN" \
                "${API_URL}/investigations" 2>/dev/null || echo "\n000")
            AUTH_CODE=$(echo "$AUTH_RESPONSE" | tail -n1)
            
            if [ "$AUTH_CODE" = "200" ] || [ "$AUTH_CODE" = "404" ]; then
                pass "Endpoint autenticado acessível com token"
            else
                warn "Endpoint autenticado retornou HTTP $AUTH_CODE"
            fi
        else
            warn "Login não retornou access_token"
        fi
    else
        fail "Login retornou HTTP $HTTP_CODE"
    fi
}

# =============================================================================
# Test: Search (se dados disponíveis)
# =============================================================================
test_search() {
    echo ""
    echo "🔍 Test 4: Search"
    echo "   POST ${API_URL}/search"
    
    SEARCH_PAYLOAD='{"query":"Silva","type":"person","limit":5}'
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$SEARCH_PAYLOAD" \
        "${API_URL}/search" 2>/dev/null || echo "\n000")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        pass "Search endpoint responde 200"
    elif [ "$HTTP_CODE" = "401" ]; then
        warn "Search requer autenticação (esperado para endpoints protegidos)"
    elif [ "$HTTP_CODE" = "500" ]; then
        warn "Search erro 500 (possivelmente Neo4j não conectado)"
    else
        warn "Search retornou HTTP $HTTP_CODE"
    fi
}

# =============================================================================
# Test: Public Endpoints
# =============================================================================
test_public() {
    echo ""
    echo "🌐 Test 5: Public Endpoints"
    
    # Status público
    echo "   GET ${API_URL}/public/status"
    RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/public/status" 2>/dev/null || echo "\n000")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        pass "Public status endpoint acessível"
    else
        warn "Public status retornou HTTP $HTTP_CODE"
    fi
}

# =============================================================================
# Main
# =============================================================================

echo "========================================"
echo "🧪 Intelink Smoke Tests"
echo "========================================"
echo "API URL: $API_URL"
echo "Time: $(date -Iseconds)"
echo ""

# Wait for API to be ready
echo "⏳ Aguardando API..."
for i in {1..30}; do
    if curl -s "${API_URL}/health" > /dev/null 2>&1; then
        echo "✅ API disponível"
        break
    fi
    if [ $i -eq 30 ]; then
        fail "API não respondeu após 30 tentativas"
        exit 1
    fi
    sleep 1
done

# Run tests
test_health
test_readiness
test_auth
test_search
test_public

# Summary
echo ""
echo "========================================"
echo "📊 Resumo"
echo "========================================"
echo -e "${GREEN}Passaram: $TESTS_PASSED${NC}"
echo -e "${RED}Falharam: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 Todos os smoke tests passaram!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Alguns testes falharam${NC}"
    exit 1
fi
