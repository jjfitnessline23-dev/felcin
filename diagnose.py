import paramiko, time

HOST = "82.25.87.145"
PORT = 65002
USER = "u461432591"
PASS = "JJ@dagym1!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

cmds = [
    "ps aux | grep node | grep -v grep",
    "cat /proc/meminfo | grep -E 'MemTotal|MemFree|MemAvailable'",
    "uptime",
    "cat /tmp/felcin-next.pid 2>/dev/null || echo NO_PID_FILE",
    "ls -la /home/u461432591/domains/felcin.com/nodejs/tmp/ 2>/dev/null",
    "tail -40 /home/u461432591/felcin_watchdog.log 2>/dev/null || echo NO_WATCHDOG_LOG",
    "journalctl -u passenger --no-pager -n 20 2>/dev/null || echo NO_JOURNAL",
    "tail -30 /var/log/apache2/felcin.com-error.log 2>/dev/null || tail -30 /home/u461432591/logs/error.log 2>/dev/null || echo NO_ERROR_LOG",
    "ls /home/u461432591/logs/ 2>/dev/null || echo NO_LOGS_DIR",
]

for cmd in cmds:
    print(f"\n=== {cmd[:70]} ===")
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(out)
    if err:
        print("STDERR:", err)

client.close()
