import express, { Request, Response, NextFunction } from "express";
import { createServer } from "mcp-use";
import { getLogger } from "./logger.js";
import { Config } from "./config.js";
import { Tool } from "mcp-use";

export async function startHttpServer(
  config: Config,
  tools: Tool[]
): Promise<void> {
  const logger = getLogger();

  logger.info("Starting MCP server in HTTP mode");
  logger.debug("Tools registered:", tools.map((t) => t.name));

  const app = express();

  // Middleware
  app.use(express.json());

  // Authentication middleware
  if (config.authMode === "bearer") {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path === "/health") {
        return next();
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid authorization" });
      }

      const token = authHeader.slice(7);
      if (token !== config.authToken) {
        return res.status(403).json({ error: "Invalid token" });
      }

      next();
    });
  }

  // Health check endpoint
  app.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "qlcplus-mcp",
      version: "1.0.0",
      transport: "http",
      uptime: process.uptime(),
    });
  });

  // Create MCP server
  const mcpServer = createServer(
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

  // MCP endpoint
  app.post(config.httpMcpPath, async (req: Request, res: Response) => {
    try {
      logger.debug("MCP request:", req.body);

      // Handle MCP requests
      const response = await mcpServer.handleRequest(req.body);

      res.json(response);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      logger.error("MCP request error:", err);
      res.status(500).json({
        error: "Internal server error",
        message: err,
      });
    }
  });

  // Error handling
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error("Express error:", err.message);
    res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  });

  // Start server
  app.listen(config.httpPort, config.httpHost, () => {
    logger.info(
      `MCP server listening on http://${config.httpHost}:${config.httpPort}${config.httpMcpPath}`
    );
    logger.info(
      `Health endpoint: http://${config.httpHost}:${config.httpPort}/health`
    );
    if (config.authMode === "bearer") {
      logger.info("Bearer token authentication enabled");
    }
  });
}
