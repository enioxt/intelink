# TransfereGov/SICONV Integration Analysis

> **Source:** analise_expandida_arquitetura_transferencias_publicas.md (compiladochats/)
> **Extracted:** 2026-04-15
> **Status:** Architecture reference for EGOS Inteligência data ingestion

## Overview

Integration with Brazilian federal transparency systems:
- **TransfereGov:** Federal fund transfers to states/municipalities
- **SICONV:** Conventions and agreements tracking
- **API Pattern:** REST endpoints with pagination

## Architecture Components

### Data Sources
- Agreements (Acordos de Cooperação)
- Conventions (Convênios)
- Transfer orders (Ordens de Pagamento)
- Project status reports

### Ingestion Pipeline
1. **Connector:** `transferegov.py` - HTTP client with backoff
2. **Parser:** JSON → Normalized schema
3. **Storage:** Neo4j graph + PostgreSQL relational
4. **Scheduler:** Daily incremental sync

## References
- See: `~/Downloads/compiladochats/analise_expandida_arquitetura_transferencias_publicas.md` for full analysis
- Related: EGOS Gateway API at port 3050

