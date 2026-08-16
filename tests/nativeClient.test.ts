import net, { type Server } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import {
  NATIVE_DEFAULT_KEY,
  makeNativePacket,
  nativeByteArray,
  nativeInt,
  nativeString,
} from "../src/qlc/nativeCodec.js";
import {
  NET_AUTHENTICATION_REPLY,
  NET_PROJECT_TRANSFER,
  QlcNativeClient,
} from "../src/qlc/nativeClient.js";

const clients: QlcNativeClient[] = [];
const servers: Server[] = [];
const sockets = new Set<net.Socket>();

afterEach(async () => {
  clients.splice(0).forEach((client) => client.stop());
  sockets.forEach((socket) => socket.destroy());
  sockets.clear();
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
  );
});

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 2_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline)
      throw new Error("Timed out waiting for native client state");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("QLC+ native client lifecycle", () => {
  it("authenticates, loads inventory, invalidates it and reconnects", async () => {
    const project = Buffer.from(
      `<Workspace><VirtualConsole><Button ID="9" Caption="Ready"/></VirtualConsole></Workspace>`,
    );
    let connections = 0;
    const server = net.createServer((socket) => {
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
      connections += 1;
      socket.once("data", () => {
        const auth = makeNativePacket(
          NET_AUTHENTICATION_REPLY,
          NATIVE_DEFAULT_KEY,
          [nativeString("Success"), nativeInt(0x7f)],
        );
        const transfer = makeNativePacket(
          NET_PROJECT_TRANSFER,
          NATIVE_DEFAULT_KEY,
          [nativeInt(0), nativeInt(project.length), nativeByteArray(project)],
        );
        socket.write(Buffer.concat([auth, transfer]));
      });
    });
    servers.push(server);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing test server address");
    const client = new QlcNativeClient({
      enabled: true,
      host: "127.0.0.1",
      port: address.port,
      encryptionKey: "",
      reconnectMs: 20,
      connectTimeoutMs: 500,
      maximumProjectSize: 1024 * 1024,
      clientName: "QLCPlus-MCP-Test",
      dryRun: false,
    });
    clients.push(client);
    client.start();
    await waitFor(() => client.getState().ready);
    expect(client.getState()).toMatchObject({
      state: "ready",
      widgetCount: 1,
      inventoryGeneration: 1,
    });
    expect(client.listWidgets()[0]).toMatchObject({
      id: 9,
      caption: "Ready",
      kind: "button",
    });

    sockets.forEach((socket) => socket.destroy());
    await waitFor(() => connections >= 2 && client.getState().ready);
    expect(client.getState()).toMatchObject({
      state: "ready",
      widgetCount: 1,
      inventoryGeneration: 2,
    });
    expect(connections).toBeGreaterThanOrEqual(2);
  });

  it("dry-run opens no socket", async () => {
    const client = new QlcNativeClient({
      enabled: true,
      host: "127.0.0.1",
      port: 1,
      encryptionKey: "",
      reconnectMs: 20,
      connectTimeoutMs: 100,
      maximumProjectSize: 1024,
      clientName: "dry-run",
      dryRun: true,
    });
    clients.push(client);
    client.start();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(client.getState().state).toBe("disconnected");
    expect(client.getState().reconnectCount).toBe(0);
  });
});
