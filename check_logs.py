import paramiko

HOST = "82.25.87.145"
PORT = 65002
USER = "u461432591"
PASS = "JJ@dagym1!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    print(f"$ {cmd}")
    if out:
        print(out)
    if err:
        print("ERR:", err)
    print()
    return out

# Check the stderr log from the node app
run("cat /home/u461432591/domains/felcin.com/nodejs/stderr.log")

# Check Passenger logs
run("find /var /tmp /home -name '*passenger*' -name '*.log' 2>/dev/null | head -10")

# Check if server.js has any syntax issues
run("/opt/alt/alt-nodejs22/root/usr/bin/node --check /home/u461432591/domains/felcin.com/nodejs/server.js 2>&1")

# Force restart by updating restart.txt
run("date > /home/u461432591/domains/felcin.com/nodejs/tmp/restart.txt")
run("cat /home/u461432591/domains/felcin.com/nodejs/tmp/restart.txt")

# Check node version
run("/opt/alt/alt-nodejs22/root/usr/bin/node --version")

# Try to manually start the server to see if it crashes
run("cd /home/u461432591/domains/felcin.com/nodejs && NODE_ENV=production PORT=3000 /opt/alt/alt-nodejs22/root/usr/bin/node server.js 2>&1 &")

client.close()
print("Done.")
