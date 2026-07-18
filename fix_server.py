import paramiko, sys
sys.stdout.reconfigure(encoding="utf-8")

HOST = "82.25.87.145"; PORT = 65002; USER = "u461432591"; PASS = "JJ@dagym1!"
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
sftp = client.open_sftp()

# Upload improved watchdog
sftp.put(r"C:\Users\johnj\felcin\felcin_watchdog.sh", "/home/u461432591/felcin_watchdog.sh")
_, stdout, _ = client.exec_command("chmod +x /home/u461432591/felcin_watchdog.sh && echo OK")
print("Watchdog uploaded:", stdout.read().decode().strip())

# Remove ecosystem.config.js — PM2 was killing the app at 300MB memory
_, stdout, stderr = client.exec_command(
    "rm -f /home/u461432591/domains/felcin.com/nodejs/ecosystem.config.js && echo REMOVED"
)
print("ecosystem.config.js:", stdout.read().decode().strip(), stderr.read().decode().strip())

# Run watchdog once right now to confirm it works
_, stdout, stderr = client.exec_command("/home/u461432591/felcin_watchdog.sh && echo DONE")
out = stdout.read().decode("utf-8", errors="replace").strip()
err = stderr.read().decode("utf-8", errors="replace").strip()
print("Watchdog test run:", out or "(no stdout)", err or "")

# Show last few lines of watchdog log
_, stdout, _ = client.exec_command("cat /home/u461432591/.cagefs/tmp/felcin_watchdog.log 2>/dev/null || echo NO_LOG_YET")
print("Watchdog log:", stdout.read().decode("utf-8", errors="replace").strip())

sftp.close()
client.close()
