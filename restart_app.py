import paramiko, sys, time

HOST = "82.25.87.145"
PORT = 65002
USER = "u461432591"
PASS = "JJ@dagym1!"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=60)

def run(cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    print(f"$ {cmd}")
    if out: print(out)
    if err: print("ERR:", err)
    print()
    return out

# Start the Node.js app in the background with nohup
run("cd /home/u461432591/domains/felcin.com/nodejs && nohup /opt/alt/alt-nodejs22/root/usr/bin/node server.js > /tmp/felcin_node.log 2>&1 &")

# Wait for startup
time.sleep(5)

# Check if it's running
run("ps aux | grep 'server.js' | grep -v grep")

# Check if port 3000 is listening
run("ss -tlnp 2>/dev/null | grep 3000 || netstat -tlnp 2>/dev/null | grep 3000 || echo no_3000")

# Check the startup log
run("cat /tmp/felcin_node.log")

# Test the connection
run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null || echo curl_not_found")

client.close()
print("Done.")
