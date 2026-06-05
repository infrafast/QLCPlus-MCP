import { type ToolDefinition, MCPServer } from "mcp-use/server";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { registerAgentPrompt } from "../agentPrompt.js";

function getConnectableHost(host: string): string {
  if (host === "0.0.0.0" || host === "::") {
    return "127.0.0.1";
  }
  return host;
}

export async function startHttpServer(
  config: Config,
  tools: ToolDefinition[]
): Promise<void> {
  const logger = getLogger();

  logger.info("Starting MCP server in HTTP mode");
  logger.debug({ tools: tools.map((t) => t.name) }, "Tools registered");

  const server = new MCPServer({
    name: "qlcplus-mcp",
    version: "1.0.0",
    host: config.httpHost,
    description: "QLC+ MCP server for HTTP transport",
  });

  tools.forEach((tool) => {
    server.tool(tool);
  });
  registerAgentPrompt(server);

  if (config.authMode === "bearer") {
    server.app.use("*", async (c, next) => {
      if (c.req.path === "/health") {
        return await next();
      }

      const authHeader = c.req.header("authorization") || "";
      if (!authHeader.startsWith("Bearer ")) {
        return c.json({ error: "Missing or invalid authorization" }, 401);
      }

      const token = authHeader.slice(7);
      if (token !== config.authToken) {
        return c.json({ error: "Invalid token" }, 403);
      }

      return await next();
    });
  }

  server.app.get("/health", (c) =>
    c.json({
      status: "ok",
      service: "qlcplus-mcp",
      version: "1.0.0",
      transport: "http",
      uptime: process.uptime(),
    })
  );

  await server.listen(config.httpPort);

  const connectableHost = getConnectableHost(config.httpHost);
  const mcpUrl =
    "http://" + connectableHost + ":" + config.httpPort + config.httpMcpPath;
  const healthUrl = "http://" + connectableHost + ":" + config.httpPort + "/health";
  const agentConfig = {
    mcpServers: {
      qlcplus: {
        type: "streamable-http",
        url: mcpUrl,
        headers:
          config.authMode === "bearer" && config.authToken
            ? { Authorization: "Bearer " + config.authToken }
            : {},
        assistantOptions: {
          routing:
            "qlc,qlcplus,lumière,light,éclairage,scène,dmx,fixture,projecteur,couleur",
        },
      },
    },
  };

  logger.info(
    "MCP server listening on http://" +
      config.httpHost +
      ":" +
      config.httpPort +
      config.httpMcpPath
  );
  logger.info("Health endpoint: http://" + config.httpHost + ":" + config.httpPort + "/health");
  logger.info("Agent MCP URL: " + mcpUrl);
  logger.info("Agent health URL: " + healthUrl);
  if (config.authMode === "bearer") {
    logger.info("Bearer token authentication enabled");
  } else {
    logger.info("HTTP auth: disabled");
  }
  logger.info("Agent HTTP MCP config:");
  logger.info(JSON.stringify(agentConfig, null, 2));
}
