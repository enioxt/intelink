# Plano de Ação — Carregar Dados Reais no Intelink

**Data:** 2026-04-08  
**Status:** URGENTE — Bloqueador para MVP  
**Objetivo:** Ter dados reais suficientes para testes funcionais em 24-48h

---

## 📦 Inventário de Dados Encontrados

### 1. 🎯 Opção A: Backup Neo4j BR/ACC (RECOMENDADO — Mais Rápido)
| Atributo | Valor |
|----------|-------|
| **Arquivo** | `/home/enio/vps-backup-hetzner/neo4j-data-20260327.tar.gz` |
| **Tamanho** | 4.7 GB |
| **Entidades** | ~77M nós (66M empresas + 17M sócios) |
| **Fontes** | CNPJ, TSE, Transparência, Sanções, PEPs |
| **Status** | Completo, só restaurar |
| **Tempo** | 2-4 horas |

**Como usar:**
```bash
# Extrair no volume Neo4j do Intelink
docker run --rm -v infra_neo4j-data:/data -v /home/enio/vps-backup-hetzner:/backup alpine sh -c "cd /data && tar xzf /backup/neo4j-data-20260327.tar.gz"
```

**Vantagens:**
- ✅ Já processado (ETL completo)
- ✅ Relacionamentos criados (grafos prontos)
- ✅ 77M entidades reais (CNPJ, CPFs de sócios, sanções)
- ✅ Rápido — só restaurar backup

---

### 2. 📊 Opção B: Dados CNPJ Brutos (Alternativa — Mais Controle)
| Atributo | Valor |
|----------|-------|
| **Arquivo** | `/home/enio/Downloads/bracc-data/cnpj.tar.gz` |
| **Tamanho** | 63.9 GB |
| **Conteúdo** | Dados brutos Receita Federal |
| **Status** | Não processado |
| **Tempo** | 1-2 dias (ETL completo) |

**Como usar:**
- Extrair subset (ex: apenas empresas de MG)
- Rodar pipeline ETL do BRACC adaptado
- Importar via `UNWIND MERGE`

**Vantagens:**
- ✅ Dados mais recentes
- ✅ Controle total do processo
- ❌ Demorado — requer ETL completo

---

### 3. 📋 Opção C: Fontes Públicas Seletivas (MVP Mínimo)
Usar subset das 43 fontes documentadas em `source_registry_br_v1.csv`:

| Prioridade | Fonte | Dados | Complexidade |
|------------|-------|-------|--------------|
| P0 | Portal Transparência | Contratos federais | Baixa — CSV simples |
| P0 | CEIS/CNEP | Empresas sancionadas | Baixa — lista pequena |
| P0 | CNPJ (subset) | 100k empresas MG | Média — usar sample |
| P1 | TSE | Doações eleitorais | Média — APIs |
| P1 | PGFN | Dívida ativa | Média — CSV |

---

## 🎯 Plano Recomendado (Híbrido — 48h)

### Fase 1: Quick Win (4-6h) — RESTAURAR BACKUP
**Objetivo:** Ter dados reais funcionais imediatamente

```bash
# 1. Parar containers Neo4j atuais
cd /home/enio/egos-inteligencia
docker compose stop neo4j

# 2. Backup atual (precaução)
docker run --rm -v egos-inteligencia_neo4j-data:/data -v /tmp:/backup alpine tar czf /backup/neo4j-current-backup.tar.gz -C /data .

# 3. Limpar volume atual (OPCIONAL — se quiser começar do zero)
docker volume rm egos-inteligencia_neo4j-data

# 4. Restaurar backup BRACC
docker run --rm -v egos-inteligencia_neo4j-data:/data -v /home/enio/vps-backup-hetzner:/backup alpine sh -c "cd /data && tar xzf /backup/neo4j-data-20260327.tar.gz"

# 5. Subir Neo4j
docker compose up -d neo4j

# 6. Testar
curl http://localhost:7474/browser/
```

**Resultado:** Sistema com 77M entidades reais para testar

---

### Fase 2: Subset Controlado (4-8h) — SAMPLE PARA DESENVOLVIMENTO
**Objetivo:** Ter dataset menor para desenvolvimento rápido

