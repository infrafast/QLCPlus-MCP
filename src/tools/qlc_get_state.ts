import { z } from "zod";
import { text, type ToolDefinition } from "mcp-use/server";
import { getLogger } from "../logger.js";
import { getOscRuntimeState } from "../osc/oscClient.js";

const GetStateInputSchema = z.object({
  freshnessSeconds: z
    .number()
    .int()
    .min(1)
    .max(300)
    .optional()
    .describe("How recent QLC+ feedback must be to count as live, in seconds."),
});

export function createGetStateTool(): ToolDefinition {
  const logger = getLogger();

  return {
    name: "qlc_get_state",
    description:
      "Report QLC+ OSC runtime state: configured host/ports, OSC client initialization, last command sent, feedback listener status, and whether QLC+ feedback was received recently. Use this before answering QLC+ connection/status questions.",
    schema: GetStateInputSchema,
    cb: async (input: any) => {
      logger.debug("Tool: qlc_get_state", input);

      const freshnessSeconds = input?.freshnessSeconds ?? 10;
      const state = getOscRuntimeState(freshnessSeconds);
      const feedbackStatus = state.feedbackSeenRecently
        ? `recent feedback received at ${state.lastFeedbackAt}`
        : state.feedbackListening
          ? `feedback listener is active, but no QLC+ feedback was received in the last ${freshnessSeconds} seconds`
          : `feedback listener is not active${state.lastFeedbackError ? `: ${state.lastFeedbackError}` : ""}`;

      const summary = state.initialized
        ? `QLC+ OSC client initialized for ${state.commandSendHost}:${state.commandSendPort}; ${feedbackStatus}.`
        : `QLC+ OSC client is not initialized; ${feedbackStatus}.`;

      return text(`${summary}

${JSON.stringify(state, null, 2)}`);
    },
  };
}
