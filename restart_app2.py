import paramiko, sys, time

HOST = "82.25.87.145"
PORT = 65002
USER = "u461432591"
PASS = "JJ@dagym1!"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=60)

def run(cmd, wait=10):
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

# Kill any stale processes first
run("pkill -f 'server.js' 2>/dev/null; sleep 1; echo killed", wait=3)

# Start fresh with nohup, background
run("cd /home/u461432591/domains/felcin.com/nodejs && nohup /opt/alt/alt-nodejs22/root/usr/bin/node server.js > /tmp/felcin_node.log 2>&1 &", wait=3)

# Wait for startup
print("Waiting 10s for startup...")
time.sleep(10)

# Check process
run("ps aux | grep 'server.js' | grep -v grep", wait=2)
run("cat /tmp/felcin_node.log", wait=2)
run("ss -tlnp 2>/dev/null | grep 3000 || echo no_3000", wait=2)

client.close()
print("Done.")
