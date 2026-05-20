import sys

with open("mcp-server/index.ts", "r", encoding="utf-8") as f:
    for i, line in enumerate(f, 1):
        if "get_light_curve" in line or "mcp_sarkar-exohunter_get_light_curve" in line:
            sys.stdout.buffer.write(f"{i}: {line.strip()}\n".encode('utf-8'))
