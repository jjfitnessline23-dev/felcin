import paramiko, sys

HOST = "82.25.87.145"
PORT = 65002
USER = "u461432591"
PASS = "JJ@dagym1!"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    print(f"$ {cmd}")
    if out: print(out)
    if err: print("ERR:", err)
    print()
    return out

# Check public_html contents
run("ls -la /home/u461432591/domains/felcin.com/public_html/")

# Check .htaccess content fully
run("cat /home/u461432591/domains/felcin.com/public_html/.htaccess")

# Test internal connectivity - can we reach port 3000?
run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null || echo curl_failed")

# Check running processes more carefully
run("ps aux | grep -E '(node|passenger|apache|litespeed)' | grep -v grep")

# Check if there's a Passenger socket
run("ls -la /tmp/passenger.* 2>/dev/null | head -10")

# Check what's listening on port 3000
run("ss -tlnp 2>/dev/null | grep 3000 || netstat -tlnp 2>/dev/null | grep 3000 || echo no_listener")

# Check Passenger itself
run("ls /opt/passenger/ 2>/dev/null | head -5")
run("/opt/passenger/bin/passenger-status 2>/dev/null || passenger-status 2>/dev/null || echo no_passenger_cmd")

client.close()
print("Done.")
