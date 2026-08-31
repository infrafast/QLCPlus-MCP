import { describe, expect, it } from "vitest";
import { readAgentPrompt } from "../src/agentPrompt.js";
import { createButtonPressTool } from "../src/tools/qlc_button_control.js";

describe("QLC+ runtime agent policy", () => {
  it("keeps command-routing behavior in PROMPT.md", async () => {
    const prompt = await readAgentPrompt();
    expect(prompt).toContain("direct button-execution request");
    expect(prompt).toContain("complete widget caption is everything after `qlc`");
    expect(prompt).toContain("call `qlc_button_press` directly");
    expect(prompt).toContain("Do not call `qlc_list_widgets` merely to verify a complete caption");
    expect(prompt).toContain("returns the exact requested button caption");
    expect(prompt).toContain("Do not ask the user for confirmation");
    expect(prompt).toContain("`blue speed`, `blue_speed`, and `bluespeed`");
    expect(prompt).toContain("requires no user confirmation");
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
