import paramiko, time

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

run("echo $PATH")
run("ls /usr/local/bin/ | head -30")
run("find /usr/local -name 'pm2' 2>/dev/null | head -5")
run("find /usr/local -name 'node' 2>/dev/null | head -5")
run("find /home/u461432591 -name '.nvm' -maxdepth 3 2>/dev/null")
run("ls /home/u461432591/.nvm/versions/node/ 2>/dev/null")
run("cat /home/u461432591/.bashrc 2>/dev/null | grep -i nvm | head -10")
run("cat /home/u461432591/.bash_profile 2>/dev/null | head -20")

client.close()
print("Done.")
