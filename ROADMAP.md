# QLC+ WebSocket Migration Roadmap

## Rollback Anchor

- Reference commit: `e54e0f1`
- Baseline state: clean worktree when this roadmap was created
- Current runtime architecture: OSC transport, `config/widgets.json`, `widgetResolver`, QXW parser

Rule: do not remove OSC or `widgets.json` until the WebSocket path has passed the validation milestones below. OSC remains the rollback transport throughout the migration.

## Goal

Replace the current OSC-first control path with a QLC+ WebSocket-first control path that discovers Virtual Console widgets dynamically at runtime.

The target behavior is:

- no manually maintained `widgets.json` for normal operation;
- widget lookup by QLC+ caption, case-insensitive;
- runtime rediscovery after QLC+ project reload or reconnect;
- compatibility with QLC+ 4 and QLC+ 5;
- OSC kept as legacy/fallback until WebSocket has been validated in real use.

## Phase 0 - Baseline Preservation

Purpose: keep a known-good recovery point.

Tasks:

- Record commit `e54e0f1` as rollback anchor.
- Keep current OSC code and docs intact.
- Keep `widgets.json` and QXW parsing available during migration.
- Ensure existing build and tests still pass before starting transport work.

Validation:

- `npm run build`
- `npx vitest run`
- Existing OSC-based tools still compile.

## Phase 1 - Isolated QLC+ WebSocket Client

Purpose: introduce WebSocket without changing existing MCP tools.

Tasks:

- Add a dedicated QLC+ WebSocket client module.
- Support configuration:
  - `QLC_CONTROL_TRANSPORT=osc|websocket`
  - `QLC_WS_HOST=127.0.0.1`
  - `QLC_WS_PORT=9999`
  - `QLC_WS_PATH=/qlcplusWS`
  - WebSocket request/connect timeout settings
- Connect to `ws://host:port/qlcplusWS`.
- Send and receive QLC+ pipe-separated messages.
- Handle timeout, malformed replies, disconnect, and close.
- Add tests with fake socket/client plumbing.

Validation:

- Unit tests prove send/receive behavior without a real QLC+ instance.
- WebSocket client errors are explicit and actionable.
- Existing OSC path remains unchanged.

## Phase 2 - Runtime Widget Discovery For QLC+ 4 And QLC+ 5

Purpose: replace `widgets.json` as source of truth, while proving the discovery mechanism across QLC+ versions.

Important compatibility rule:

- First verify whether QLC+ 4 responds to `GET /vc.json`.
- If QLC+ 4 supports `/vc.json`, implement `/vc.json` as the single discovery mechanism.
- If QLC+ 4 does not support `/vc.json`, implement both:
  - `/vc.json` discovery for QLC+ 5 and future QLC+ versions;
  - WebSocket `QLC+API|getWidgetsList` fallback for QLC+ 4.

Tasks:

- Add an inventory model containing:
  - widget ID;
  - caption;
  - normalized caption;
  - widget type when available;
  - current value/status when requested;
  - slider range when available;
  - button/action metadata when available.
- Implement caption normalization:
  - case-insensitive;
  - ignore common separators such as spaces, `_`, and `-`;
  - no fuzzy matching in this phase.
- Implement duplicate detection after normalization.
- Implement missing-widget errors with available nearby/contextual inventory details.
- Implement rediscovery method for reconnect/project reload.

`/vc.json` path:

- Fetch `http://host:port/vc.json`.
- Parse the Virtual Console layout recursively.
- Prefer language-independent fields such as `typeId` when available.
- Extract button and slider metadata from the richer JSON payload.

Fallback `getWidgetsList` path:

- Open `ws://host:port/qlcplusWS`.
- Send `QLC+API|getWidgetsList`.
- Parse flat `id|caption` pairs.
- Optionally call `QLC+API|getWidgetType|<id>` for each candidate when type filtering is needed.
- Use direct widget commands such as `<id>|255`, `<id>|0`, `<id>|NEXT`.

Validation:

- Manual test against QLC+ 4:
  - confirm whether `/vc.json` exists;
  - confirm `getWidgetsList` behavior if `/vc.json` is absent.
- Manual test against QLC+ 5 or documented fixture:
  - confirm `/vc.json` parsing.
