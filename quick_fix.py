import paramiko, sys, time

HOST = "82.25.87.145"
PORT = 65002
USER = "u461432591"
PASS = "JJ@dagym1!"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd, wait=3):
    transport = client.get_transport()
    chan = transport.open_session()
    chan.exec_command(cmd)
    time.sleep(wait)
    out = chan.recv(65535).decode("utf-8", errors="replace").strip() if chan.recv_ready() else ""
    err = chan.recv_stderr(65535).decode("utf-8", errors="replace").strip() if chan.recv_stderr_ready() else ""
    print(f"$ {cmd}")
    if out: print(out)
    if err: print("ERR:", err)
    print()
    chan.close()
    return out

# Check current state
run("ps -u u461432591 2>/dev/null | grep -E '(next|node)' | grep -v grep")
run("cat /home/u461432591/domains/felcin.com/public_html/.htaccess | grep -E '(MaxInstances|MaxPool)'")
run("tail -10 /home/u461432591/domains/felcin.com/nodejs/stderr.log")

# Kill everything and force clean restart
run("pkill -9 -u u461432591 -f 'next' 2>/dev/null; pkill -9 -u u461432591 -f 'server.js' 2>/dev/null; echo killed", wait=5)
run("date +%s > /home/u461432591/domains/felcin.com/nodejs/tmp/restart.txt && echo restart_updated")

print("Waiting 35s for Passenger to restart...")
time.sleep(35)

# Trigger Passenger with a real request
run("curl -sk 'https://felcin.com/?_t=" + str(int(time.time())) + "' -o /dev/null -w '%{http_code}' --max-time 30 2>&1", wait=35)

# Final status
run("ps -u u461432591 2>/dev/null | grep -E '(next|node)' | grep -v grep")

client.close()
print("Done.")
