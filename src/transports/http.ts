import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { getLogger, getRecentLogLines, subscribeLogLines } from "../logger.js";
import {
  Config,
  persistRuntimeConfig,
  updateRuntimeConfig,
} from "../config.js";
import { closeOsc, getOscRuntimeState, initOsc } from "../osc/oscClient.js";
import { listWidgets } from "../qlc/widgetResolver.js";
import {
  createQlcMcpServer,
  resourceSummaries,
  toolSummaries,
} from "../mcpServer.js";
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
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendHtml(res: ServerResponse, body: string): void {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendLogStream(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store",
    connection: "keep-alive",
  });
  res.write("retry: 2000\n\n");

  const unsubscribe = subscribeLogLines((line) => {
    res.write(`data: ${JSON.stringify(line)}\n\n`);
  });

  req.on("close", unsubscribe);
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

function buildAgentConfig(config: Config): unknown {
  const connectableHost = getConnectableHost(config.httpHost);
  const mcpUrl =
    "http://" + connectableHost + ":" + config.httpPort + config.httpMcpPath;
  return {
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
}

function runtimeConfig(config: Config, envFile: string | undefined): unknown {
  return {
    qlcHost: config.qlcHost,
    qlcOscInputPort: config.qlcOscInputPort,
    qlcOscOutputPort: config.qlcOscOutputPort,
    qlcUniverse: config.qlcUniverse,
    qlcDryRun: config.qlcDryRun,
    qlcWidgetsFile: config.qlcWidgetsFile,
    qlcAllowRawOsc: config.qlcAllowRawOsc,
    logLevel: config.logLevel,
    nodeEnv: config.nodeEnv,
    envFile: envFile || null,
  };
}

function statusPayload(
  config: Config,
  tools: ToolDefinition[],
  envFile: string | undefined,
): unknown {
  return {
    ok: true,
    service: "qlcplus-mcp",
    version: "1.0.0",
    transport: "http",
    uptime: process.uptime(),
    runtimeConfig: runtimeConfig(config, envFile),
    osc: getOscRuntimeState(),
    widgets: {
      count: listWidgets().length,
    },
    resources: resourceSummaries(),
    tools: toolSummaries(tools),
    agentConfig: buildAgentConfig(config),
  };
}

function parseConfigUpdate(
  payload: unknown,
): Partial<
  Pick<
    Config,
    | "qlcHost"
    | "qlcOscInputPort"
    | "qlcOscOutputPort"
    | "qlcUniverse"
    | "qlcDryRun"
  >
> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("JSON object required");
  }
  const value = payload as Record<string, unknown>;
  const update: Partial<
    Pick<
      Config,
      | "qlcHost"
      | "qlcOscInputPort"
      | "qlcOscOutputPort"
      | "qlcUniverse"
      | "qlcDryRun"
    >
  > = {};

  if ("qlcHost" in value) {
    const host = String(value.qlcHost || "").trim();
    if (!host) throw new Error("QLC host is required");
    update.qlcHost = host;
  }
  for (const [inputKey, configKey] of [
    ["qlcOscInputPort", "qlcOscInputPort"],
    ["qlcOscOutputPort", "qlcOscOutputPort"],
    ["qlcUniverse", "qlcUniverse"],
  ] as const) {
    if (inputKey in value) {
      const next = Number(value[inputKey]);
      if (!Number.isInteger(next))
        throw new Error(`${inputKey} must be an integer`);
      update[configKey] = next;
    }
  }
  if ("qlcDryRun" in value) {
    update.qlcDryRun = Boolean(value.qlcDryRun);
  }
  return update;
}

async function applyConfigUpdate(
  config: Config,
  payload: unknown,
  envFile: string | undefined,
): Promise<unknown> {
  const update = parseConfigUpdate(payload);
  const previous = {
    qlcHost: config.qlcHost,
    qlcOscInputPort: config.qlcOscInputPort,
    qlcOscOutputPort: config.qlcOscOutputPort,
    qlcUniverse: config.qlcUniverse,
    qlcDryRun: config.qlcDryRun,
  };
  updateRuntimeConfig(config, update);

  try {
    await closeOsc();
    await initOsc(config);
    persistRuntimeConfig(config, envFile);
  } catch (error) {
    updateRuntimeConfig(config, previous);
    try {
      await closeOsc();
      await initOsc(config);
    } catch (_) {}
    throw error;
  }

  return {
    saved: true,
    reconnect: true,
    runtimeConfig: runtimeConfig(config, envFile),
    osc: getOscRuntimeState(),
  };
}

