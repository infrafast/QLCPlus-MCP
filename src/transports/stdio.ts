import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { createQlcMcpServer } from "../mcpServer.js";
import type { ToolDefinition } from "../mcpCompat.js";

export async function startStdioServer(
  config: Config,
  tools: ToolDefinition[]
): Promise<void> {
  const logger = getLogger();

  logger.info("Starting MCP server in STDIO mode");
  logger.debug({ tools: tools.map((t) => t.name) }, "Tools registered");

  const server = createQlcMcpServer(tools);
  const transport = new StdioServerTransport();
  transport.onclose = () => {
    logger.info("STDIO transport closed");
  };
  transport.onerror = (error) => {
    logger.error({ err: error }, "STDIO transport error");
    process.exit(1);
  };

  await server.connect(transport);

  logger.info("MCP server ready on STDIO");
}
