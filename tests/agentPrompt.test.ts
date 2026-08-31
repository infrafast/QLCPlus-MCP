import { describe, expect, it } from "vitest";
import { readAgentPrompt } from "../src/agentPrompt.js";
import { createButtonPressTool } from "../src/tools/qlc_button_control.js";

describe("QLC+ runtime agent policy", () => {
  it("keeps verify-then-execute routing behavior in PROMPT.md", async () => {
    const prompt = await readAgentPrompt();
    expect(prompt).toContain("button-execution request");
    expect(prompt).toContain("requested complete widget caption is everything after `qlc`");
    expect(prompt).toContain("verify it against the current native Virtual Console inventory with `qlc_list_widgets`");
    expect(prompt).toContain("exact match to the requested complete caption");
    expect(prompt).toContain("immediately call `qlc_button_press`");
    expect(prompt).toContain("do not ask for confirmation");
    expect(prompt).toContain("do not press any widget and do not substitute another caption");
    expect(prompt).toContain("`blue speed`, `blue_speed`, and `bluespeed`");
  });
});

describe("qlc_button_press MCP contract", () => {
  it("documents technical matching semantics without agent behavior policy", () => {
    const tool = createButtonPressTool();
    expect(tool.description).toContain("Press a QLC+ 5 Virtual Console button");
    expect(tool.description).toContain("Matching ignores case only");
    expect(tool.description).toContain("internal spaces");
    expect(tool.description).not.toContain("Immediately");
    expect(tool.description?.toLowerCase()).not.toContain("confirmation");
  });
});
