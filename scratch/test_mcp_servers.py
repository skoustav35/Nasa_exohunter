import subprocess
import os

def test_mcp(name, command, args, env_vars=None):
    print(f"Testing {name}...")
    env = os.environ.copy()
    if env_vars:
        env.update(env_vars)
    
    try:
        # Run for 2 seconds and see if it crashes
        process = subprocess.Popen([command] + args, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            stdout, stderr = process.communicate(timeout=5)
            print(f"{name} exited. Return code: {process.returncode}")
            print(f"STDOUT: {stdout.decode()[:200]}")
            print(f"STDERR: {stderr.decode()[:200]}")
        except subprocess.TimeoutExpired:
            process.kill()
            print(f"{name} is running (timeout reached, which is GOOD for an MCP server).")
    except Exception as e:
        print(f"Failed to start {name}: {e}")

# Netlify
test_mcp("Netlify", "cmd", ["/c", "npx", "-y", "@netlify/mcp"], {"NETLIFY_PERSONAL_ACCESS_TOKEN": "nfp_JnD8unBpPCAQ833VPSuKQbam1fssfqV2de81"})

# Supabase
test_mcp("Supabase", "cmd", ["/c", "npx", "-y", "@supabase/mcp-server-supabase@latest"], {"SUPABASE_ACCESS_TOKEN": "test_token"})
