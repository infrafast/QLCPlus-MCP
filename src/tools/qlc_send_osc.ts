import { error, text, type ToolDefinition } from "mcp-use/server";
import { sendOsc, validateOscPath } from "../osc/oscClient.js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { SendOscInputSchema } from "../types.js";

export function createSendOscTool(config: Config): ToolDefinition {
  const logger = getLogger();

  return {
    name: "qlc_send_osc",
    description:
      "Send arbitrary OSC messages to QLC+. This is a low-level tool - prefer mapped widgets through qlc_button_press when available. This tool is disabled if QLC_ALLOW_RAW_OSC=false.",
    schema: SendOscInputSchema,
    cb: async (input: any) => {
      logger.debug("Tool: qlc_send_osc", input);

      // Check if raw OSC is allowed
      if (!config.qlcAllowRawOsc) {
        return error(
          "Raw OSC sending is disabled. Set QLC_ALLOW_RAW_OSC=true to enable this tool."
        );
      }

      const { path, args, dryRun } = input;

      // Validate OSC path
      if (!validateOscPath(path)) {
        return error(
          `Invalid OSC path: "${path}". Paths must start with / and contain only alphanumeric characters, hyphens, dots, and slashes.`
        );
      }

      try {
        const result = await sendOsc(
          { path, args: args || [] },
          { dryRun: dryRun ?? config.qlcDryRun },
          config
        );

        return text(result.message);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to send OSC: ${message}`);
        return error(`Failed to send OSC: ${message}`);
      }
    },
  };
}
