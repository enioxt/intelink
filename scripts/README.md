# Scripts — EGOS Inteligência (Intelink)

Compliance, security, and Neo4j maintenance scripts.

## Scripts

| Script | Purpose | Needs Neo4j |
|--------|---------|-------------|
| `prompt_injection_scan.py` | Scans PR text surfaces for prompt-injection patterns | No |
| `check_public_privacy.py` | Validates public Cypher queries don't expose PII | No |
| `check_open_core_boundary.py` | Validates open-edition scope (no private services in public surface) | No |
| `check_compliance_pack.py` | Checks required LGPD/compliance docs exist and have required sections | No |
| `run_integrity_gates.py` | Runs hard Neo4j integrity checks (CPF format, SAME_AS integrity) | Yes |
| `run_temporal_gates.py` | Runs temporal edge status gates globally + Senado sub-pack | Yes |
| `neo4j-backup.sh` | Hot tar backup of Neo4j data volume with Telegram alert | Yes |

## How to run

```bash
# Prompt injection scan (PR gate)
python3 scripts/prompt_injection_scan.py --body-file /tmp/pr_body.txt

# Privacy and boundary checks (from repo root)
python3 scripts/check_public_privacy.py --repo-root .
python3 scripts/check_open_core_boundary.py --repo-root .
python3 scripts/check_compliance_pack.py --repo-root .

# Neo4j integrity gates (Neo4j must be running)
export NEO4J_PASSWORD=your_password
python3 scripts/run_integrity_gates.py --uri bolt://localhost:7687
python3 scripts/run_temporal_gates.py --uri bolt://localhost:7687 --skip-senado

# Backup (run as root or with Docker access)
bash scripts/neo4j-backup.sh
```

## Cypher maintenance files

Located in `infra/neo4j/`:
- `init.cypher` — constraints and indexes; run on new Neo4j instance initialization
- `link_persons.cypher` — SAME_AS deduplication for Person nodes by CPF/name
- `link_partners_probable.cypher` — POSSIBLE_SAME_AS probabilistic linking (masked CPF partners)
