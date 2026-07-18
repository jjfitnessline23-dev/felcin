import paramiko, sys, time

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

# Check stderr log (errors from the Node.js app)
run("cat /home/u461432591/domains/felcin.com/nodejs/stderr.log")

# Check apache/passenger error logs
run("tail -30 /var/log/lsws/felcin.com.error.log 2>/dev/null || tail -30 /var/log/apache2/felcin.com.error.log 2>/dev/null || echo no_apache_log")

# Check Passenger logs
run("ls /tmp/passenger* 2>/dev/null | head -5")
run("find /var/log -name '*passenger*' 2>/dev/null | head -5")

# Try starting server manually to capture startup errors
run("cd /home/u461432591/domains/felcin.com/nodejs && timeout 8 /opt/alt/alt-nodejs22/root/usr/bin/node server.js 2>&1")

# Check file permissions
run("ls -la /home/u461432591/domains/felcin.com/nodejs/server.js")
run("ls -la /home/u461432591/domains/felcin.com/nodejs/.next/")

client.close()
print("Done.")
