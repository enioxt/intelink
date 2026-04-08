# Mapeamento Completo: Bases de Dados Públicas para Intelink

**Data:** 2026-04-08  
**Objetivo:** Expandir cobertura de dados para investigações  
**Status:** Pesquisa ampla concluída — 50+ fontes identificadas  

---

## 📊 Resumo Executivo

### O que Já Temos (BRACC Backup)
| Fonte | Dados | Cobertura |
|-------|-------|-----------|
| CNPJ Receita Federal | 66M empresas + 17M sócios | Nacional |
| TSE | Doações eleitorais, candidatos | Nacional |
| Portal Transparência | Contratos federais, servidores | Federal |
| CEIS/CNEP | Empresas sancionadas | Nacional |
| PGFN | Dívida ativa | Nacional |
| IBAMA | Embargos ambientais | Nacional |
| TCU | Inidoneidades | Nacional |

### 🆕 NOVAS Fontes Descobertas (Prioridade de Integração)

#### 🔴 P0 — CRÍTICO (Alto Valor Investigativo)
| Fonte | Dados | Acesso | Valor |
|-------|-------|--------|-------|
| **BNMP** | Mandados de prisão | API pública CNJ | 🎯 Alto — Fugitivos, foragidos |
| **DataJud** | Processos judiciais | API pública CNJ | 🎯 Alto — Litisconsórcio, réus |
| **SINESP** | Veículos roubados/furados | API (restrita) | 🎯 Alto — Crime organizado |
| **API Antecedentes Criminais** | Nada consta/haver | API pública PF | 🎯 Alto — Background check |
| **Escavador API** | Processos, jurisprudência | API paga (free tier?) | 🎯 Alto — Inteligência jurídica |

#### 🟠 P1 — IMPORTANTE (Médio Valor)
| Fonte | Dados | Acesso | Valor |
|-------|-------|--------|-------|
| **InfoCrim SP** | Estatísticas criminais | Portal público | Análise padrões |
| **SEJUSP MG** | Dados segurança MG | Dados abertos | Crime estadual |
| **SINESP Dados Abertos** | Ocorrências criminais | dados.gov.br | Crime nacional |
| **Querido Diário** | Diários oficiais municípios | API OKBr | Fiscalização municipal |
| **Registro.br** | Domínios .br | Dados abertos | Infraestrutura digital |

#### 🟡 P2 — COMPLEMENTAR (Valor Específico)
| Fonte | Dados | Acesso | Valor |
|-------|-------|--------|-------|
| **CNEFE** | Endereços escolas/educação | Dados abertos MEC | Vinculação territorial |
| **CNES** | Estabelecimentos saúde | DATASUS | Rede saúde |
| **SIGTAP** | Procedimentos médicos | Portal | Análise de gastos |
| **SIGM** | Medicamentos | Portal ANVISA | Fármacos |
| **SIGTAS** | Agrotóxicos | Dados abertos | Meio ambiente |

---

## 🔍 Detalhamento das Principais Fontes NOVAS

### 1. BNMP — Banco Nacional de Monitoramento de Prisões
**URL:** https://portalbnmp.cnj.jus.br/  
**API:** https://api-publica.datajud.cnj.jus.br/ (via DataJud)  
**Dados:**
- Mandados de prisão expedidos
- Situação processual (ativo, cumprido, suspenso)
- Órgão expedidor (TJ, TRF, etc.)
- Natureza (preventiva, temporária, condenação)

**Valor Investigativo:**
- Identificar foragidos/fugitivos
- Cruzar com CNPJ (empresas de réus)
- Análise de redes criminosas

**Integração:**
```python
# ETL BNMP — Proposta
class BNMPPipeline:
    endpoint = "https://api-publica.datajud.cnj.jus.br/bnmp"
    
    def extract(self, state_code: str):
        # Paginação por estado
        # Extrair: nome, CPF, processo, situacao
        pass
```

---

### 2. DataJud — Base Nacional Processos Judiciais
**URL:** https://www.cnj.jus.br/sistemas/datajud/  
**API Pública:** https://www.cnj.jus.br/sistemas/datajud/api-publica/  
**Documentação:** Disponível em CNJ  

**Dados Disponíveis:**
- Metadados processuais (sem conteúdo sigiloso)
- Partes (polo ativo/passivo)
- Assunto/CNJ (classificação)
- Movimentações (fases processuais)
- Órgão julgador

