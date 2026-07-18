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

# Test HTTPS request with verbose output to see exactly where 403 comes from
run("curl -kvs https://felcin.com/ 2>&1 | head -40", wait=10)

# See what uid 162498028 is - this was listening on port 25955
run("id 162498028 2>/dev/null || getent passwd 162498028 2>/dev/null || echo unknown_uid", wait=3)

# Check the Passenger configuration more carefully
run("ls /opt/passenger/resources/ 2>/dev/null | head -10", wait=3)

# Check if there's a Node.js app config in LiteSpeed's web admin
run("find /usr/local/lsws /opt/lsws -name '*.conf' 2>/dev/null 2>/dev/null | head -10", wait=5)
run("ls /usr/local/lsws/conf/ 2>/dev/null | head -10 || echo no_lsws", wait=3)

# Check the htaccess more carefully
run("cat /home/u461432591/domains/felcin.com/public_html/.htaccess", wait=3)

# Perhaps there's a Python/PHP error page being served
run("head -30 /home/u461432591/domains/felcin.com/public_html/stderr.log 2>/dev/null || echo no_stderr", wait=3)

client.close()
print("Done.")
