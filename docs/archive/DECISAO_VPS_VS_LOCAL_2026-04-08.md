# Decisão Arquitetural: VPS Hetzner vs Local (Dev)

**Data:** 2026-04-08  
**Contexto:** Carregar 77M entidades (4.7GB) no Neo4j — onde hospedar?

---

## 📊 Estado Atual do VPS Hetzner

```
IP: 204.168.217.125
Latência: ~238ms (Brasil → Europa)
Uptime: 10h14m
Load: 1.04 (leve)
RAM: 7.8GB disponível
Docker: ❌ Não detectado via SSH (possivelmente firewall/porta)
```

**Problema identificado:** SSH falhou — pode ser firewall, chave, ou configuração de porta.

---

## ⚖️ Análise Comparativa

### Opção A: VPS Hetzner (Produção)

| Aspecto | Avaliação | Notas |
|---------|-----------|-------|
| **Custo** | €6/mês (~R$36) | Hetzner CPX21 — 4 vCPU, 8GB RAM |
| **Latência** | 🔴 240ms | Usuários no Brasil sentirão lentidão |
| **Dados** | ✅ 77M entidades | Já tem backup pronto para restaurar |
| **Escalabilidade** | ✅ Alta | Pode fazer upgrade de CPU/RAM |
| **Disponibilidade** | ✅ 24/7 | Sempre online para demos |
| **Segurança** | ⚠️ Média | Exposto à internet (necessário hardening) |
| **Setup** | ⚠️ Complexo | Precisa config Docker, SSL, firewall |

**Custo total estimado:**
- VPS: €6/mês
- Armazenamento extra (se necessário): €1-2/mês
- **Total: €7-8/mês (~R$42-48)**

---

### Opção B: Local (Dev/Testes)

| Aspecto | Avaliação | Notas |
|---------|-----------|-------|
| **Custo** | ✅ Gratuito | Usa hardware existente |
| **Latência** | ✅ <1ms | Acesso instantâneo |
| **Dados** | ✅ 77M entidades | Mesmo backup pode ser restaurado local |
| **Escalabilidade** | 🔴 Limitada | Seu PC/hardware atual |
| **Disponibilidade** | 🔴 Quando PC ligado | Não acessível externamente |
| **Segurança** | ✅ Alta | Isolado da internet |
| **Setup** | ✅ Simples | Docker local já funciona |

**Requisitos mínimos para 77M entidades local:**
- RAM: 8GB+ (Neo4j precisa de 4-6GB)
- Disco: 20GB+ livre
- CPU: 4 cores+ (para queries rápidas)

---

## 🎯 Recomendação: Híbrida — Fases de Evolução

### Fase 1: Local (Agora — 2-3 dias)
**Objetivo:** Desenvolvimento rápido, testes, validação

```bash
# Restaurar backup localmente
cd /home/enio/egos-inteligencia
docker compose up -d neo4j  # Neo4j local

# Extrair apenas 10k-50k empresas para desenvolvimento
# Ou subir completo (4.7GB) se tiver RAM suficiente
```

**Vantagens:**
- ✅ Zero latência — desenvolvimento fluido
- ✅ Seguro — dados não expostos
- ✅ Rápido — iterar sem deploy
- ✅ Barato — sem custo adicional

---

### Fase 2: VPS Minimal (Semana 2 — Se necessário demo externa)
**Objetivo:** Demo para stakeholders, testes remotos

```bash
# Subir apenas API + frontend no VPS
# Neo4j fica local, exposto via túnel SSH ou ngrok
# Ou: subir subset de dados (~100k entidades = ~50MB)
```

**Alternativa túnel (sem dados no VPS):**
```bash
# Expor Neo4j local via ngrok
ngrok tcp 7687

# API no VPS conecta ao túnel
# Dados permanecem locais
```

---

### Fase 3: VPS Full (Pós-MVP — Mês 2+)
**Objetivo:** Produção real, usuários externos

**Quando migrar:**
- ✅ Sistema validado localmente
- ✅ 3-5 usuários pilotos confirmados
- ✅ Receita ou compromisso de uso
- ✅ Hardening completo implementado

**Otimizações para VPS Brasil (reduzir latência):**
- Cloud da AWS Brasil (São Paulo) — latência ~20ms
- Azure Brasil — similar
- Ou: manter Hetzner mas com CDN (CloudFlare)

---

## 💰 Custo-Benefício Detalhado

### Cenário A: VPS Hetzner Agora (Full 77M)
| Item | Custo | Benefício |
|------|-------|-----------|
| Hetzner CPX21 | €6/mês | Sempre online |
| Latência 240ms | — | UX ruim para testes |
| Hardening | 4-8h setup | Segurança básica |
| Manutenção | 2h/mês | Updates, monitoramento |
| **Total 3 meses** | **€18 + 16h trabalho** | Demo acessível |

