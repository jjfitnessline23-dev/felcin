import paramiko, sys, time
sys.stdout.reconfigure(encoding="utf-8")

HOST = "82.25.87.145"; PORT = 65002; USER = "u461432591"; PASS = "JJ@dagym1!"
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd, timeout=30):
    _, o, e = client.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", errors="replace").strip()
    return out

# Hit HTTPS — this goes through LiteSpeed → Passenger → boots the app
print("Hitting felcin.com via HTTPS to boot Passenger...")
code = run("curl -s -o /dev/null -w '%{http_code}' --max-time 90 https://felcin.com/login", timeout=100)
print("Response:", code)

time.sleep(5)
print("Wrapper PID:", run("cat /tmp/felcin-next.pid 2>/dev/null || echo NONE"))
print("Child PID:  ", run("cat /tmp/felcin-next-child.pid 2>/dev/null || echo NONE"))
print("Processes:")
print(run("ps -eo pid,ppid,cmd | grep -E 'node|next' | grep -v grep"))
print("\nLog:")
print(run("tail -25 /home/u461432591/.cagefs/tmp/felcin_node.log 2>/dev/null || echo EMPTY"))

client.close()
