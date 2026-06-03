import { createServer } from "mcp-use";
import { getLogger } from "./logger.js";
import { Config } from "./config.js";
import { Tool } from "mcp-use";

export async function startStdioServer(
  config: Config,
  tools: Tool[]
): Promise<void> {
  const logger = getLogger();

  logger.info("Starting MCP server in STDIO mode");
  logger.debug("Tools registered:", tools.map((t) => t.name));

  const server = createServer(
    {
      name: "qlcplus-mcp",
      version: "1.0.0",
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
    },
    {
      tools: tools,
    }
  );

  // Handle server lifecycle
  server.on("error", (error) => {
    logger.error("MCP server error:", error);
    process.exit(1);
  });

  logger.info("MCP server ready on STDIO");

  // Start the server
  await server.connect({
    transport: "stdio",
  });
}
