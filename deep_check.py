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

# Check if our process is running and listening
run("ps -u u461432591 2>/dev/null | grep next")

# Check all TCP connections
run("ss -tnlp 2>/dev/null | grep -E '(3000|LISTEN)' | head -20 || echo no_ss")

# Full socket list
run("ss -tnlp 2>/dev/null | head -30")

# Test direct connection to port 3000
run("python3 -c \"import urllib.request; r=urllib.request.urlopen('http://localhost:3000/'); print(r.status)\" 2>&1 || echo python_test_failed")

# Check /user.ini - it might restrict things
run("cat /home/u461432591/domains/felcin.com/public_html/.user.ini")

# Check if there is a PHP or Apache error log with 403 reason
run("find /home/u461432591 -name 'error.log' 2>/dev/null | head -5")
run("ls /home/u461432591/logs/ 2>/dev/null")

# Also check if there is a DO_NOT_UPLOAD file that is blocking
run("cat /home/u461432591/domains/felcin.com/DO_NOT_UPLOAD_HERE 2>/dev/null || echo no_dnuh_file")

# The .htaccess last modified time
run("ls -la /home/u461432591/domains/felcin.com/public_html/.htaccess")

# Check if Passenger or LiteSpeed config is elsewhere
run("find /home/u461432591 -name '*.conf' 2>/dev/null | head -10")

client.close()
print("Done.")
