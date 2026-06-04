import { describe, expect, it } from "vitest";
import {
  ButtonPressInputSchema,
  CueListInputSchema,
  OscSendOptionsSchema,
  SendOscInputSchema,
  SetColorWashInputSchema,
  SetSpeedInputSchema,
  SliderSetInputSchema,
} from "../src/types";
import { GetStateInputSchema } from "../src/tools/qlc_get_state";
import { ListWidgetsInputSchema } from "../src/tools/qlc_list_widgets";

describe("nullable optional tool arguments", () => {
  it("treats null as absent for optional widget tool fields", () => {
    expect(ButtonPressInputSchema.safeParse({ widgetName: "BLACK", oscPath: null, duration: null }).success).toBe(true);
    expect(CueListInputSchema.safeParse({ widgetName: "intro", oscPath: null }).success).toBe(true);
    expect(SliderSetInputSchema.safeParse({ widgetName: "master", oscPath: null, value: 0.5 }).success).toBe(true);
    expect(SetSpeedInputSchema.safeParse({ widgetName: "chase", oscPath: null, bpm: 120 }).success).toBe(true);
  });

  it("treats null as absent for optional diagnostic and discovery fields", () => {
    expect(GetStateInputSchema.safeParse({ freshnessSeconds: null }).success).toBe(true);
    expect(ListWidgetsInputSchema.safeParse({ type: null, query: null, limit: null }).success).toBe(true);
  });

  it("treats null as absent for optional OSC and color wash fields", () => {
    expect(OscSendOptionsSchema.safeParse({ dryRun: null, timeout: null }).success).toBe(true);
    expect(SendOscInputSchema.safeParse({ path: "/black", args: [1], dryRun: null }).success).toBe(true);
    expect(SetColorWashInputSchema.safeParse({
      color: "red",
      universe: null,
      redChannel: null,
      greenChannel: null,
      blueChannel: null,
    }).success).toBe(true);
  });
});
