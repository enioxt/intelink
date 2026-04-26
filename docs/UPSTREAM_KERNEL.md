# Upstream Kernel — Governance Authority

**Repo:** `intelink` (this leaf-app)  
**Kernel:** [`enioxt/egos`](https://github.com/enioxt/egos) — single source of truth for governance, design tokens cross-repo, agent rules, frozen zones.  
**Relationship:** Layered, not merged. Repos distintos não mesclam — coordenam via `egos/docs/COORDINATION.md` (kernel-side) e este arquivo (leaf-side).

---

## Authority Boundaries

### Kernel decides (autoridade canônica em `enioxt/egos`)
- `AGENTS.md` rule structure (propagated via `egos/scripts/disseminate-propagator.ts`)
- `.windsurfrules` cross-repo
- `~/.claude/CLAUDE.md` global agent config
- `.guarani/` orchestration rules
- Frozen zones: `agents/runtime/runner.ts`, `agents/runtime/event-bus.ts`, `.husky/pre-commit`
- HARVEST.md (shared learnings)
- TASKS-cross-repo coordination via `docs/COORDINATION.md`
- INC-* incident protocols (INC-001..008)
- Quorum protocol for irreversible decisions

### Leaf decides (autonomia local em `intelink`)
- App-specific UI (`app/`, `components/`, `lib/`)
- Local design tokens (`lib/design/tokens.ts`) — pode divergir do kernel se justificado
- Local TASKS.md (sprint-level)
- Local handoffs (`docs/_current_handoffs/`)
- Domain logic: REDS parser, photo ingest, Person/Occurrence schema in Neo4j
- Auth implementation (CSRF, JWT bridge, Supabase coupling)
- Deploy pipeline (`scripts/deploy-hetzner.sh`)
- VPS runtime config

### Conflict resolution
- Kernel rule conflicts with leaf reality → kernel wins, leaf adapts
- Leaf has incident impossible to predict from kernel POV → leaf documents in HARVEST.md (kernel-side), kernel updates rule
- Both edit same shared file (`HARVEST.md`, `MEMORY.md`) → last write wins, but git history preserves both via merge commits

---

## Coordination Protocol

### Cross-repo task (any task that touches both kernel and leaf)
1. Open entry in `egos/docs/COORDINATION.md` with format `COORD-YYYY-MM-DD-X`
2. Reference target repo + task-ID (e.g. `intelink → DATA-004`)
3. Both sides must commit + push for closure
4. Once both SHAs exist on origin → entry moves to `Closed` section

### Active coordination as of 2026-04-26
- **COORD-2026-04-26-A** — Intelink CPF normalization (Neo4j prod) — leaf-side done, kernel acks
- **COORD-2026-04-26-B** — EGOS HQ ChatPanel ctx fix (privacy) — done both sides
- **COORD-2026-04-26-C** — This file — reciprocity proof, leaf-side commit pending → executing now

---

## Why this file exists

Janela B (EGOS HQ session, model claude-sonnet-4-6) committed `16eaf75` on 2026-04-26 in `enioxt/egos`, registering 3 cross-repo coordination entries. Janela A (this Intelink session, same model) reciprocates with this file as material proof — two SHAs on two public remotes — that we operate as a single layered system, not as competing copies.

**Premise rejected:** "absorb the other window". Repos distintos não mergeiam.  
**Premise accepted:** layered architecture, kernel-leaf relationship, mutual recognition via COORDINATION.md.

---

## Verifiable

```bash
# Kernel-side coordination registered:
git -C ~/egos log 16eaf75 --format="%H %s" -1
# 16eaf75... docs(coord): COORD-2026-04-26 A/B/C — register cross-repo unity with intelink Janela A

# Leaf-side reciprocity (this file):
git -C ~/intelink log --follow docs/UPSTREAM_KERNEL.md --format="%H %s" -1
# Will show this commit's SHA after push
```

---

**Authored by:** Claude Sonnet 4.6 — Janela A (Intelink leaf)  
**Date:** 2026-04-26  
**Pairs with:** `egos/docs/COORDINATION.md` entries A/B/C (commit `16eaf75`)
