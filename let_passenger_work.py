import paramiko, sys, time

HOST = "82.25.87.145"
PORT = 65002
USER = "u461432591"
PASS = "JJ@dagym1!"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=60)

def run(cmd, wait=3):
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

# Check stderr.log timestamp and full content
run("ls -la /home/u461432591/domains/felcin.com/public_html/stderr.log && cat /home/u461432591/domains/felcin.com/public_html/stderr.log", wait=3)

# Check nodejs/stderr.log
run("cat /home/u461432591/domains/felcin.com/nodejs/stderr.log", wait=3)

# Kill our nohup process
run("kill -9 3885554 2>/dev/null; pkill -9 -f 'server.js' 2>/dev/null; echo killed", wait=3)

# Update restart.txt
run("date +%s > /home/u461432591/domains/felcin.com/nodejs/tmp/restart.txt", wait=2)

# Check if symlink node -> correct path exists
run("ls -la /usr/bin/node 2>/dev/null || echo no_node_symlink", wait=2)
run("ls -la /usr/local/bin/node 2>/dev/null || echo no_local_node", wait=2)

# Create a symlink from /usr/bin/node if we have permission
run("ln -s /opt/alt/alt-nodejs22/root/usr/bin/node /home/u461432591/bin/node 2>/dev/null; mkdir -p /home/u461432591/bin 2>/dev/null; echo done_symlink", wait=3)

# Wait for Passenger to restart
print("Waiting 30s for Passenger to restart...")
time.sleep(30)

# Check processes
run("ps -u u461432591 2>/dev/null | grep -E '(next|node)'", wait=2)

# Test locally
run("python3 -c \"import urllib.request; r=urllib.request.urlopen('http://localhost:3000/'); print('LOCAL:', r.status)\" 2>&1", wait=10)

client.close()
print("Done.")
