import { Tool } from "mcp-use";
import { sendOsc, validateOscPath } from "../osc/oscClient.js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { SendOscInputSchema } from "../types.js";

export function createSendOscTool(config: Config): Tool {
  const logger = getLogger();

  return {
    name: "qlc_send_osc",
    description:
      "Send arbitrary OSC messages to QLC+. This is a low-level tool - prefer specific tools (qlc_set_dmx_channel, etc.) when available. This tool is disabled if QLC_ALLOW_RAW_OSC=false.",
    inputSchema: SendOscInputSchema,
    handler: async (input: any) => {
      logger.debug("Tool: qlc_send_osc", input);

      // Check if raw OSC is allowed
      if (!config.qlcAllowRawOsc) {
        return {
          success: false,
          error:
            "Raw OSC sending is disabled. Set QLC_ALLOW_RAW_OSC=true to enable this tool.",
          hint: "Use specific tools like qlc_set_dmx_channel for safer control.",
        };
      }

      const { path, args, dryRun } = input;

      // Validate OSC path
      if (!validateOscPath(path)) {
        return {
          success: false,
          error: `Invalid OSC path: "${path}". Paths must start with / and contain only alphanumeric characters, hyphens, dots, and slashes.`,
        };
      }

      try {
        const result = await sendOsc(
          { path, args: args || [] },
          { dryRun: dryRun ?? config.qlcDryRun },
          config
        );

        return {
          success: result.success,
          message: result.message,
          path: path,
          args: args || [],
          dryRun: result.dryRun,
        };
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to send OSC: ${err}`);
        return {
          success: false,
          error: `Failed to send OSC: ${err}`,
        };
      }
    },
  };
}