**Valor Investigativo:**
- Litisconsórcio (quem processa junto com quem)
- Histórico processual de pessoas/empresas
- Padrões de litigância
- Cruzamento com sanções e contratos

**Limitações:**
- Dados agregados (não individualizados em massa)
- Alguns tribunais com coverage parcial
- Necessita credenciais para API completa

---

### 3. Escavador API
**URL:** https://api.escavador.com/  
**Docs:** https://api.escavador.com/docs  

**Endpoints Relevantes:**
- `/v2/busca` — Busca de processos e pessoas
- `/v2/processos` — Detalhes de processos
- `/v2/monitoramento` — Monitora processos
- `/v2/pessoas` — Perfis de envolvidos

**Valor Investigativo:**
- Monitoramento automático de processos
- Inteligência de perfis (advogados, partes)
- Jurisprudência cruzada

**Custo:** API paga (verificar free tier/trial)  
**Alternativa:** JusBrasil API (similar)  

---

### 4. SINESP — Sistema Nacional de Segurança Pública
**URL:** https://sinesp.gov.br  
**App:** SINESP Cidadão (Android/iOS)  

**Dados Disponíveis:**
- Consulta veículos (placa) — roubados/furados/clonados
- Mandados de prisão (integrado BNMP)
- Ocorrências criminais (estatísticas)

**API Oficial:** Restrita a órgãos de segurança  
**Alternativa:** Dados abertos em dados.gov.br (agregados)  

**Valor Investigativo:**
- Verificação de placas em operações
- Cruzamento veículos ↔ pessoas ↔ processos

---

### 5. API Antecedentes Criminais (Polícia Federal)
**URL:** https://www.gov.br/conecta/catalogo/apis/antecedentes-criminais  
**Tipo:** API pública governamental  

**Funcionalidade:**
- Consulta "Nada Consta" / "Haver"
- Retorno: situação criminal do CPF

**Valor Investigativo:**
- Background check em investigações
- Cruzamento com PEPs e sanções

---

## 📋 Plano de Integração Priorizado

### Fase 1: MVP (Esta Semana)
**Objetivo:** Ter dados funcionais para demo

| Fonte | Esforço | Status |
|-------|---------|--------|
| ✅ CNPJ (já temos) | — | 66M empresas |
| ✅ Sanções CEIS/CNEP | — | Já no backup |
| ✅ Contratos Transparência | — | Já no backup |
| **BNMP** (subset) | 4h | P0 — Foragidos |

### Fase 2: Expansão (Próximas 2 Semanas)
**Objetivo:** Enriquecer cruzamentos

| Fonte | Esforço | Valor |
|-------|---------|-------|
| **DataJud** (metadados) | 8h | Processos |
| **Querido Diário** | 6h | Municípios |
| **Escavador** (trial) | 4h | Jurídico |
| **Registro.br** | 3h | Domínios |

### Fase 3: Profundidade (Mês 2)
**Objetivo:** Inteligência avançada

| Fonte | Esforço | Valor |
|-------|---------|-------|
| **API Antecedentes** | 6h | Background check |
| **InfoCrim/SEJUSP** | 8h | Estatísticas criminais |
| **SINESP** (se possível) | — | Veículos |
| **Cruzamentos avançados** | 16h | Padrões |

---

## 🔧 Implementação: ETL BNMP (Exemplo)

