import { MCPServer } from "mcp-use/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListResourceTemplatesRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { registerAgentPrompt } from "../agentPrompt.js";
import type { ToolDefinition } from "mcp-use/server";

export async function startStdioServer(
  config: Config,
  tools: ToolDefinition[]
): Promise<void> {
  const logger = getLogger();

  logger.info("Starting MCP server in STDIO mode");
  logger.debug("Tools registered:", tools.map((t) => t.name));

  const server = new MCPServer({
    name: "qlcplus-mcp",
    version: "1.0.0",
    description: "QLC+ MCP server for STDIO transport",
  });

  tools.forEach((tool) => {
    server.tool(tool);
  });
  registerAgentPrompt(server);

  // mcp_use may ask for resource templates during startup. This server exposes
  // one static prompt resource but no templates, so return an empty list.
  const nativeSdkServer = (server.nativeServer as any).server;
  nativeSdkServer.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [],
  }));

  const transport = new StdioServerTransport();
  transport.onclose = () => {
    logger.info("STDIO transport closed");
  };
  transport.onerror = (error) => {
    logger.error("STDIO transport error:", error.message);
    process.exit(1);
  };

  await server.nativeServer.connect(transport);

  logger.info("MCP server ready on STDIO");
}
