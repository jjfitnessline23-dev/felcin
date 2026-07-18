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

# Kill our nohup process (and any others under our user)
run("pkill -u u461432591 -f 'server.js' 2>/dev/null; pkill -u u461432591 -f 'next' 2>/dev/null; echo killed_all", wait=5)

# Check nothing running
run("ps -u u461432591 2>/dev/null | grep -E '(next|node)' | grep -v grep", wait=2)

# Update restart.txt with fresh timestamp
run("date +%s > /home/u461432591/domains/felcin.com/nodejs/tmp/restart.txt && cat /home/u461432591/domains/felcin.com/nodejs/tmp/restart.txt", wait=2)

print("Waiting 30 seconds for Passenger to restart the app...")
time.sleep(30)

# Check if Passenger started anything
run("ps -u u461432591 2>/dev/null | grep -E '(next|node)' | grep -v grep", wait=2)

# Test locally
run("python3 -c \"import urllib.request; r=urllib.request.urlopen('http://localhost:3000/'); print('LOCAL_OK:', r.status)\" 2>&1", wait=10)

client.close()
print("Done.")
