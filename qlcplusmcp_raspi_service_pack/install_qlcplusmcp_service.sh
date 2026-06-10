#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

require_node_stack() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Error: node is not installed. Install Node.js >= 20.20.0, then rerun this installer." >&2
    exit 1
  fi
  if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm is not installed. Install npm with Node.js >= 20.20.0, then rerun this installer." >&2
    exit 1
  fi

  local node_version
  node_version="$(node -p "process.versions.node")"
  node -e '
    const version = process.versions.node.split(".").map(Number);
    const ok = version[0] > 20 || (version[0] === 20 && version[1] >= 20);
    if (!ok) process.exit(1);
  ' || {
    echo "Error: Node.js ${node_version} is too old. Install Node.js >= 20.20.0; Node 22 LTS is recommended." >&2
    exit 1
  }
}

require_node_stack

echo "Installing QLCPlus-MCP service files..."

sudo cp "$SCRIPT_DIR/qlcplusmcp.env" /etc/qlcplusmcp.env
sudo cp "$SCRIPT_DIR/qlcplusmcp.service" /etc/systemd/system/qlcplusmcp.service
sudo cp "$SCRIPT_DIR/qlcplusmcp" /usr/local/bin/qlcplusmcp

sudo chmod 644 /etc/qlcplusmcp.env
sudo chmod 644 /etc/systemd/system/qlcplusmcp.service
sudo chmod +x /usr/local/bin/qlcplusmcp

sudo systemctl daemon-reload

echo
echo "Installation complete."
echo "Next steps:"
echo "  1) Check /etc/qlcplusmcp.env"
echo "  2) Make sure /home/pi/QLCPlus-MCP exists and is built"
echo "  3) Run: qlcplusmcp auto"
echo "  4) Test locally: qlcplusmcp health"
echo "  5) From NAS: curl -I http://<raspberry-tailscale-ip>:8788/mcp"
