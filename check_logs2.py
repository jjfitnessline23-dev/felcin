import paramiko, sys

HOST = "82.25.87.145"
PORT = 65002
USER = "u461432591"
PASS = "JJ@dagym1!"

# Force UTF-8 output
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    print(f"$ {cmd}")
    if out:
        print(out)
    if err:
        print("ERR:", err)
    print()
    return out

# Check the stderr log
run("cat /home/u461432591/domains/felcin.com/nodejs/stderr.log 2>/dev/null | tail -50")

# Force restart by updating restart.txt
run("date > /home/u461432591/domains/felcin.com/nodejs/tmp/restart.txt")

# Check node version
run("/opt/alt/alt-nodejs22/root/usr/bin/node --version")

# Check if server.js has syntax issues
run("/opt/alt/alt-nodejs22/root/usr/bin/node --check /home/u461432591/domains/felcin.com/nodejs/server.js 2>&1")

# Check what's currently running under our user
run("ps -u u461432591 2>/dev/null | head -20")

# Check the server.js content
run("head -30 /home/u461432591/domains/felcin.com/nodejs/server.js")

# Try running it briefly to see immediate crash
run("cd /home/u461432591/domains/felcin.com/nodejs && timeout 5 /opt/alt/alt-nodejs22/root/usr/bin/node server.js 2>&1 | head -20")

client.close()
print("Done.")
