import { error, text, type ToolDefinition } from "mcp-use/server";
import { sendOsc, validateDmxPath, normalizeDmxValue } from "../osc/oscClient.js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { SetDmxChannelInputSchema } from "../types.js";

export function createSetDmxChannelTool(config: Config): ToolDefinition {
  const logger = getLogger();

  return {
    name: "qlc_set_dmx_channel",
    description:
      "Set a specific DMX channel value in QLC+ through OSC. Supports both 0-255 and 0-1 normalized ranges.",
    schema: SetDmxChannelInputSchema,
    cb: async (input: any) => {
      logger.debug("Tool: qlc_set_dmx_channel", input);

      const { universe, channel, value } = input;

      // Validate DMX path
      const { valid, path } = validateDmxPath(universe, channel);
      if (!valid) {
        return error(`Invalid DMX coordinates: universe=${universe}, channel=${channel}. Both must be >= 1.`);
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

        return text(`DMX set: Universe ${universe}, Channel ${channel} = ${normalizedValue}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to set DMX channel: ${message}`);
        return error(`Failed to set DMX channel: ${message}`);
      }
    },
  };
}