function renderAdminPage(
  config: Config,
  tools: ToolDefinition[],
  envFile: string | undefined,
): string {
  const connectableHost = getConnectableHost(config.httpHost);
  const mcpUrl =
    "http://" + connectableHost + ":" + config.httpPort + config.httpMcpPath;
  const healthUrl =
    "http://" + connectableHost + ":" + config.httpPort + "/health";
  const agentConfig = buildAgentConfig(config);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>QLCPlus MCP</title>
  <style>
    :root{color-scheme:light;--bg:#f6f7f9;--panel:#fff;--text:#18202a;--muted:#687282;--border:#d7dde5;--accent:#0f7a45;--danger:#b42318;--warn:#a15c00;--ok:#0f7a45;--code:#111827}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{width:min(1180px,calc(100vw - 28px));margin:18px auto 32px;display:grid;gap:14px}header{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}h1{margin:0;font-size:26px}h2{margin:0;font-size:16px}.subtitle{color:var(--muted);margin-top:4px}.endpoint{border:1px solid var(--border);border-radius:6px;background:var(--panel);padding:9px 11px;font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--muted);overflow-wrap:anywhere}.grid{display:grid;grid-template-columns:minmax(320px,.85fr) minmax(360px,1.15fr);gap:14px}.section{border:1px solid var(--border);border-radius:8px;background:var(--panel);overflow:hidden}.section-head{min-height:44px;padding:12px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:10px}.body{padding:14px;display:grid;gap:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}label{display:grid;gap:5px;color:var(--muted);font-size:12px;font-weight:650}input,select{min-height:38px;border:1px solid var(--border);border-radius:6px;padding:0 10px;background:#fbfcfd;color:var(--text);font:inherit}input:focus,select:focus{outline:0;border-color:var(--accent)}button{min-height:38px;border:1px solid var(--accent);border-radius:6px;padding:0 13px;background:var(--accent);color:#fff;font:inherit;font-weight:700;cursor:pointer}button.secondary{background:transparent;color:var(--accent)}button:disabled{opacity:.55;cursor:wait}.actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.message{min-height:20px;color:var(--muted)}.message.ok{color:var(--ok)}.message.error{color:var(--danger)}.pill{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:999px;padding:4px 9px;color:var(--muted);font-size:12px;font-weight:700}.pill.ok{color:var(--ok)}.pill.warn{color:var(--warn)}.pill.bad{color:var(--danger)}pre,textarea.log{margin:0;min-height:160px;max-height:520px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid var(--border);border-radius:6px;padding:12px;background:var(--code);color:#eef2f7;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}textarea.log{width:100%;height:260px;resize:vertical}.list{display:grid;gap:8px;max-height:420px;overflow:auto}.item{border:1px solid var(--border);border-radius:6px;padding:9px 10px;background:#fbfcfd}.item-name{font:700 12px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--accent);overflow-wrap:anywhere}.item-desc{margin-top:3px;color:var(--muted);font-size:12px}.hidden{display:none!important}@media(max-width:840px){header,.grid,.pair{grid-template-columns:1fr;display:grid}.endpoint{width:100%}}
  </style>
</head>
<body>
  <main>
    <header>
      <div><h1>QLCPlus MCP</h1><div class="subtitle">Runtime QLC+ lighting MCP endpoint.</div></div>
      <div class="endpoint">MCP: ${mcpUrl}<br>Health: ${healthUrl}</div>
    </header>
    <div class="grid">
      <section class="section">
        <div class="section-head"><h2>QLC+ Connection</h2><span class="pill" id="connection-pill">Loading</span></div>
        <div class="body">
          <form id="config-form" class="body">
            <label>QLC+ Host<input id="qlcHost" name="qlcHost" autocomplete="off" required></label>
            <div class="pair">
              <label>OSC Input Port<input id="qlcOscInputPort" name="qlcOscInputPort" type="number" min="1" max="65535" required></label>
              <label>OSC Feedback Port<input id="qlcOscOutputPort" name="qlcOscOutputPort" type="number" min="1" max="65535" required></label>
            </div>
            <div class="pair">
              <label>Universe<input id="qlcUniverse" name="qlcUniverse" type="number" min="1" required></label>
              <label>Dry Run<select id="qlcDryRun" name="qlcDryRun"><option value="false">Off</option><option value="true">On</option></select></label>
            </div>
            <div class="actions"><button id="save-button" type="submit">Save and reconnect</button><button class="secondary" id="refresh-button" type="button">Refresh</button></div>
            <div id="message" class="message" role="status"></div>
          </form>
          <pre id="status">Loading...</pre>
        </div>
      </section>
      <section class="section">
        <div class="section-head"><h2>Agent HTTP Config</h2><span class="pill">/mcp</span></div>
        <div class="body">
          <pre id="agent-config">${JSON.stringify(agentConfig, null, 2)}</pre>
          <label>Runtime Log<textarea class="log" id="runtime-log" readonly spellcheck="false"></textarea></label>
        </div>
      </section>
    </div>
    <div class="grid">
      <section class="section"><div class="section-head"><h2>Resources</h2><span class="pill" id="resource-count">0</span></div><div class="body"><div class="list" id="resources-list"></div></div></section>
      <section class="section"><div class="section-head"><h2>Tools</h2><span class="pill" id="tool-count">0</span></div><div class="body"><div class="list" id="tools-list"></div></div></section>
    </div>
  </main>
  <script>
    const form = document.getElementById("config-form");
    const fields = ["qlcHost","qlcOscInputPort","qlcOscOutputPort","qlcUniverse","qlcDryRun"];
    const message = document.getElementById("message");
    const statusEl = document.getElementById("status");
    const agentConfigEl = document.getElementById("agent-config");
    const pill = document.getElementById("connection-pill");
    const saveButton = document.getElementById("save-button");
    const toolCount = document.getElementById("tool-count");
    const resourceCount = document.getElementById("resource-count");
    const toolsList = document.getElementById("tools-list");
    const resourcesList = document.getElementById("resources-list");
    const runtimeLog = document.getElementById("runtime-log");
    function field(id){return document.getElementById(id)}
    function setMessage(text, kind){message.textContent=text||"";message.className="message"+(kind?" "+kind:"")}
    function setBusy(busy){saveButton.disabled=busy;for(const id of fields)field(id).disabled=busy}
    function fillForm(config){field("qlcHost").value=config.qlcHost||"";field("qlcOscInputPort").value=config.qlcOscInputPort||"";field("qlcOscOutputPort").value=config.qlcOscOutputPort||"";field("qlcUniverse").value=config.qlcUniverse||"";field("qlcDryRun").value=String(Boolean(config.qlcDryRun))}
    function payload(){return{qlcHost:field("qlcHost").value.trim(),qlcOscInputPort:Number(field("qlcOscInputPort").value),qlcOscOutputPort:Number(field("qlcOscOutputPort").value),qlcUniverse:Number(field("qlcUniverse").value),qlcDryRun:field("qlcDryRun").value==="true"}}
    function renderList(el,countEl,items){countEl.textContent=String(items.length);el.replaceChildren();for(const item of items){const row=document.createElement("div");row.className="item";const name=document.createElement("div");name.className="item-name";name.textContent=item.name||item.title||item.uri||"item";const desc=document.createElement("div");desc.className="item-desc";desc.textContent=[item.uri,item.description,item.mimeType].filter(Boolean).join(" · ");row.append(name,desc);el.append(row)}}
    function appendLogLine(line){runtimeLog.value+=(runtimeLog.value?"\\n":"")+line;runtimeLog.scrollTop=runtimeLog.scrollHeight}
    async function loadLogs(){const response=await fetch("/mcp/logs",{headers:{accept:"application/json"},cache:"no-store"});const data=await response.json();if(response.ok){runtimeLog.value=(data.lines||[]).join("\\n");runtimeLog.scrollTop=runtimeLog.scrollHeight}}
    function connectLogs(){const events=new EventSource("/mcp/logs/stream");events.onmessage=(event)=>appendLogLine(JSON.parse(event.data));events.onerror=()=>{}}
    function renderStatus(data){const cfg=data.runtimeConfig||{};fillForm(cfg);statusEl.textContent=JSON.stringify(data,null,2);agentConfigEl.textContent=JSON.stringify(data.agentConfig||{},null,2);renderList(toolsList,toolCount,data.tools||[]);renderList(resourcesList,resourceCount,data.resources||[]);const osc=data.osc||{};const connected=Boolean(osc.initialized);const feedback=Boolean(osc.feedbackSeenRecently);pill.textContent=connected?(feedback?"Feedback seen":"OSC ready"):"Not initialized";pill.className="pill "+(connected?(feedback?"ok":"warn"):"bad")}
    async function loadStatus(){const response=await fetch("/mcp/status",{headers:{accept:"application/json"},cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to read status");renderStatus(data)}
    document.getElementById("refresh-button").addEventListener("click",async()=>{setMessage("Refreshing...");try{await loadStatus();setMessage("Status refreshed.","ok")}catch(error){setMessage(error.message||String(error),"error")}});
    form.addEventListener("submit",async(event)=>{event.preventDefault();setBusy(true);setMessage("Saving and reconnecting...");try{const response=await fetch("/mcp/config",{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify(payload())});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to update config");await loadStatus();setMessage("Configuration saved and OSC reconnected.","ok")}catch(error){setMessage(error.message||String(error),"error")}finally{setBusy(false)}});
    loadStatus().catch((error)=>setMessage(error.message||String(error),"error"));
    loadLogs().then(connectLogs).catch(()=>connectLogs());
  </script>
</body>
</html>`;
}

export async function startHttpServer(
  config: Config,
  tools: ToolDefinition[],
  runtimeEnvFile?: string,
): Promise<void> {
  const logger = getLogger();
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  logger.info("Starting MCP server in HTTP mode");
  logger.debug({ tools: tools.map((t) => t.name) }, "Tools registered");

  const httpServer = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");

      if (url.pathname === "/health") {
        sendJson(res, 200, statusPayload(config, tools, runtimeEnvFile));
        return;
      }

      if (!isAuthorized(req, config)) {
        sendJson(res, 401, { error: "Missing or invalid authorization" });
        return;
      }

      if (url.pathname === "/mcp/status" && req.method === "GET") {
        sendJson(res, 200, statusPayload(config, tools, runtimeEnvFile));
        return;
      }

      if (url.pathname === "/mcp/logs" && req.method === "GET") {
        sendJson(res, 200, { lines: getRecentLogLines() });
        return;
      }

      if (url.pathname === "/mcp/logs/stream" && req.method === "GET") {
        sendLogStream(req, res);
        return;
      }

      if (url.pathname === "/mcp/config" && req.method === "POST") {
        const payload = await readJsonBody(req);
        try {
          const update = await applyConfigUpdate(
            config,
            payload,
            runtimeEnvFile,
          );
          sendJson(res, 200, update);
        } catch (error) {
          sendJson(res, 400, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
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
          sendHtml(res, renderAdminPage(config, tools, runtimeEnvFile));
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
            enableJsonResponse: true,
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
          sendJson(res, 400, {
            error: "Bad Request: missing or invalid MCP session",
          });
          return;
        }
      }

      await transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      logger.error({ err: error }, "HTTP request failed");
      if (!res.headersSent) {
        sendJson(res, 500, {
          error: error instanceof Error ? error.message : String(error),
        });
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
  const healthUrl =
    "http://" + connectableHost + ":" + config.httpPort + "/health";
  const agentConfig = buildAgentConfig(config);

  logger.info(
    "MCP server listening on http://" +
      config.httpHost +
      ":" +
      config.httpPort +
      config.httpMcpPath,
  );
  logger.info(
    "Health endpoint: http://" +
      config.httpHost +
      ":" +
      config.httpPort +
      "/health",
  );
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
