import paramiko, sys, time
sys.stdout.reconfigure(encoding="utf-8")

HOST = "82.25.87.145"; PORT = 65002; USER = "u461432591"; PASS = "JJ@dagym1!"
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd):
    _, o, e = client.exec_command(cmd)
    return o.read().decode("utf-8", errors="replace").strip()

# Trigger a request from the server itself (bypasses CDN, hits origin directly)
print("Triggering origin request...")
out = run("curl -s -o /dev/null -w '%{http_code}' --max-time 60 --resolve 'felcin.com:80:82.25.87.145' http://felcin.com/ || echo FAILED")
print("Origin HTTP:", out)

time.sleep(10)

print("Processes:", run("ps aux | grep next | grep -v grep"))
print("Wrapper PID:", run("cat /tmp/felcin-next.pid 2>/dev/null || echo NONE"))
print("Child PID:  ", run("cat /tmp/felcin-next-child.pid 2>/dev/null || echo NONE"))
print("Log:")
print(run("tail -25 /home/u461432591/.cagefs/tmp/felcin_node.log 2>/dev/null || echo NO_LOG"))

client.close()
