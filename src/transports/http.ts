import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { createQlcMcpServer, resourceSummaries, toolSummaries } from "../mcpServer.js";
import type { ToolDefinition } from "../mcpCompat.js";

function getConnectableHost(host: string): string {
  if (host === "0.0.0.0" || host === "::") {
    return "127.0.0.1";
  }
  return host;
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendHtml(res: ServerResponse, body: string): void {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function isAuthorized(req: IncomingMessage, config: Config): boolean {
  if (config.authMode !== "bearer") {
    return true;
  }

  const authorization = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  return Boolean(config.authToken && token === config.authToken);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return undefined;
  }
  return JSON.parse(raw);
}

function renderAdminPage(config: Config, tools: ToolDefinition[]): string {
  const connectableHost = getConnectableHost(config.httpHost);
  const mcpUrl = "http://" + connectableHost + ":" + config.httpPort + config.httpMcpPath;
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

  const toolItems = toolSummaries(tools)
    .map((tool) => `<li><strong>${tool.name}</strong><br>${tool.description || ""}</li>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>QLCPlus MCP</title>
  <style>body{font:15px/1.45 system-ui,sans-serif;margin:32px;max-width:960px}pre{background:#111;color:#eee;padding:14px;border-radius:6px;overflow:auto}li{margin:0 0 12px}</style>
</head>
<body>
  <h1>QLCPlus MCP</h1>
  <p>Runtime QLC+ lighting MCP endpoint.</p>
  <h2>Endpoints</h2>
  <pre>${mcpUrl}
http://${connectableHost}:${config.httpPort}/health</pre>
  <h2>Agent HTTP Config</h2>
  <pre>${JSON.stringify(agentConfig, null, 2)}</pre>
  <h2>Tools</h2>
  <ul>${toolItems}</ul>
</body>
</html>`;
}

export async function startHttpServer(
  config: Config,
  tools: ToolDefinition[]
): Promise<void> {
  const logger = getLogger();
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  logger.info("Starting MCP server in HTTP mode");
  logger.debug({ tools: tools.map((t) => t.name) }, "Tools registered");

  const httpServer = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");

      if (url.pathname === "/health") {
        sendJson(res, 200, {
          status: "ok",
          service: "qlcplus-mcp",
          version: "1.0.0",
          transport: "http",
          uptime: process.uptime(),
        });
        return;
      }

      if (!isAuthorized(req, config)) {
        sendJson(res, 401, { error: "Missing or invalid authorization" });
        return;
      }

      if (url.pathname === "/mcp/tools" && req.method === "GET") {
        sendJson(res, 200, { tools: toolSummaries(tools) });
        return;
      }

      if (url.pathname === "/mcp/resources" && req.method === "GET") {
        sendJson(res, 200, { resources: resourceSummaries() });
        return;
      }

      if (url.pathname !== config.httpMcpPath) {
        sendJson(res, 404, { error: "Not found" });
        return;
      }

      if (req.method === "GET" && !req.headers["mcp-session-id"]) {
        const accept = Array.isArray(req.headers.accept)
          ? req.headers.accept.join(",")
          : req.headers.accept || "";
        if (!accept || accept.includes("text/html") || accept.includes("*/*")) {
          sendHtml(res, renderAdminPage(config, tools));
          return;
        }
      }

      const sessionId = Array.isArray(req.headers["mcp-session-id"])
        ? req.headers["mcp-session-id"][0]
        : req.headers["mcp-session-id"];
      let parsedBody: unknown = undefined;
      if (req.method === "POST") {
        parsedBody = await readJsonBody(req);
      }

      let transport = sessionId ? transports[sessionId] : undefined;
      if (!transport) {
        if (!sessionId && isInitializeRequest(parsedBody)) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
              transports[sid] = transport!;
            },
          });

          transport.onclose = () => {
            if (transport?.sessionId) {
              delete transports[transport.sessionId];
            }
          };

          transport.onerror = (error) => {
            logger.error({ err: error }, "HTTP MCP transport error");
          };

          const mcpServer = createQlcMcpServer(tools);
          await mcpServer.connect(transport);
        } else {
          sendJson(res, 400, { error: "Bad Request: missing or invalid MCP session" });
          return;
        }
      }

      await transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      logger.error({ err: error }, "HTTP request failed");
      if (!res.headersSent) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
      } else {
        res.end();
      }
    }
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(config.httpPort, config.httpHost, resolve);
  });

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
