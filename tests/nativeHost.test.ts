import { describe, expect, it } from "vitest";
import { resolveAutomaticNativeHost } from "../src/qlc/nativeHost.js";

describe("native host auto-selection", () => {
  it("prefers physical Ethernet and excludes loopback and Tailscale", () => {
    expect(
      resolveAutomaticNativeHost({
        lo: [{ address: "127.0.0.1", netmask: "255.0.0.0", family: "IPv4", mac: "00:00:00:00:00:00", internal: true, cidr: "127.0.0.1/8" }],
        tailscale0: [{ address: "100.64.0.2", netmask: "255.192.0.0", family: "IPv4", mac: "00:00:00:00:00:00", internal: false, cidr: "100.64.0.2/10" }],
        wlan0: [{ address: "192.168.1.20", netmask: "255.255.255.0", family: "IPv4", mac: "00:00:00:00:00:01", internal: false, cidr: "192.168.1.20/24" }],
        eth0: [{ address: "192.168.1.10", netmask: "255.255.255.0", family: "IPv4", mac: "00:00:00:00:00:02", internal: false, cidr: "192.168.1.10/24" }],
      }),
    ).toBe("192.168.1.10");
  });

  it("fails explicitly when no private LAN address exists", () => {
    expect(() =>
      resolveAutomaticNativeHost({
        tailscale0: [{ address: "100.64.0.2", netmask: "255.192.0.0", family: "IPv4", mac: "00:00:00:00:00:00", internal: false, cidr: "100.64.0.2/10" }],
      }),
    ).toThrow(/private IPv4 LAN/);
  });
});
