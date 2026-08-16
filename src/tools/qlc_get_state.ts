import { z } from "zod";
import { text, type ToolDefinition } from "../mcpCompat.js";
import { getLogger } from "../logger.js";
import { getOscRuntimeState } from "../osc/oscClient.js";
import { optionalInt } from "../types.js";
import { getNativeRuntimeState } from "../qlc/nativeClient.js";

export const GetStateInputSchema = z.object({
  freshnessSeconds: optionalInt(z.number().int().min(1).max(300)).describe(
    "How recent QLC+ feedback must be to count as live, in seconds.",
  ),
});

export function createGetStateTool(): ToolDefinition {
  const logger = getLogger();

  return {
    name: "qlc_get_state",
    description:
      "Report QLC+ native connection lifecycle and the temporary OSC rollback state. Native readiness requires authorization and a validated current project inventory.",
    schema: GetStateInputSchema,
    cb: async (input: any) => {
      logger.debug("Tool: qlc_get_state", input);

      const freshnessSeconds = input?.freshnessSeconds ?? 10;
      const state = getOscRuntimeState(freshnessSeconds);
      const native = getNativeRuntimeState();
      const feedbackStatus = state.feedbackSeenRecently
        ? `recent feedback received at ${state.lastFeedbackAt}`
        : state.feedbackListening
          ? `feedback listener is active, but no QLC+ feedback was received in the last ${freshnessSeconds} seconds`
          : `feedback listener is not active${state.lastFeedbackError ? `: ${state.lastFeedbackError}` : ""}`;

      const nativeSummary = native?.enabled
        ? `QLC+ native state is ${native.state}${native.ready ? ` with ${native.widgetCount} discovered widgets` : ""}.`
        : "QLC+ native migration client is disabled.";
      const oscSummary = state.initialized
        ? `Temporary OSC rollback client initialized for ${state.commandSendHost}:${state.commandSendPort}; ${feedbackStatus}.`
        : `Temporary OSC rollback client is not initialized; ${feedbackStatus}.`;

      return text(`${nativeSummary} ${oscSummary}

${JSON.stringify({ native, osc: state }, null, 2)}`);
    },
  };
}
