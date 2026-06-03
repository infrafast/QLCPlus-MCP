import { Tool } from "mcp-use";
import { sendOscBatch, validateDmxPath, normalizeDmxValue } from "../osc/oscClient.js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { SetDmxRgbInputSchema } from "../types.js";

export function createSetDmxRgbTool(config: Config): Tool {
  const logger = getLogger();

  return {
    name: "qlc_set_dmx_rgb",
    description:
      "Set RGB color values on DMX channels. Sends three consecutive OSC messages to set red, green, and blue channels.",
    inputSchema: SetDmxRgbInputSchema,
    handler: async (input: any) => {
      logger.debug("Tool: qlc_set_dmx_rgb", input);

      const {
        universe,
        redChannel,
        greenChannel,
        blueChannel,
        r,
        g,
        b,
      } = input;

      try {
        // Validate all three channels
        const rPath = validateDmxPath(universe, redChannel);
        const gPath = validateDmxPath(universe, greenChannel);
        const bPath = validateDmxPath(universe, blueChannel);

        if (!rPath.valid || !gPath.valid || !bPath.valid) {
          return {
            success: false,
            error: `Invalid DMX coordinates. Universe must be >= 1, channels must be >= 1.`,
          };
        }

        // Create OSC messages
        const messages = [
          { path: rPath.path, args: [r] },
          { path: gPath.path, args: [g] },
          { path: bPath.path, args: [b] },
        ];

        // Send batch
        const results = await sendOscBatch(
          messages,
          { dryRun: config.qlcDryRun },
          config
        );

        const allSuccess = results.every((r) => r.success);

        return {
          success: allSuccess,
          message: `RGB color set: R=${r}, G=${g}, B=${b}`,
          channels: {
            red: { channel: redChannel, value: r, path: rPath.path },
            green: { channel: greenChannel, value: g, path: gPath.path },
            blue: { channel: blueChannel, value: b, path: bPath.path },
          },
          dryRun: config.qlcDryRun,
        };
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to set RGB color: ${err}`);
        return {
          success: false,
          error: `Failed to set RGB color: ${err}`,
        };
      }
    },
  };
}
