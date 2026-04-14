# Database Schema — EGOS Inteligência
> **SSOT:** `docs/DATABASE_SCHEMA.md` | Updated: 2026-04-14

---

## Neo4j 5.x — Graph Database (77M+ nós, 25M+ arestas)

### Node Labels

| Label | Descrição | Propriedades principais |
|-------|-----------|------------------------|
| `Person` | Pessoa física | name, cpf (mascarado), birth_date, source, confidence |
| `PublicOfficial` | Servidor/agente público | name, cpf, masp, role, organ, tenure_start |
| `Company` | Empresa/CNPJ | cnpj, name, type, status, opening_date, partners |
| `Organization` | Organização (facção, ONG, etc.) | name, type, known_members, region |
| `Vehicle` | Veículo | plate, type, brand, model, year, owner_cpf |
| `Property` | Imóvel | address, area, value, registration, owner |
| `BankAccount` | Conta bancária | bank, branch, account_masked, holder |
| `PaymentAccount` | Conta digital/PIX | type, key, holder |
| `Investigation` | Caso investigativo | id, title, status, priority, template, assigned_to |
| `Case` | Caso policial (BO/IP) | reds, date, nature, unit, status |
| `Warrant` | Mandado judicial | type, date_issued, court, target_cpf, status |
| `Arrest` | Prisão | date, location, charges, officers |
| `Charge` | Imputação | crime_code, cp_article, description |
| `Contract` | Contrato público | number, value, organ, winner_cnpj, date |
| `Tender` | Licitação | modality, number, value, organ, items |
| `Bid` | Proposta de licitação | company_cnpj, value, disqualified |
| `Spending` | Gasto público | value, category, beneficiary, date |
| `Fund` | Fundo ou verba | name, total, released, year |
| `Transfer` | Transferência financeira | from, to, value, date, method |
| `OnlineAccount` | Conta em plataforma digital | platform, username, url |
| `Username` | Username genérico | value, platform |
| `Email` | Endereço de e-mail | address, provider |
| `Phone` | Número de telefone | number_masked, type |
| `Address` | Endereço físico | street, bairro, city, state, cep |
| `Identifier` | Identificador genérico | type, value, source |

### Relationship Types

| Relação | De → Para | Descrição |
|---------|-----------|-----------|
| `OWNS` | Person/Company → Vehicle/Property/BankAccount | Titularidade |
| `CONTROLS` | Person → Company | Controle societário |
| `MANAGES` | Person → Company/Organization | Gestão/administração |
| `INFLUENCES` | Person/Company → Company/Organization | Influência indireta |
| `EMPLOYS` | Company/Organization → Person | Vínculo empregatício |
| `PAYS_TO` | Company/Person → Company/Person | Pagamento financeiro |
| `RECEIVES_FROM` | Company/Person → Company/Person | Recebimento financeiro |
| `BENEFITS` | Person/Company → Contract/Transfer | Benefício de contrato público |
| `RESPONSIBLE_FOR` | Person → Contract/Tender | Responsabilidade funcional |
| `APPEARS_IN` | Person → Case/Warrant/Investigation | Aparece em processo |
| `MENTIONED_IN` | Person/Company → Document | Mencionado em documento |
| `RELATED_TO` | any → any | Relação genérica (fallback) |
| `ACCUSED_OF` | Person → Charge | Acusação criminal |
| `CONVICTED_OF` | Person → Charge | Condenação criminal |
| `LOCATED_AT` | Person/Company → Address | Localização |
| `REGISTERED_AT` | Company/Vehicle → Address | Registro formal |
| `ASSOCIATED_WITH` | Person → Organization | Associação a grupo |

### Índices e Constraints