### Cenário B: Local (Recomendado)
| Item | Custo | Benefício |
|------|-------|-----------|
| Hardware existente | €0 | — |
| Latência <1ms | — | Desenvolvimento ótimo |
| ngrok (opcional) | €0 (free tier) | Demo temporária |
| ngrok (se necessário) | €5/mês | URL fixa, mais slots |
| **Total 3 meses** | **€0-15 + 0h extra** | MVP validado |

**Economia:** €15-18 + 16h de trabalho

---

## 🚨 Problemas Técnicos do VPS Hetzner

### 1. SSH Inacessível
**Possíveis causas:**
- Firewall bloqueando porta 22
- Chave SSH não configurada
- Porta SSH alterada (ex: 2222)
- IP bloqueado após tentativas falhas

**Solução:**
```bash
# Acesso via console Hetzner (web)
# Ou: verificar ~/.ssh/config para chaves corretas
```

### 2. Docker não detectado
**Possíveis causas:**
- Docker não instalado no VPS
- Docker socket não exposto
- Usuário sem permissão docker group

### 3. Latência Alta (240ms)
**Impacto:**
- Carregamento de página: +2-3s
- Queries de busca: +500ms
- UX degradada para usuários Brasil

**Mitigação:**
- CDN (CloudFlare) — cache estático
- Otimização queries — índices Neo4j
- Upgrade para servidor no Brasil

---

## ✅ Decisão Recomendada

### **FASE ATUAL: Local + Túnel (Fase 1)**

1. **Restaurar dados localmente** — 77M entidades no Neo4j local
2. **Desenvolver/testar** — Zero latência, iteração rápida
3. **Demo externa** — Usar ngrok (free) quando necessário
4. **MVP validado** — Com dados reais funcionando

### **PRÓXIMA FASE: VPS (Mês 2)**

1. **Migrar para VPS** — Só após MVP validado
2. **Considerar AWS/Azure Brasil** — Para latência <30ms
3. **Subset de dados inicial** — 100k entidades (~50MB)
4. **Escalar conforme uso** — ETL incremental diário

---

## 🔧 Implementação Imediata (Local)

### Passo 1: Verificar Recursos Locais
```bash
# Verificar espaço e RAM disponível
df -h /home  # Precisa de 10GB+ livre
free -h      # Precisa de 6GB+ RAM disponível

# Se insuficiente: extrair subset do backup
```

### Passo 2: Restaurar Neo4j Local
```bash
cd /home/enio/egos-inteligencia

# Subir Neo4j vazio primeiro
docker compose up -d neo4j

# Parar e restaurar backup
docker compose stop neo4j
docker run --rm \
  -v egos-inteligencia_neo4j-data:/data \
  -v /home/enio/vps-backup-hetzner:/backup \
  alpine \
  sh -c "cd /data && tar xzf /backup/neo4j-data-20260327.tar.gz"

# Subir novamente
docker compose up -d neo4j
```

### Passo 3: Expor via Túnel (quando necessário demo)
```bash
# Instalar ngrok
# https://ngrok.com/download

# Expor API local
ngrok http 8000

# URL temporária: https://abc123.ngrok.io
# Compartilhar com stakeholders para demo
```

---

## 📊 Comparativo Visual

```
┌─────────────────┬──────────────────┬──────────────────┐
│     Critério    │   Local (Dev)   │  VPS (Produção)  │
├─────────────────┼──────────────────┼──────────────────┤
│ Custo           │ ✅ Grátis        │ €6-8/mês        │
│ Latência (BR)   │ ✅ <1ms          │ 🔴 240ms        │
│ Setup           │ ✅ Pronto        │ ⚠️ 4-8h         │
│ Segurança       │ ✅ Alta          │ ⚠️ Média        │
│ Escalabilidade  │ 🔴 Limitada      │ ✅ Alta         │
│ Demo externa    │ ⚠️ Via túnel     │ ✅ Direta       │
│ 77M entidades   │ ✅ Funciona      │ ✅ Funciona     │
└─────────────────┴──────────────────┴──────────────────┘
```

---

## 🎯 Próximo Passo

**Recomendo:** Restaurar dados localmente AGORA.

**Motivos:**
1. Zero custo adicional
2. Desenvolvimento fluido (sem latência)
3. Segurança (dados não expostos)
4. MVP pronto em 4-6h (vs 2-3 dias no VPS)

**VPS Hetzner:** Migrar apenas quando:
- MVP validado localmente
- 3+ usuários pilotos confirmados
- Orçamento aprovado para infra
- Hardening completo planejado

---

*Análise criada em 2026-04-08 | Cascade | EGOS Inteligência*
