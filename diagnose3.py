import paramiko, sys

sys.stdout.reconfigure(encoding="utf-8")

HOST = "82.25.87.145"
PORT = 65002
USER = "u461432591"
PASS = "JJ@dagym1!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd):
    print(f"\n=== {cmd[:70]} ===")
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    if out:
        print(out)
    if err:
        print("STDERR:", err)

run("tail -80 /home/u461432591/.cagefs/tmp/felcin_node.log 2>/dev/null || echo EMPTY")
run("tail -80 /home/u461432591/.cagefs/tmp/felcin2.log 2>/dev/null || echo EMPTY")
run("cat /home/u461432591/domains/felcin.com/nodejs/ecosystem.config.js")
run("ls -la /home/u461432591/domains/felcin.com/public_html/")
run("cat /home/u461432591/domains/felcin.com/public_html/.htaccess")
run("which pm2 2>/dev/null; ls ~/.nvm/versions/node/ 2>/dev/null || echo NO_NVM")
run("cat /home/u461432591/domains/felcin.com/nodejs/package.json")

client.close()
