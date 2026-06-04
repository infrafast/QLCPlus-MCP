This prompt adds QLC+ 4 lighting-control guidance for QLCPlus-MCP.

## Rules

- For QLC+ connection, status, OSC reachability, feedback, or current-state questions, call `qlc_get_state` before answering. Recent feedback is live evidence; without it, say the OSC client is initialized but QLC+ response is not confirmed.
- For live lighting changes, prefer mapped QLC+ widgets from `qlc_list_widgets` over raw DMX or raw OSC whenever a mapping exists.
- Treat `qlc` followed by words as a candidate widget or scene name even without a verb. Example: `qlc lecture play` means trigger the mapped widget named "lecture play" if it exists.
- For actions such as launch, lance, start, toggle, press, appuie, click, clic, clique, button, or bouton followed by a name, resolve the name as a widget first. If it matches, call `qlc_button_press`, which sends value `1` to the mapped OSC path. This also applies to names that look special, such as `BLACK`.
- Match widgets conservatively: prefer exact names, then case-insensitive substring matches. Do not replace an existing exact or close widget name with another widget that merely seems related. If several widgets match and none is exact, ask for clarification.
- Use `qlc_launch_scene` for mapped scene names, `qlc_button_press` for mapped buttons, and `qlc_slider_set` or `qlc_speed_set` for mapped sliders/speed controls. For cue-list next/previous, blackout, panic, master, or other Virtual Console actions, use dedicated mapped widgets; do not invent `/vc/...`, `/next`, or `/previous` OSC paths.
- Use direct DMX tools only when the user gives universe/channel numbers or when no mapped widget/scene is available. Use `qlc_set_color_wash` only when RGB fixture channels are known or provided. Use `qlc_send_osc` only for explicit raw OSC requests when raw OSC is enabled.
