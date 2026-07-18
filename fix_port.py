import paramiko, sys, time

HOST = "82.25.87.145"
PORT = 65002
USER = "u461432591"
PASS = "JJ@dagym1!"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=60)

def run(cmd, wait=5):
    transport = client.get_transport()
    chan = transport.open_session()
    chan.exec_command(cmd)
    time.sleep(wait)
    out = ""
    err = ""
    if chan.recv_ready():
        out = chan.recv(65535).decode("utf-8", errors="replace").strip()
    if chan.recv_stderr_ready():
        err = chan.recv_stderr(65535).decode("utf-8", errors="replace").strip()
    print(f"$ {cmd}")
    if out: print(out)
    if err: print("ERR:", err)
    print()
    chan.close()

# Show all processes for this user
run("ps -u u461432591 aux 2>/dev/null || ps aux | grep u461432591", wait=3)

# Find what's using port 3000
run("fuser 3000/tcp 2>/dev/null || echo fuser_not_found", wait=3)
run("lsof -i :3000 2>/dev/null | head -10 || echo lsof_not_found", wait=3)

# Kill ALL next-server processes under our user
run("pkill -u u461432591 -f 'next-server' 2>/dev/null; pkill -u u461432591 -f 'server.js' 2>/dev/null; echo done_kill", wait=5)

# Also try killing by port
run("fuser -k 3000/tcp 2>/dev/null; echo done_port_kill", wait=3)

# Wait a bit
time.sleep(5)

# Check what's running now
run("ps -u u461432591 2>/dev/null | head -10", wait=3)

# Check if port is free
run("ss -tlnp 2>/dev/null | grep 3000 || echo port_free", wait=3)

# Now start fresh
run("cd /home/u461432591/domains/felcin.com/nodejs && nohup /opt/alt/alt-nodejs22/root/usr/bin/node server.js > /tmp/felcin_node.log 2>&1 &", wait=3)
print("Waiting 15s for startup...")
time.sleep(15)

run("cat /tmp/felcin_node.log", wait=2)
run("ps -u u461432591 2>/dev/null | grep next", wait=2)

client.close()
print("Done.")
