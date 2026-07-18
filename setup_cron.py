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

# Check if cron is available
run("crontab -l 2>/dev/null || echo no_cron")
run("which crontab 2>/dev/null || echo no_crontab")

# Write a watchdog script to the server
WATCHDOG = """#!/bin/bash
# Felcin watchdog — restarts the Next.js app if it stops responding

DOMAIN="https://felcin.com"
NODEJS_DIR="/home/u461432591/domains/felcin.com/nodejs"
LOG="/home/u461432591/felcin_watchdog.log"

# Test if site responds
STATUS=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 "${DOMAIN}/?_wdg=$(date +%s)" 2>/dev/null)

if [ "$STATUS" != "200" ]; then
    echo "$(date): site returned $STATUS — restarting" >> "$LOG"
    # Kill stale processes
    pkill -9 -u u461432591 -f 'next' 2>/dev/null
    pkill -9 -u u461432591 -f 'server.js' 2>/dev/null
    sleep 3
    # Signal Passenger to restart
    date +%s > "${NODEJS_DIR}/tmp/restart.txt"
    sleep 30
    # Wake up Passenger
    curl -sk -o /dev/null "${DOMAIN}/?_wdg=$(date +%s)" --max-time 20 2>/dev/null
    echo "$(date): restart complete — status now $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 '${DOMAIN}/' 2>/dev/null)" >> "$LOG"
else
    echo "$(date): OK ($STATUS)" >> "$LOG"
fi
"""

sftp = client.open_sftp()
with sftp.file("/home/u461432591/felcin_watchdog.sh", "w") as f:
    f.write(WATCHDOG)
sftp.close()

# Make it executable
run("chmod +x /home/u461432591/felcin_watchdog.sh && echo watchdog_created")

# Set up cron to run every 15 minutes
run("(crontab -l 2>/dev/null | grep -v felcin_watchdog; echo '*/15 * * * * /home/u461432591/felcin_watchdog.sh') | crontab - && echo cron_installed")

# Verify cron
run("crontab -l 2>/dev/null")

client.close()
print("Done.")