```cypher
-- Constraints de unicidade
CREATE CONSTRAINT FOR (p:Person) REQUIRE p.cpf IS UNIQUE
CREATE CONSTRAINT FOR (c:Company) REQUIRE c.cnpj IS UNIQUE
CREATE CONSTRAINT FOR (v:Vehicle) REQUIRE v.plate IS UNIQUE
CREATE CONSTRAINT FOR (i:Investigation) REQUIRE i.id IS UNIQUE

-- Índices de busca full-text
CREATE FULLTEXT INDEX personNameIdx FOR (p:Person) ON EACH [p.name, p.aliases]
CREATE FULLTEXT INDEX companyNameIdx FOR (c:Company) ON EACH [c.name, c.trade_name]

-- Índices de propriedade
CREATE INDEX FOR (p:Person) ON (p.source)
CREATE INDEX FOR (n) ON (n.confidence)
CREATE INDEX FOR (n) ON (n.created_at)
```

### Queries Cypher Mais Usadas

```cypher
-- Ego network de uma pessoa (2 hops)
MATCH (p:Person {cpf: $cpf})-[r1]-(e1)-[r2]-(e2)
RETURN p, r1, e1, r2, e2 LIMIT 100

-- Encontrar conexões entre dois alvos
MATCH path = shortestPath(
  (a:Person {cpf: $cpf_a})-[*..5]-(b:Person {cpf: $cpf_b})
)
RETURN path

-- Empresas suspeitas (muitos sócios com histórico)
MATCH (c:Company)<-[:CONTROLS]-(p:Person)-[:ACCUSED_OF]->(ch:Charge)
WITH c, count(distinct p) as suspicious_partners
WHERE suspicious_partners >= 2
RETURN c.name, c.cnpj, suspicious_partners
ORDER BY suspicious_partners DESC

-- Contratos de empresa vinculada a investigado
MATCH (p:Person {cpf: $cpf})-[:CONTROLS|MANAGES]->(c:Company)
     -[:BENEFITS]->(contract:Contract)
RETURN p.name, c.name, contract.number, contract.value
```

---

## PostgreSQL (Supabase) — Dados Relacionais

### Migrations (Alembic)

**001_initial_intelink_schema.py** (225 linhas)
```sql
-- Tabelas principais
users (masp TEXT, email TEXT, password_hash TEXT, role TEXT[], tenant_id UUID, created_at)
entities (id UUID, type TEXT, source TEXT, confidence FLOAT, tenant_id UUID, created_at)
relationships (id UUID, from_id UUID, to_id UUID, type TEXT, strength FLOAT, tenant_id UUID)
investigations (id UUID, title TEXT, status TEXT, priority TEXT, assigned_to UUID, tenant_id UUID)
activity_logs (id UUID, user_id UUID, action TEXT, target TEXT, timestamp TIMESTAMPTZ)
-- activity_logs: append-only (LGPD Art. 30) — sem UPDATE/DELETE
```

**002_create_spiral_sessions_table.py** (41 linhas)
```sql
-- Histórico de conversas do chat
sessions (id UUID, user_id UUID, messages JSONB, context_entities UUID[], created_at)
```

**003_add_investigations.py** (71 linhas)
```sql
-- Metadados de investigações
investigation_metadata (id UUID, investigation_id UUID, key TEXT, value JSONB)
linked_entities (investigation_id UUID, entity_id UUID, role TEXT, added_at)
case_files (id UUID, investigation_id UUID, name TEXT, type TEXT, url TEXT, hash TEXT)
```

### Constraints Críticas

- `tenant_id` em TODAS as tabelas (isolamento multi-tenant PHASE-3)
- `activity_logs` sem UPDATE/DELETE (compliance LGPD Art. 30)
- Confidence score em todo relacionamento (FLOAT 0.0-1.0)
- Timestamps imutáveis nas linhas de auditoria

---

## Redis 7 — Cache e Sessões

| Uso | Chave | TTL |
|-----|-------|-----|
| Sessão de usuário | `session:{user_id}` | 24h |
| Cache de entidade | `entity:{cpf/cnpj}` | 1h |
| Embedding cache | `emb:{hash}` | 7d |
| Rate limit | `rl:{ip}:{endpoint}` | 60s |
| Job status | `job:{job_id}` | 24h |

---

*Para adicionar ao schema, atualizar este arquivo + criar migration Alembic em `api/migrations/versions/`*