```python
# etl/pipelines/bnmp.py
"""Pipeline BNMP — Mandados de Prisão"""

import requests
from etl.base import Pipeline


class BNMPPipeline(Pipeline):
    """Extrai mandados de prisão do CNJ."""
    
    source_id = "bnmp"
    source_name = "Banco Nacional de Monitoramento de Prisões"
    source_url = "https://portalbnmp.cnj.jus.br/"
    
    def extract(self, state_code: str = None, limit: int = 1000):
        """
        Extrai mandados da API pública.
        
        Args:
            state_code: Sigla UF (ex: 'MG', 'SP') — None = todos
            limit: Máximo de registros para teste
        """
        endpoint = "https://api-publica.datajud.cnj.just.br/bnmp"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",  # Se necessário
            "Accept": "application/json"
        }
        
        params = {
            "ordenacao": "dataExpedicao",
            "pagina": 1
        }
        
        if state_code:
            params["orgaoExpedidor"] = state_code
        
        records = []
        while len(records) < limit:
            resp = requests.get(endpoint, headers=headers, params=params)
            data = resp.json()
            
            for item in data.get("mandados", []):
                records.append({
                    "numero_mandado": item["numero"],
                    "nome": item["pessoa"]["nome"],
                    "cpf": item["pessoa"].get("cpf"),
                    "situacao": item["situacao"]["descricao"],
                    "data_expedicao": item["dataExpedicao"],
                    "orgao_expedidor": item["orgaoExpedidor"]["nome"],
                    "tipo": item["tipo"]["descricao"],
                    "processo": item.get("numeroProcesso"),
                })
            
            if not data.get("hasNextPage"):
                break
            params["pagina"] += 1
        
        return records[:limit]
    
    def transform(self, records):
        """Normaliza para schema Intelink."""
        transformed = []
        for r in records:
            transformed.append({
                "element_id": f"bnmp:{r['numero_mandado']}",
                "type": "MandadoPrisao",
                "name": f"Mandado - {r['nome']}",
                "status": r["situacao"],
                "issued_date": r["data_expedicao"],
                "issuer": r["orgao_expedidor"],
                "mandate_type": r["tipo"],
                "process_number": r["processo"],
                "person_name": r["nome"],
                "person_cpf": r.get("cpf"),
            })
        return transformed
    
    def load(self, records):
        """Carga no Neo4j."""
        cypher = """
        UNWIND $records as r
        MERGE (m:MandadoPrisao {element_id: r.element_id})
        SET m.name = r.name,
            m.status = r.status,
            m.issued_date = date(r.issued_date),
            m.issuer = r.issuer,
            m.mandate_type = r.mandate_type,
            m.process_number = r.process_number,
            m.person_name = r.person_name
        
        WITH m, r
        WHERE r.person_cpf IS NOT NULL
        MERGE (p:Person {cpf: r.person_cpf})
        SET p.name = r.person_name
        MERGE (p)-[:HAS_MANDATE]->(m)
        """
        self.loader.run(cypher, {"records": records})
```

---

## 📊 Matriz de Prioridade Final

```
                    ┌─────────────────────────────────────┐
                    │     VALOR INVESTIGATIVO             │
                    │  Baixo    Médio    Alto    Crítico  │
    ┌───────────────┼─────────────────────────────────────┤
    │   Fácil       │ Registro  Querido   API Anteceden-│
    │               │   .br     Diário    tes Criminais │
    │               │         (P2)        (P0)          │
    │               │                       ↑            │
    │   Médio       │ CNEFE    DataJud    Escavador     │
    │               │  (P2)    (P1)        (P0)          │
    │               │            ↑                        │
    │   Difícil     │ SIGTAS    BNMP      SINESP (se    │
    │   ou API      │  (P2)    (P0)       possível)     │
    │   Restrita    │                       (P0)          │
    └───────────────┴─────────────────────────────────────┘
```

**Foco nas interseções Alto Valor + Fácil/Médio:**
1. **API Antecedentes Criminais** (P0) — Fácil, alto valor
2. **BNMP** (P0) — Médio esforço, crítico valor
3. **Escavador** (P0) — Médio esforço, alto valor
4. **DataJud** (P1) — Médio esforço, alto valor

---

## ✅ Checklist de Ação Imediata

- [ ] Criar conta/ Credenciais DataJud CNJ
- [ ] Testar API BNMP (endpoint público)
- [ ] Verificar trial Escavador API
- [ ] Implementar ETL BNMP (subset 1k registros)
- [ ] Cruzar BNMP com CNPJ (empresas de foragidos)
- [ ] Documentar schema novo (`MandadoPrisao`, `ProcessoJudicial`)

---

## 📚 Referências

- **CNJ APIs:** https://www.cnj.jus.br/sistemas/datajud/api-publica/
- **BNMP Portal:** https://portalbnmp.cnj.jus.br/
- **Escavador API:** https://api.escavador.com/docs
- **Gov.br Conecta:** https://www.gov.br/conecta/catalogo/
- **Base dos Dados:** https://basedosdados.org/
- **Querido Diário:** https://queridodiario.ok.org.br/

---

*Mapeamento criado em 2026-04-08 | Pesquisa: Exa + Conhecimento local | Cascade | EGOS Inteligência*
