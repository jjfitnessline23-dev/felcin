import paramiko, sys, time
sys.stdout.reconfigure(encoding="utf-8")

HOST = "82.25.87.145"; PORT = 65002; USER = "u461432591"; PASS = "JJ@dagym1!"
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd):
    _, o, e = client.exec_command(cmd)
    out = o.read().decode("utf-8", errors="replace").strip()
    err = e.read().decode("utf-8", errors="replace").strip()
    return out, err

# Kill the current next-server process — Passenger will start fresh with new code
out, _ = run("pkill -f 'next-server' 2>/dev/null; echo KILLED")
print("Kill:", out)

# Touch restart.txt to signal Passenger
out, _ = run("date +%s > /home/u461432591/domains/felcin.com/nodejs/tmp/restart.txt && echo OK")
print("Restart signal:", out)

print("Waiting 40 seconds for Passenger to boot new process...")
time.sleep(40)

# Verify new wrapper is running
out, _ = run("ps aux | grep next | grep -v grep")
print("Processes after restart:\n", out)
out, _ = run("cat /tmp/felcin-next.pid 2>/dev/null || echo NONE")
print("Wrapper PID:", out)
out, _ = run("cat /tmp/felcin-next-child.pid 2>/dev/null || echo NONE")
print("Child PID:  ", out)
out, _ = run("tail -20 /home/u461432591/.cagefs/tmp/felcin_node.log 2>/dev/null || echo NO_LOG")
print("Wrapper log:\n", out)
out, _ = run("curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://felcin.com/")
print("HTTP status:", out)

client.close()
