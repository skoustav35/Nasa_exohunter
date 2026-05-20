with open("server.ts", "r", encoding="utf-8") as f:
    for i, line in enumerate(f, 1):
        if ".py" in line or "python" in line or "spawn" in line or "exec" in line:
            print(f"{i}: {line.strip()}")
