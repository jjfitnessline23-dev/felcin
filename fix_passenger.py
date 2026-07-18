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

# Write updated .htaccess with PassengerMaxInstances 1
HTACCESS = """<IfModule mod_passenger.c>
  PassengerAppRoot /home/u461432591/domains/felcin.com/nodejs
  PassengerBaseURI /
  PassengerNodejs /opt/alt/alt-nodejs22/root/usr/bin/node
  PassengerAppType node
  PassengerStartupFile server.js
  PassengerStartTimeout 120
  PassengerMaxInstances 1
  PassengerMaxPoolSize 1
  PassengerConcurrencyModel thread
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json text/plain text/xml
</IfModule>

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
"""

# Write the htaccess
sftp = client.open_sftp()
with sftp.file("/home/u461432591/domains/felcin.com/public_html/.htaccess", "w") as f:
    f.write(HTACCESS)
sftp.close()
print("Updated .htaccess")

# Kill all current processes cleanly
run("pkill -u u461432591 -f 'next' 2>/dev/null; pkill -u u461432591 -f 'server.js' 2>/dev/null; sleep 2; echo all_killed", wait=5)

# Fresh restart.txt
run("date +%s > /home/u461432591/domains/felcin.com/nodejs/tmp/restart.txt && echo restart_updated", wait=2)

# Clear the nodejs stderr log so we can see fresh errors
run("echo '' > /home/u461432591/domains/felcin.com/nodejs/stderr.log && echo log_cleared", wait=2)

print("Waiting 40s for Passenger to restart with new config...")
time.sleep(40)

# Check status
run("ps -u u461432591 2>/dev/null | grep -E '(next|node)'", wait=2)
run("cat /home/u461432591/domains/felcin.com/nodejs/stderr.log", wait=3)
run("python3 -c \"import urllib.request; r=urllib.request.urlopen('http://localhost:3000/'); print('LOCAL:', r.status)\" 2>&1", wait=10)

client.close()
print("Done.")
