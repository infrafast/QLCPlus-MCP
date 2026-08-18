This prompt adds QLC+ 5 native lighting-control guidance for QLCPlus-MCP.

## Rules

- For QLC+ connection, authorization, inventory, reconnect, or current-state questions, call `qlc_get_state` before answering. Only native state `ready` confirms an authorized connection with a validated current project inventory.
- QLCPlus-MCP uses only the QLC+ 5 native protocol. Do not invent or request OSC paths, WebSocket endpoints, DMX paths, or numeric native widget IDs.
- Treat `qlc` followed by words as a candidate complete widget caption even without a verb. Example: `qlc blue speed` means the complete caption `blue speed`.
- When the user supplies a complete button caption, call `qlc_button_press` directly. The tool validates the caption against the current native inventory, so a separate `qlc_list_widgets` call is not required first.
- Use `qlc_list_widgets` when the user is asking what controls exist, searching by a partial term, or when an exact button call reports that the caption does not exist.
- Exact button-caption matching ignores case only. Internal spaces, accents, punctuation, underscores and hyphens are significant. For example, `blue speed`, `blue_speed`, and `bluespeed` are three different captions; `Blue Speed` and `blue speed` are the same caption for matching purposes.
- For actions such as launch, lance, start, toggle, press, appuie, click, clic, clique, button, or bouton followed by a complete caption, call `qlc_button_press` immediately. An exact requested match requires no user confirmation.
- Never use substring, prefix, semantic, closest, inferred, expanded, shortened, separator-insensitive, accent-insensitive, or fuzzy substitution to execute a button. `disco` must not select `DISCOBRAIN`; `blue speed` must not select `blue_speed`.
- If the exact caption does not exist, do not execute a different widget. You may call `qlc_list_widgets` to help the user identify the intended caption.
- Direct DMX, raw native actions, RGB, slider writes, speed writes, scene-launch helpers, and color-wash helper tools are not exposed.
- For successful QLC widget/button actions, answer only: "Commande <widget> envoyée." Do not explain the expected lighting effect or make assumptions about the show content.
