import "dotenv/config";
import { loadConfig } from "./config.js";
import { initLogger, getLogger } from "./logger.js";
import { initOsc } from "./osc/oscClient.js";
import { loadWidgetConfig } from "./qlc/widgetResolver.js";
import { startStdioServer } from "./transports/stdio.js";
import { startHttpServer } from "./transports/http.js";

// Tools
import { createSetDmxChannelTool } from "./tools/qlc_set_dmx_channel.js";
import { createSetDmxRgbTool } from "./tools/qlc_set_dmx_rgb.js";
import { createSendOscTool } from "./tools/qlc_send_osc.js";
import {
  createButtonPressTool,
  createButtonToggleTool,
} from "./tools/qlc_button_control.js";
import {
  createSliderSetTool,
  createSpeedSetTool,
} from "./tools/qlc_slider_speed.js";
import {
  createCueListNextTool,
  createCueListPreviousTool,
  createLaunchSceneTool,
} from "./tools/qlc_cuelist_scene.js";
import {
  createSetMasterTool,
  createBlackoutTool,
  createPanicTool,
  createSetColorWashTool,
} from "./tools/qlc_special.js";
import type { ToolDefinition } from "mcp-use/server";

async function main() {
  try {
    // Load config
    const config = loadConfig();

    // Initialize logger
    const logger = initLogger(config);

    logger.info("=== QLCPlus-MCP Server Starting ===");
    logger.info(`Transport: ${config.transport}`);
    logger.info(`QLC+ Host: ${config.qlcHost}`);
    logger.info(`Log Level: ${config.logLevel}`);

    // Initialize OSC
    logger.info("Initializing OSC client...");
    await initOsc(config);

    // Load widget configuration
    logger.info("Loading widget configuration...");
    await loadWidgetConfig(config.qlcWidgetsFile);

    // Create tools
    logger.info("Registering MCP tools...");
    const tools: ToolDefinition[] = [
      // DMX/OSC tools
      createSetDmxChannelTool(config),
      createSetDmxRgbTool(config),
      createSendOscTool(config),

      // Button controls
      createButtonPressTool(config),
      createButtonToggleTool(config),

      // Sliders and speed
      createSliderSetTool(config),
      createSpeedSetTool(config),

      // Cue lists and scenes
      createCueListNextTool(config),
      createCueListPreviousTool(config),
      createLaunchSceneTool(config),

      // Special functions
      createSetMasterTool(config),
      createBlackoutTool(config),
      createPanicTool(config),
      createSetColorWashTool(config),
    ];

    logger.info(`Registered ${tools.length} tools`);

    // Start appropriate transport
    if (config.transport === "http") {
      await startHttpServer(config, tools);
    } else {
      await startStdioServer(config, tools);
    }
  } catch (error) {
    const logger = getLogger();
    const err = error instanceof Error ? error.message : String(error);
    logger.fatal("Failed to start server:", err);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
