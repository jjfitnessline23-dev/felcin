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

# Search everywhere for node
run("find / -maxdepth 6 -name 'node' -type f 2>/dev/null | grep -v proc | head -10")
run("find / -maxdepth 6 -name 'pm2' -type f 2>/dev/null | grep -v proc | head -10")
run("ls /opt/ 2>/dev/null")
run("ls /var/www/ 2>/dev/null")

# Check Hostinger's Node.js management
run("cat /home/u461432591/domains/felcin.com/.htaccess 2>/dev/null | head -20")
run("ls -la /home/u461432591/domains/felcin.com/nodejs/")
run("cat /home/u461432591/domains/felcin.com/public_html/.htaccess 2>/dev/null | head -30")

client.close()
print("Done.")
