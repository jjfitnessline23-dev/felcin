import paramiko, sys, time
sys.stdout.reconfigure(encoding="utf-8")

HOST = "82.25.87.145"; PORT = 65002; USER = "u461432591"; PASS = "JJ@dagym1!"
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd):
    _, o, _ = client.exec_command(cmd)
    return o.read().decode("utf-8", errors="replace").strip()

print("HTTP status:", run("curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://felcin.com/"))
print("Node processes:", run("ps aux | grep next | grep -v grep"))
print("Wrapper PID:", run("cat /tmp/felcin-next.pid 2>/dev/null || echo NONE"))
print("Child PID:  ", run("cat /tmp/felcin-next-child.pid 2>/dev/null || echo NONE"))
print("\n--- Wrapper log ---")
print(run("tail -20 /home/u461432591/.cagefs/tmp/felcin_node.log 2>/dev/null || echo NO_LOG"))

client.close()
