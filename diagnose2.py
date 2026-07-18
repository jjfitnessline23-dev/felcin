import paramiko

HOST = "82.25.87.145"
PORT = 65002
USER = "u461432591"
PASS = "JJ@dagym1!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

cmds = [
    # Is the PID actually alive?
    "kill -0 1250154 2>&1 && echo ALIVE || echo DEAD",
    # LVE usage (CloudLinux)
    "lveinfo --user u461432591 2>/dev/null || echo NO_LVEINFO",
    # Passenger logs
    "find /home/u461432591 -name '*.log' 2>/dev/null | head -20",
    "find /var/log -name '*passenger*' 2>/dev/null | head -10",
    # What's killing it? dmesg OOM?
    "dmesg 2>/dev/null | grep -i 'oom\\|kill\\|out of memory' | tail -10 || echo NO_DMESG",
    # Try to restart by touching restart.txt
    "date +%s > /home/u461432591/domains/felcin.com/nodejs/tmp/restart.txt && echo RESTARTED",
    # Check if there's a .env or config issue
    "ls /home/u461432591/domains/felcin.com/nodejs/",
    # What's the current CPU usage for our user?
    "top -bn1 -u u461432591 | head -20 2>/dev/null || echo NO_TOP",
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
