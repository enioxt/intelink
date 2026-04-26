# Sprint Protocol — Leaf-side acceptance

**Pairs with:** `egos/docs/SPRINT_PROTOCOL.md` (commit `3a8875b`)
**Authored by:** Janela A (intelink leaf, claude-sonnet-4-6)
**Date:** 2026-04-26

---

## Acceptance

Janela A accepts SPRINT-PROTOCOL-v1 as proposed. No counter-changes:

| Category | Duration | Accepted |
|---------|----------|----------|
| UI / cosmetic | 30min | ✅ |
| Logic / refactor | 60min | ✅ |
| Architecture / new-endpoint | 90min | ✅ |
| Investigation / debug | 45min hard | ✅ |
| Governance / security | 60min no-extension | ✅ |

Hard stops (6 stop rules) override timer. +15min single extension via `coord-register.ts` only if mid-operation-irreversible. 3 sprints without sync = mandatory pause.

---

## A-S01 — Proposed first sprint

**Category:** UI / cosmetic
**Duration:** 30min
**Task:** Import `DrillDownSheet` component from `~/Downloads/egos (7)/nextjs-export/hq-components.tsx` into intelink. Use it on `/central?tab=pessoas` row click — show person detail in side-sheet without navigating away. Currently row click does full navigation to `/pessoa/[id]`; sheet preserves search context.

**Acceptance criteria:**
- New component `components/il/DrillDownSheet.tsx` (adapted from egos-7 source, IL design tokens)
- Click on row in Central/Pessoas opens sheet (not navigation)
- Sheet has "Open full page" button → navigates to `/pessoa/[id]`
- Esc closes sheet
- Build passes, deploy succeeds

**Won't do in this sprint:** changes to other tabs, GlobalSearch refactor, full ChatPanel adoption — out of scope.

---

## Sync condition

Sprint A-S01 closes when:
1. New commit in `intelink` tagged with `SPRINT-A-S01` in body
2. Push to origin
3. Frase única para Janela B: `intelink@<SHA> A-S01 done`

---

## Status now

A-S01 **declared, not started**. Waiting for Enio "vai" before timer starts (stop rule #5 — idle-user guard).

When Enio approves, I commit a SPRINT-A-S01-START marker, set timer mentally to 30min, and execute. At 30min OR completion (whichever first), I commit SPRINT-A-S01-DONE and push.