```bash
# Extrair apenas 1000 empresas de MG do backup completo
# Ou usar fixtures expandidos baseados em dados reais
```

Criar script `scripts/extract-sample-neo4j.py`:
- Extrair 1k empresas + sócios + contratos
- Salvar em `fixtures/sample-real-data.cypher`
- Load rápido para dev/testes

---

### Fase 3: ETL Contínuo (24-48h) — PIPELINE PRÓPRIO
**Objetivo:** Ter ETL próprio do Intelink, não depender de backup

1. **Adaptar ETL do BRACC** (`br-acc/etl/src/`)
   - Copiar `base.py`, `loader.py`, `runner.py`
   - Adaptar para schema Intelink
   - Criar pipelines essenciais: CNPJ, Sanções, Contratos

2. **Criar pipelines simplificados:**
   - `pipelines/cnpj_simple.py` — Apenas CNPJ ativos (sem sócios detalhados)
   - `pipelines/sancoes.py` — CEIS/CNEP/TCU (listas pequenas)
   - `pipelines/transparencia.py` — Contratos federais

3. **Orquestrador:**
   - Script `scripts/run-etl-daily.sh` — Cron job diário
   - Comando: `python -m etl.runner --pipeline cnpj_simple`

---

## 🔧 Implementação — Passo a Passo

### HOJE (Fase 1 — Restaurar Backup)

#### 1. Preparação (30 min)
```bash
# Verificar espaço em disco
df -h

# Verificar backup
ls -lh /home/enio/vps-backup-hetzner/neo4j-data-20260327.tar.gz
md5sum /home/enio/vps-backup-hetzner/neo4j-data-20260327.tar.gz
```

#### 2. Restauração (2-4h)
```bash
cd /home/enio/egos-inteligencia

# Parar Neo4j atual
docker compose stop neo4j

# Backup atual (se tiver dados sintéticos importantes)
docker run --rm \
  -v egos-inteligencia_neo4j-data:/data \
  -v /tmp:/backup \
  alpine \
  tar czf /backup/neo4j-synthetic-$(date +%Y%m%d).tar.gz -C /data .

# Restaurar backup BRACC
docker run --rm \
  -v egos-inteligencia_neo4j-data:/data \
  -v /home/enio/vps-backup-hetzner:/backup \
  alpine \
  sh -c "cd /data && tar xzf /backup/neo4j-data-20260327.tar.gz"

# Iniciar Neo4j
docker compose up -d neo4j

# Aguardar healthcheck
sleep 30
docker compose ps neo4j
```

#### 3. Validação (30 min)
```bash
# Testar conexão
curl -s http://localhost:7474/db/data/ | head -5

# Contar nós (deve retornar ~77M)
docker exec -it egos-inteligencia-neo4j-1 cypher-shell -u neo4j -p "${NEO4J_PASSWORD}" "MATCH (n) RETURN count(n) as total;"

# Listar labels
docker exec -it egos-inteligencia-neo4j-1 cypher-shell -u neo4j -p "${NEO4J_PASSWORD}" "CALL db.labels() YIELD label RETURN label;"
```

#### 4. Teste de Integração (1h)
```bash
# Rodar smoke test
./scripts/smoke-test.sh http://localhost:8000/api/v1

# Testar busca
curl -X POST http://localhost:8000/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Empresa","type":"company","limit":5}'
```

---

### AMANHÃ (Fase 2 — ETL Próprio)

#### Criar ETL Simplificado

**Estrutura:**
```
etl/
├── __init__.py
├── base.py           # Classe base Pipeline
├── loader.py         # Neo4jBatchLoader
├── runner.py         # CLI orchestrator
└── pipelines/
    ├── __init__.py
    ├── cnpj_simple.py    # Apenas empresas ativas
    ├── sancoes.py        # CEIS/CNEP/TCU
    └── transparencia.py  # Contratos federais
```

