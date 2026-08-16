import os from "node:os";
function isPrivateIpv4(address) {
    const parts = address.split(".").map(Number);
    if (parts.length !== 4 ||
        parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
        return false;
    }
    return (parts[0] === 10 ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
        (parts[0] === 192 && parts[1] === 168));
}
function interfaceScore(name) {
    if (/^(eth|en)/i.test(name))
        return 300;
    if (/^(wlan|wl)/i.test(name))
        return 200;
    return 100;
}
/** Resolve a stable RFC1918 address and avoid loopback, Tailscale and containers. */
export function resolveAutomaticNativeHost(interfaces = os.networkInterfaces()) {
    const candidates = Object.entries(interfaces).flatMap(([name, addresses]) => (addresses ?? [])
        .filter((address) => address.family === "IPv4" &&
        !address.internal &&
        isPrivateIpv4(address.address))
        .map((address) => ({
        address: address.address,
        score: interfaceScore(name),
        name,
    })));
    candidates.sort((left, right) => right.score - left.score ||
        left.name.localeCompare(right.name) ||
        left.address.localeCompare(right.address));
    const selected = candidates[0];
    if (!selected) {
        throw new Error("QLC_NATIVE_HOST=auto could not find a private IPv4 LAN address");
    }
    return selected.address;
}
export function resolveNativeHost(host) {
    return host === "auto" ? resolveAutomaticNativeHost() : host;
}
//# sourceMappingURL=nativeHost.js.map