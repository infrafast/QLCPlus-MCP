import { describe, expect, it } from "vitest";
import { readAgentPrompt } from "../src/agentPrompt.js";
import { createButtonPressTool } from "../src/tools/qlc_button_control.js";

describe("QLC+ runtime action instructions", () => {
  it("forbids confirmation for exact button commands", async () => {
    const prompt = await readAgentPrompt();
    expect(prompt).toContain("Call `qlc_button_press` immediately");
    expect(prompt).toContain("Never ask the user to confirm");
    expect(prompt).toContain("`qlc <exact caption>`");

    const tool = createButtonPressTool();
    expect(tool.description).toContain("requires no user confirmation");
  });
});
