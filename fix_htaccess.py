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

HTACCESS = """<IfModule mod_passenger.c>
  PassengerAppRoot /home/u461432591/domains/felcin.com/nodejs
  PassengerBaseURI /
  PassengerNodejs /opt/alt/alt-nodejs22/root/usr/bin/node
  PassengerAppType node
  PassengerStartupFile server.js
  PassengerStartTimeout 120
  PassengerMaxInstances 1
  PassengerMaxPoolSize 1
  PassengerMinInstances 1
  PassengerMaxIdleTime 0
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

sftp = client.open_sftp()
with sftp.file("/home/u461432591/domains/felcin.com/public_html/.htaccess", "w") as f:
    f.write(HTACCESS)
sftp.close()
print("htaccess updated")

# Verify
run("cat /home/u461432591/domains/felcin.com/public_html/.htaccess")

# Force a clean restart
run("pkill -9 -u u461432591 -f 'next' 2>/dev/null; pkill -9 -u u461432591 -f 'server.js' 2>/dev/null; echo killed", wait=5)
run("date +%s > /home/u461432591/domains/felcin.com/nodejs/tmp/restart.txt && echo restart_updated")

print("Waiting 35s for Passenger restart...")
time.sleep(35)

run("curl -sk 'https://felcin.com/?_t=" + str(int(time.time())) + "' -o /dev/null -w '%{http_code}' --max-time 30 2>&1", wait=35)
run("ps -u u461432591 2>/dev/null | grep -E '(next|node)' | grep -v grep")

client.close()
print("Done.")
