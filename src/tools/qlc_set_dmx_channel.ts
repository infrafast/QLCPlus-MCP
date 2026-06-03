import { Tool } from "mcp-use";
import { sendOsc, validateDmxPath, normalizeDmxValue } from "../osc/oscClient.js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { SetDmxChannelInputSchema } from "../types.js";

export function createSetDmxChannelTool(config: Config): Tool {
  const logger = getLogger();

  return {
    name: "qlc_set_dmx_channel",
    description:
      "Set a specific DMX channel value in QLC+ through OSC. Supports both 0-255 and 0-1 normalized ranges.",
    inputSchema: SetDmxChannelInputSchema,
    handler: async (input: any) => {
      logger.debug("Tool: qlc_set_dmx_channel", input);

      const { universe, channel, value } = input;

      // Validate DMX path
      const { valid, path } = validateDmxPath(universe, channel);
      if (!valid) {
        return {
          success: false,
          error: `Invalid DMX coordinates: universe=${universe}, channel=${channel}. Both must be >= 1.`,
        };
      }

      try {
        // Normalize value
        const normalizedValue = normalizeDmxValue(value);

        // Send OSC message
        const result = await sendOsc(
          {
            path,
            args: [normalizedValue],
          },
          { dryRun: config.qlcDryRun },
          config
        );

        return {
          success: result.success,
          message: `DMX set: Universe ${universe}, Channel ${channel} = ${normalizedValue}`,
          oscPath: path,
          value: normalizedValue,
          dryRun: result.dryRun,
        };
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to set DMX channel: ${err}`);
        return {
          success: false,
          error: `Failed to set DMX channel: ${err}`,
        };
      }
    },
  };
}