- Unit tests:
  - nested `/vc.json` inventory;
  - flat `getWidgetsList` inventory;
  - case-insensitive lookup;
  - separator-insensitive lookup;
  - duplicate caption collision;
  - missing caption failure.

## Phase 3 - Transport Abstraction

Purpose: avoid coupling MCP tools directly to OSC or WebSocket details.

Tasks:

- Define a common QLC transport interface:
  - `listWidgets()`
  - `resolveWidget(captionOrName)`
  - `pressButton(captionOrName)`
  - `setSlider(captionOrName, value)`
  - `cueListNext(captionOrName)`
  - `cueListPrevious(captionOrName)`
  - `getWidgetState(captionOrName)`
  - direct DMX/global controls where supported
- Implement `OscQlcTransport` using the current code.
- Implement `WebSocketQlcTransport` using runtime discovery.
- Keep existing MCP tool signatures stable.

Validation:

- Existing tools pass through `OscQlcTransport` unchanged.
- New tests prove the same high-level calls route correctly through fake WebSocket transport.

## Phase 4 - WebSocket Tool Migration

Purpose: make WebSocket usable by real MCP calls while OSC remains available.

Tasks:

- Route tools through the common transport interface.
- Update `qlc_list_widgets` to return runtime WebSocket inventory when selected.
- Update button tools to resolve by caption and send direct widget values.
- Update slider tools to resolve by caption and send mapped values.
- Update cue list tools to send `NEXT`, `PREV`, `PLAY`, or `STEP` commands by widget ID.
- Update state tools to use `QLC+API|getWidgetStatus|<id>` where applicable.

Validation:

- With QLC+ launched using web access, asking for a caption such as `Rouge` triggers the matching widget.
- Matching works for casing variants like `rouge`, `ROUGE`, `RoUge`.
- Missing and ambiguous captions fail loudly.
- OSC mode still works.

## Phase 5 - Make `widgets.json` Optional

Purpose: stop relying on a maintained static mapping.

Tasks:

- Do not load `widgets.json` when `QLC_CONTROL_TRANSPORT=websocket`.
- Allow server startup without `config/widgets.json` in WebSocket mode.
- Keep QXW generation command as legacy/offline diagnostic tooling.
- Update docs to explain runtime discovery.

Validation:

- Temporarily rename or remove `config/widgets.json`.
- Start the MCP in WebSocket mode.
- List and trigger widgets from QLC+ runtime inventory.

## Phase 6 - WebSocket As Default, OSC As Legacy

Purpose: move the project to the intended long-term transport.

Tasks:

- Set WebSocket as recommended/default transport.
- Document QLC+ startup:
  - QLC+ 4: `qlcplus -w`
  - QLC+ 5: `qlcplus -w -wp 9999` where supported by installed version
- Keep OSC documented as legacy/fallback.
- Add troubleshooting for:
  - QLC+ web interface disabled;
  - wrong host/port;
  - authentication;
  - duplicate captions;
  - unsupported widget types.

Validation:

- Fresh setup works without OSC enabled in QLC+.
- README path for new users uses WebSocket.
- Legacy OSC path is still available through configuration.

## Phase 7 - Optional OSC Removal

Purpose: remove OSC only after WebSocket has been proven in real use.

Tasks:

- Decide whether OSC still has value as a fallback.
- If removing:
  - remove OSC client;
  - remove raw OSC tool;
  - remove OSC-specific config;
  - remove `widgets.json` runtime dependency;
  - update docs and tests.
- If keeping:
  - mark OSC as maintenance-only.

Validation:

- Complete test suite passes.
- Real QLC+ 4/5 WebSocket validation is complete.
- No normal workflow requires `widgets.json`.

## Open Questions

- Does the target QLC+ 4 build expose `GET /vc.json`?
- Which exact QLC+ 4 and QLC+ 5 versions must be supported in production?
- Should WebSocket auth (`-wa`) be supported in the first WebSocket release or after the basic migration?
- Should direct DMX channel tools use `CH|<absoluteAddress>|<value>` in WebSocket mode, or should they remain OSC-only until separately validated?
- Should the QXW parser remain as an offline inspection tool after runtime discovery replaces `widgets.json`?
