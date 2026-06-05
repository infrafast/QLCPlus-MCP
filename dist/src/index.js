import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";
import { createAgentPromptTool } from "./agentPrompt.js";
import { initLogger, getLogger } from "./logger.js";
import { initOsc } from "./osc/oscClient.js";
import { loadWidgetConfig } from "./qlc/widgetResolver.js";
import { startStdioServer } from "./transports/stdio.js";
import { startHttpServer } from "./transports/http.js";
// Tools
import { createSendOscTool } from "./tools/qlc_send_osc.js";
import { createGetStateTool } from "./tools/qlc_get_state.js";
import { createListWidgetsTool } from "./tools/qlc_list_widgets.js";
import { createButtonPressTool } from "./tools/qlc_button_control.js";
function loadRuntimeEnv() {
    const candidates = [
        process.env.QLCPLUS_MCP_ENV_FILE,
        "/config/.env",
        "config/.env",
        ".env",
    ].filter(Boolean);
    for (const candidate of candidates) {
        const envPath = path.resolve(candidate);
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
            if (envPath === "/config/.env" &&
                process.env.QLC_WIDGETS_FILE === "config/widgets.json") {
                process.env.QLC_WIDGETS_FILE = "/config/widgets.json";
            }
            return envPath;
        }
    }
    dotenv.config();
    return undefined;
}
const runtimeEnvFile = loadRuntimeEnv();
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
        logger.info(runtimeEnvFile
            ? `Runtime env file: ${runtimeEnvFile}`
            : "Runtime env file: default dotenv lookup");
        // Initialize OSC
        logger.info("Initializing OSC client...");
        await initOsc(config);
        // Load widget configuration
        logger.info("Loading widget configuration...");
        await loadWidgetConfig(config.qlcWidgetsFile);
        // Create tools
        logger.info("Registering MCP tools...");
        const tools = [
            createAgentPromptTool(),
            createGetStateTool(),
            createListWidgetsTool(),
            createSendOscTool(config),
            createButtonPressTool(config),
        ];
        logger.info(`Registered ${tools.length} tools`);
        // Start appropriate transport
        if (config.transport === "http") {
            await startHttpServer(config, tools);
        }
        else {
            await startStdioServer(config, tools);
        }
    }
    catch (error) {
        const logger = getLogger();
        if (error instanceof Error) {
            logger.fatal({ err: error }, "Failed to start server");
        }
        else {
            logger.fatal({ err: String(error) }, "Failed to start server");
        }
        process.exit(1);
    }
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map