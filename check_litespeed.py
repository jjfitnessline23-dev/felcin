import paramiko, sys, time, urllib.request, ssl

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

# Check all listening ports
run("cat /proc/net/tcp 2>/dev/null | head -20", wait=3)

# Look for any config files in the domain
run("find /home/u461432591/domains/felcin.com -name '*.conf' 2>/dev/null", wait=3)

# Check what's using port 3000 (as root?)
run("ls -la /proc/$(pgrep -f server.js | head -1)/net/tcp 2>/dev/null", wait=3)

# Try curl from server with verbose output to see 403 headers
run("curl -v http://felcin.com/ 2>&1 | head -30", wait=10)

# Check if LiteSpeed is serving felcin.com
run("curl -I http://felcin.com/ 2>&1 | head -20", wait=10)

client.close()
print("Done SSH check.")

# Also try direct connection to port 3000 from outside
print("\nTesting external connection to port 3000...")
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
try:
    r = urllib.request.urlopen("http://felcin.com:3000/", timeout=5)
    print(f"  Direct port 3000: {r.status}")
except Exception as e:
    print(f"  Direct port 3000: {type(e).__name__}: {e}")
