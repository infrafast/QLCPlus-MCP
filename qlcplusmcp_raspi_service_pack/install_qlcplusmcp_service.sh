#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
