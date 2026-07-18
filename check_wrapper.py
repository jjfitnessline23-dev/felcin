import paramiko, sys
sys.stdout.reconfigure(encoding="utf-8")

HOST = "82.25.87.145"; PORT = 65002; USER = "u461432591"; PASS = "JJ@dagym1!"
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd):
    _, o, _ = client.exec_command(cmd)
    return o.read().decode("utf-8", errors="replace").strip()

# Read the actual server-wrapper.js on server
print("=== SERVER-WRAPPER.JS ON SERVER ===")
print(run("cat /home/u461432591/domains/felcin.com/nodejs/server-wrapper.js"))

# All processes
print("\n=== ALL PROCESSES ===")
print(run("ps -eo pid,ppid,cmd | grep -E 'node|next' | grep -v grep"))

# Process tree for our user
print("\n=== PROCESS TREE ===")
print(run("pstree -p u461432591 2>/dev/null | head -20 || ps f -u u461432591 | head -20"))

client.close()
