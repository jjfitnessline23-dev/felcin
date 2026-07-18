import paramiko, sys
sys.stdout.reconfigure(encoding="utf-8")

HOST = "82.25.87.145"; PORT = 65002; USER = "u461432591"; PASS = "JJ@dagym1!"
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd):
    print(f"\n=== {cmd[:80]} ===")
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    if out: print(out)
    if err: print("STDERR:", err)

# .user.ini — might reveal Node.js CGI config
run("cat /home/u461432591/domains/felcin.com/public_html/.user.ini")

# What does lscgid think node path is?
run("cat /home/u461432591/domains/felcin.com/public_html/.htaccess.bak 2>/dev/null || echo NO_BAK")

# Check stderr.log timestamps — when did the lscgid errors happen?
run("stat /home/u461432591/domains/felcin.com/public_html/stderr.log")

# Does /usr/bin/node or /usr/local/bin/node exist?
run("ls -la /usr/bin/node /usr/local/bin/node 2>/dev/null || echo NO_DEFAULT_NODE")
run("ls -la /opt/alt/alt-nodejs22/root/usr/bin/node")

# Can we create a symlink in our home bin?
run("mkdir -p ~/bin && ln -sf /opt/alt/alt-nodejs22/root/usr/bin/node ~/bin/node && echo OK || echo FAILED")
run("ls -la ~/bin/")
run("echo $PATH")

# When did the process start?
run("ps -p 1250154 -o pid,etime,cmd 2>/dev/null || echo NO_PROCESS")

# Full stderr content (not tail) to see all errors
run("wc -l /home/u461432591/domains/felcin.com/public_html/stderr.log")
run("cat /home/u461432591/domains/felcin.com/public_html/stderr.log")

client.close()
