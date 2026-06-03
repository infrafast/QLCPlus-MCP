import { type ToolDefinition, MCPServer } from "mcp-use/server";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";

export async function startHttpServer(
  config: Config,
  tools: ToolDefinition[]
): Promise<void> {
  const logger = getLogger();

  logger.info("Starting MCP server in HTTP mode");
  logger.debug("Tools registered:", tools.map((t) => t.name));

  const server = new MCPServer({
    name: "qlcplus-mcp",
    version: "1.0.0",
    host: config.httpHost,
    description: "QLC+ MCP server for HTTP transport",
  });

  tools.forEach((tool) => {
    server.tool(tool);
  });

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

  logger.info(
    `MCP server listening on http://${config.httpHost}:${config.httpPort}${config.httpMcpPath}`
  );
  logger.info(`Health endpoint: http://${config.httpHost}:${config.httpPort}/health`);
  if (config.authMode === "bearer") {
    logger.info("Bearer token authentication enabled");
  }
}
