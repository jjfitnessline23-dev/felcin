import paramiko, re, time, sys
sys.stdout.reconfigure(encoding="utf-8")

HOST = "82.25.87.145"; PORT = 65002; USER = "u461432591"; PASS = "JJ@dagym1!"
REMOTE = "/home/u461432591/domains/felcin.com/nodejs/server-wrapper.js"

with open(r"C:\Users\johnj\felcin\deploy_next.py", encoding="utf-8") as f:
    src = f.read()

m = re.search(r'SERVER_WRAPPER = r"""(.+?)"""', src, re.DOTALL)
if not m:
    print("ERROR: could not find SERVER_WRAPPER in deploy_next.py")
    sys.exit(1)
wrapper = m.group(1)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
sftp = client.open_sftp()
with sftp.file(REMOTE, "w") as f:
    f.write(wrapper)
print("Uploaded server-wrapper.js with built-in watchdog")

try:
    with sftp.file("/home/u461432591/domains/felcin.com/nodejs/tmp/restart.txt", "w") as f:
        f.write(str(time.time()))
    print("Restart signal sent")
except Exception as e:
    print(f"restart.txt: {e}")

sftp.close()
client.close()
print("Done.")
