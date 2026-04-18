# SECURITY POLICY — World Transparency Graph (WTG)

Policy-Version: v1.0.0  
Effective-Date: 2026-02-28  
Owner: WTG Governance Team

## Reporting vulnerabilities

Use GitHub Security Advisories for responsible disclosure:

- Private report path: repository `Security` tab -> `Report a vulnerability`.
- Do not disclose exploit details publicly before triage.

## Supported versions

Security support applies to:

- Latest `main` release line.
- Most recent tagged public release.

Older snapshots may not receive security fixes.

## Disclosure SLA targets

Target response windows:

- Acknowledgement: within 72 hours.
- Initial triage: within 7 calendar days.
- Mitigation plan: as soon as reproducibility and impact are confirmed.

These targets are best-effort goals, not guaranteed contractual commitments.

If a report is out of scope or non-actionable, rationale will be documented in the advisory workflow.

## AI and external contributor policy

### Principles

This project welcomes contributions from humans and AI agents alike, but with strict governance:

1. **Transparency is mandatory.** AI-generated PRs must be clearly labeled. Contributors must disclose if code was written by an AI system (Copilot, Claude, GPT, custom agents, etc.).
2. **No auto-merge for external contributors.** All PRs from non-maintainers require manual review by at least 1 code owner (see `.github/CODEOWNERS`).
3. **Prompt injection defense.** The Claude PR Governor scans all PRs for prompt injection patterns. Suspicious PRs are blocked automatically.
4. **Incremental trust.** New contributors start with small, low-risk PRs (docs, tests, a11y). Access to security-sensitive areas requires track record.

### PR requirements for external/AI contributors

- [ ] **Disclose AI usage** in PR description (which tool, which parts)
- [ ] **Small scope** — max 12 files, 400 lines changed (enforced by policy)
- [ ] **No infrastructure changes** — `.github/`, `infra/`, `scripts/`, `Dockerfile` are blocked
- [ ] **No auth/security changes** — middleware, config, auth routes are blocked
- [ ] **Tests included** for any code changes
- [ ] **1+ code owner approval** required before merge

### Known risks from AI contributors

| Risk | Mitigation |
|------|------------|
| Malicious code injection via PR | Claude PR Governor scans diff + prompt injection detector |
| Social engineering via issues | Issue comments are scanned; bot-generated issues are labeled |
| Supply chain attack (new deps) | Dependency changes require maintainer approval |
| Hallucinated code/APIs | Claude evaluation checks usefulness + safety before automerge |
| Gradual trust escalation | CODEOWNERS blocks sensitive paths; branch protection enforces reviews |

### Issue comment monitoring

The project monitors issue comments for:
- AI agents self-identifying (flagged for governance review)
- Prompt injection attempts in issue bodies
- Unsolicited modifications to project governance files

### Branch protection rules (recommended)

Configure in GitHub Settings → Branches → `main`:
- ✅ Require pull request reviews (minimum 1, 2 for external)
- ✅ Require CODEOWNERS review
- ✅ Require status checks (CI, Security, Neutrality Audit)
- ✅ Require conversation resolution
- ✅ Do not allow bypassing
- ✅ Restrict who can push (maintainers only)
