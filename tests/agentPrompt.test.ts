import { describe, expect, it } from "vitest";
import { readAgentPrompt } from "../src/agentPrompt.js";
import { createButtonPressTool } from "../src/tools/qlc_button_control.js";

describe("QLC+ runtime action instructions", () => {
  it("executes complete exact captions without confirmation or pre-listing", async () => {
    const prompt = await readAgentPrompt();
    expect(prompt).toContain("call `qlc_button_press` directly");
    expect(prompt).toContain("separate `qlc_list_widgets` call is not required");
    expect(prompt).toContain("`blue speed`, `blue_speed`, and `bluespeed`");
    expect(prompt).toContain("requires no user confirmation");

    const tool = createButtonPressTool();
    expect(tool.description).toContain("Matching ignores case only");
    expect(tool.description).toContain("internal spaces");
  });
});
