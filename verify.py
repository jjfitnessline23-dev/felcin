import paramiko, sys
sys.stdout.reconfigure(encoding="utf-8")

HOST = "82.25.87.145"; PORT = 65002; USER = "u461432591"; PASS = "JJ@dagym1!"
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd):
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return out, err

# Check HTTP response from server's perspective
out, _ = run("curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://felcin.com/")
print(f"Site HTTP status: {out}")

# Confirm ecosystem.config.js is gone
out, _ = run("ls /home/u461432591/domains/felcin.com/nodejs/")
print(f"\nNodejs dir contents:\n{out}")

# Process status
out, _ = run("ps aux | grep next | grep -v grep")
print(f"\nNode processes:\n{out}")

# Current uptime
out, _ = run("ps -p 1250154 -o pid,etime,cmd 2>/dev/null || echo PROCESS_GONE")
print(f"\nProcess info:\n{out}")

client.close()
