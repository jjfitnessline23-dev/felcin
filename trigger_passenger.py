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

# Trigger Passenger with an HTTPS request to the domain (from within server)
run("curl -sk https://felcin.com/ -o /dev/null -w '%{http_code}' --max-time 60 2>&1", wait=65)

# Check what happened
run("ps -u u461432591 2>/dev/null | grep -E '(next|node)'", wait=2)
run("cat /home/u461432591/domains/felcin.com/nodejs/stderr.log | tail -30", wait=3)

# Check local port 3000
run("python3 -c \"import urllib.request; r=urllib.request.urlopen('http://localhost:3000/'); print('LOCAL:', r.status)\" 2>&1", wait=10)

client.close()
print("Done.")