**Pipeline CNPJ Simples (exemplo):**
```python
# etl/pipelines/cnpj_simple.py
import pandas as pd
from etl.base import Pipeline

class CNPJSimplePipeline(Pipeline):
    """Pipeline simplificado — apenas CNPJ ativos (sem sócios)."""
    
    source_id = "cnpj_simple"
    source_name = "CNPJ Receita Federal (simplificado)"
    
    def extract(self, file_path: str):
        """Ler CSV de CNPJ (amostra de 100k)."""
        df = pd.read_csv(file_path, nrows=100000, encoding='latin-1')
        return df
    
    def transform(self, df):
        """Normalizar para schema Intelink."""
        records = []
        for _, row in df.iterrows():
            records.append({
                'cnpj': row['cnpj'],
                'razao_social': row['razao_social'],
                'nome_fantasia': row.get('nome_fantasia', ''),
                'situacao': row['situacao_cadastral'],
                'uf': row['uf'],
                'municipio': row['municipio'],
            })
        return records
    
    def load(self, records):
        """Inserir no Neo4j via UNWIND MERGE."""
        cypher = """
        UNWIND $records as row
        MERGE (c:Company {cnpj: row.cnpj})
        SET c.razao_social = row.razao_social,
            c.nome_fantasia = row.nome_fantasia,
            c.situacao = row.situacao,
            c.uf = row.uf,
            c.municipio = row.municipio,
            c.updated_at = datetime()
        """
        self.loader.run(cypher, {'records': records})
```

---

## 📊 Dados Mínimos para MVP Funcional

### Quantidade Recomendada
| Tipo | Quantidade | Uso |
|------|------------|-----|
| Empresas (CNPJ) | 50k-100k | Busca, perfil, grafos |
| Sócios | 20k-50k | Relacionamentos, redes |
| Contratos | 5k-10k | Padrões, análise Benford |
| Sanções | 1k-2k | Alertas, risco |
| PEPs | 500-1k | Integridade |

### Total: ~100k-200k entidades = **Suficiente para MVP**

---

## ✅ Checklist de Execução

### Fase 1 — Restaurar Backup (Hoje)
- [ ] Verificar espaço em disco (>10GB livre)
- [ ] Parar Neo4j atual
- [ ] Backup sintético atual (precaução)
- [ ] Extrair backup BRACC
- [ ] Iniciar Neo4j
- [ ] Validar contagem de nós (~77M)
- [ ] Rodar smoke test
- [ ] Testar busca via API
- [ ] Commit: "data: restore 77M entities from BRACC backup"

### Fase 2 — ETL Próprio (Amanhã)
- [ ] Copiar estrutura ETL do BRACC
- [ ] Criar pipeline CNPJ simples
- [ ] Criar pipeline Sanções
- [ ] Criar pipeline Transparência
- [ ] Script de orquestração
- [ ] Documentar processo
- [ ] Commit: "feat: ETL pipelines for real data ingestion"

### Fase 3 — Automatização (Dia 3)
- [ ] Cron job diário
- [ ] Health check ETL
- [ ] Notificação Telegram em falhas
- [ ] Commit: "ops: automated ETL with monitoring"

---

## 🚨 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Backup corrompido | Baixa | Alto | Verificar MD5 antes de extrair |
| Falta de espaço | Média | Alto | Verificar `df -h` antes |
| Neo4j não inicia | Baixa | Alto | Manter backup sintético |
| Dados desatualizados | Alta | Médio | ETL incremental após restauração |
| Performance lenta | Média | Médio | Indexar campos de busca |

---

## 📚 Referências

- **Backup:** `/home/enio/vps-backup-hetzner/BACKUP_MANIFEST.md`
- **Dados CNPJ:** `/home/enio/Downloads/bracc-data/cnpj.tar.gz` (64GB)
- **Fontes:** `/home/enio/Obsidian Vault/EGOS/01 - Raw Sources/br-acc/docs/source_registry_br_v1.csv`
- **ETL BRACC:** `/home/enio/br-acc/etl/src/`
- **Diagnóstico:** `docs/knowledge/DIAGNOSTICO_SISTEMA_2026-04-08.md`

---

**Próximo passo imediato:** Executar Fase 1 — Restaurar backup BRACC no Intelink.

---

*Plano criado em 2026-04-08 | Cascade | EGOS Inteligência*
