import paramiko, sys, time
sys.stdout.reconfigure(encoding="utf-8")

HOST = "82.25.87.145"; PORT = 65002; USER = "u461432591"; PASS = "JJ@dagym1!"
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd, timeout=30):
    _, o, _ = client.exec_command(cmd, timeout=timeout)
    return o.read().decode("utf-8", errors="replace").strip()

# Test direct connection to port 3000 on localhost (bypasses CDN entirely)
print("Port 3000 direct:", run("curl -s -o /dev/null -w '%{http_code}' --max-time 15 http://127.0.0.1:3000/"))
print("Process tree:")
print(run("ps -eo pid,ppid,cmd | grep -E 'lsnode|node|next' | grep -v grep"))
print("\nWrapper:", run("cat /tmp/felcin-next.pid 2>/dev/null || echo NONE"))
print("Child:  ", run("cat /tmp/felcin-next-child.pid 2>/dev/null || echo NONE"))
print("\nSite via CDN check (from another server perspective):")
print(run("curl -skI --max-time 15 https://felcin.com/ | head -5"))

client.close()
