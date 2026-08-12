# Agent Instructions

This file guides Codex and other automation agents working in this repository.

## Documentation Placement

Keep documentation non-redundant. Move information to its owner file instead of copying the same explanation into several places.

- [README.md](README.md): user-facing purpose, install steps, quick start, common usage scenarios, configuration overview, and links to deeper docs.
- [ARCHITECTURE.md](ARCHITECTURE.md): technical implementation details, module responsibilities, data flow, tool design, transport internals, and validation strategy.
- [ROADMAP.md](ROADMAP.md): staged implementation plans, migration milestones, rollback anchors, and acceptance checks.
- [PROMPT.md](PROMPT.md): instructions intended for the runtime lighting agent using this MCP server.
- Configuration reference, OSC protocol details, integration patterns, and service-pack notes belong in [ARCHITECTURE.md](ARCHITECTURE.md).

Do not recreate `docs/`, `QUICKSTART.md`, `PROJECT-SUMMARY.md`, or extra Markdown files. The only Markdown files expected in this repository are `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `AGENTS.md`, and `PROMPT.md`.

Quick start content belongs in README. Technical summaries belong in ARCHITECTURE.

## Development Rules

- Read existing code and docs before changing behavior.
- Keep changes scoped to the requested phase or bug.
- Preserve the OSC rollback path until ROADMAP milestones explicitly allow removal.
- Do not remove `widgets.json` runtime support before the WebSocket migration validates runtime discovery.
- Keep MCP tool names and schemas stable unless a roadmap item explicitly changes them.
- Prefer transport abstractions over spreading protocol-specific branches through every tool.
- For every implementation or behavior change, update the relevant documentation in the same change when user-facing behavior, configuration, architecture, tools, transport behavior, setup, or roadmap status changes.
- If no documentation update is needed for a code change, mention that explicitly in the final response.
- Add or update tests for behavior changes.
- Run `npm run build` and `npx vitest run` after code changes when feasible.

## WebSocket Migration Rules

The migration target is QLC+ WebSocket runtime discovery:

- verify whether QLC+ 4 supports `GET /vc.json`;
- use `/vc.json` as the preferred rich discovery source when available;
- implement `QLC+API|getWidgetsList` fallback if QLC+ 4 lacks `/vc.json`;
- resolve widgets by normalized QLC+ captions;
- keep QLC+ numeric widget IDs in memory only;
- do not implement fuzzy matching unless explicitly requested later.

Document migration progress in ROADMAP, not README.
