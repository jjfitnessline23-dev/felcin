"""
Deploy Felcin Next.js app to Hostinger.

Before running:
  cd C:\\Users\\johnj\\felcin-next
  npm run build
  xcopy /E /I /Y .next\\static .next\\standalone\\.next\\static
  xcopy /E /I /Y public .next\\standalone\\public

Then run this script from C:\\Users\\johnj\\felcin:
  python deploy_next.py
"""

import paramiko
import os
import sys

STANDALONE = r"C:\Users\johnj\felcin-next\.next\standalone"
REMOTE_NODE = "/home/u461432591/domains/felcin.com/nodejs"
REMOTE_PH   = "/home/u461432591/domains/felcin.com/public_html"

HOST = "82.25.87.145"
PORT = 65002
USER = "u461432591"
PASS = "JJ@dagym1!"

def sftp_upload_dir(sftp, local_dir, remote_dir):
    """Recursively upload a local directory to remote."""
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        sftp.mkdir(remote_dir)

    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = remote_dir + "/" + item
        if os.path.isdir(local_path):
            sftp_upload_dir(sftp, local_path, remote_path)
        else:
            try:
                sftp.put(local_path, remote_path)
            except Exception as e:
                print(f"  WARN: {remote_path}: {e}")

def main():
    print("Connecting to Hostinger...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=60)
    sftp = client.open_sftp()
    print("Connected.")

    # Upload everything from .next/standalone → nodejs/
    print(f"\nUploading Next.js standalone to {REMOTE_NODE}/ ...")
    sftp_upload_dir(sftp, STANDALONE, REMOTE_NODE)
    print("Next.js app uploaded.")

    # Always overwrite server-wrapper.js with the correct process-manager version.
    # npm run build regenerates .next/standalone and restores the old wrapper,
    # so we write the correct one here every deploy.
    SERVER_WRAPPER = r"""#!/usr/bin/env node
/**
 * Felcin process manager — Passenger starts this instead of server.js directly.
 * Spawns server.js as a child, auto-restarts it on any crash, and runs a
 * built-in watchdog that pings port 3000 every 2 minutes and force-restarts
 * the child if it stops responding.
 */
const { spawn, execSync } = require("child_process");
const http = require("http");
const fs   = require("fs");
const path = require("path");

const PID_FILE       = "/tmp/felcin-next.pid";
const CHILD_PID_FILE = "/tmp/felcin-next-child.pid";
const LOG_FILE       = "/home/u461432591/.cagefs/tmp/felcin_node.log";
const MAX_LOG_BYTES  = 256 * 1024;

function log(msg) {
  const line = `${new Date().toISOString()} [wrapper] ${msg}\n`;
  try {
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) {
      const lines = fs.readFileSync(LOG_FILE, "utf8").split("\n");
      fs.writeFileSync(LOG_FILE, lines.slice(-500).join("\n"));
    }
    fs.appendFileSync(LOG_FILE, line);
  } catch {}
  process.stdout.write(line);
}

function isRunning(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function busyWait(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch {}
}

try {
  if (fs.existsSync(PID_FILE)) {
    const oldPid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
    if (!isNaN(oldPid) && oldPid !== process.pid && isRunning(oldPid)) {
      log(`Killing old wrapper PID ${oldPid}`);
      try { process.kill(oldPid, "SIGKILL"); } catch {}
      const t0 = Date.now();
      while (isRunning(oldPid) && Date.now() - t0 < 3000) busyWait(100);
    }
  }
} catch {}

try {
  if (fs.existsSync(CHILD_PID_FILE)) {
    const oldChild = parseInt(fs.readFileSync(CHILD_PID_FILE, "utf8").trim(), 10);
    if (!isNaN(oldChild) && isRunning(oldChild)) {
      try { process.kill(oldChild, "SIGKILL"); } catch {}
    }
  }
} catch {}

try { execSync("fuser -k 3000/tcp 2>/dev/null", { timeout: 3000 }); } catch {}

fs.writeFileSync(PID_FILE, String(process.pid));
log(`Wrapper started PID=${process.pid} node=${process.execPath}`);

let currentChild = null;
let restartCount = 0;
let shuttingDown = false;

function startServer() {
  if (shuttingDown) return;
  const child = spawn(
    process.execPath,
    [path.join(__dirname, "server.js")],
    {
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "production", PORT: "3000", HOSTNAME: "0.0.0.0" },
      cwd: __dirname,
    }
  );
  currentChild = child;
  try { fs.writeFileSync(CHILD_PID_FILE, String(child.pid)); } catch {}
  log(`server.js started PID=${child.pid} restart#=${restartCount}`);

  child.on("error", (err) => log(`spawn error: ${err.message}`));
  child.on("exit", (code, signal) => {
    currentChild = null;
    try { fs.unlinkSync(CHILD_PID_FILE); } catch {}
    if (shuttingDown || signal === "SIGTERM" || signal === "SIGINT") {
      log(`server.js stopped cleanly (${signal || code})`);
      return;
    }
    restartCount++;
    const delay = Math.min(2000 * Math.pow(2, Math.min(restartCount - 1, 4)), 30000);
    log(`server.js crashed code=${code} signal=${signal} — restarting in ${delay}ms (#${restartCount})`);
    setTimeout(startServer, delay);
  });
}

function shutdown(sig) {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`Received ${sig} — shutting down`);
  if (currentChild) {
    try { currentChild.kill("SIGTERM"); } catch {}
    setTimeout(() => { try { if (currentChild) currentChild.kill("SIGKILL"); } catch {} }, 3000);
  }
  try { fs.unlinkSync(PID_FILE); } catch {}
  try { fs.unlinkSync(CHILD_PID_FILE); } catch {}
  setTimeout(() => process.exit(0), 3500);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => log(`uncaughtException: ${err.stack || err.message}`));
process.on("unhandledRejection", (r) => log(`unhandledRejection: ${r}`));
process.on("exit", () => {
  try { fs.unlinkSync(PID_FILE); } catch {}
  try { fs.unlinkSync(CHILD_PID_FILE); } catch {}
});

startServer();

// ── Built-in watchdog ──────────────────────────────────────────────────────
// Waits 60s for the server to finish booting, then pings port 3000 every
// 2 minutes. If the request errors or times out, it kills the child so the
// exit handler above will restart it automatically.
const WATCHDOG_INTERVAL_MS = 2 * 60 * 1000;
const WATCHDOG_TIMEOUT_MS  = 20 * 1000;

function restartChild() {
  if (shuttingDown) return;
  if (currentChild) {
    log("watchdog: killing child to force restart");
    try { currentChild.kill("SIGKILL"); } catch {}
    // The 'exit' handler on the child will call startServer() after a short delay.
  } else {
    startServer();
  }
}

function healthCheck() {
  if (shuttingDown) return;
  const req = http.get(
    { host: "127.0.0.1", port: 3000, path: "/", timeout: WATCHDOG_TIMEOUT_MS },
    (res) => {
      res.resume(); // drain body so the socket closes
      if (res.statusCode >= 500) {
        log(`watchdog: HTTP ${res.statusCode} — triggering restart`);
        restartChild();
      }
      // 2xx/3xx/4xx are all fine — server is alive
    }
  );
  req.on("timeout", () => {
    req.destroy();
    log("watchdog: request timed out — triggering restart");
    restartChild();
  });
  req.on("error", (err) => {
    log(`watchdog: request error (${err.message}) — triggering restart`);
    restartChild();
  });
}

// First check after 60s (boot grace period), then every 2 minutes.
setTimeout(() => {
  healthCheck();
  setInterval(healthCheck, WATCHDOG_INTERVAL_MS);
}, 60 * 1000);
"""
    with sftp.file(REMOTE_NODE + "/server-wrapper.js", "w") as f:
        f.write(SERVER_WRAPPER)
    print("OK: server-wrapper.js (process manager)")

    # Keep upload-media.php in public_html (already there, just ensure it's current)
    print("\nUploading upload-media.php to public_html...")
    sftp.put(
        r"C:\Users\johnj\.claude\upload-media.php",
        REMOTE_PH + "/upload-media.php"
    )
    print("OK: upload-media.php")

    # Always write correct .htaccess — server-wrapper.js is the startup file so it
    # kills any existing process before starting, preventing port-3000 conflicts.
    HTACCESS = """<IfModule mod_passenger.c>
  PassengerAppRoot /home/u461432591/domains/felcin.com/nodejs
  PassengerBaseURI /
  PassengerNodejs /opt/alt/alt-nodejs22/root/usr/bin/node
  PassengerAppType node
  PassengerStartupFile server-wrapper.js
  PassengerStartTimeout 120
  PassengerMaxInstances 1
  PassengerMaxPoolSize 1
  PassengerMinInstances 1
  PassengerMaxIdleTime 0
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json text/plain text/xml
</IfModule>

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
"""
    with sftp.file(REMOTE_PH + "/.htaccess", "w") as f:
        f.write(HTACCESS)
    print("OK: .htaccess (PassengerMaxInstances 1)")

    # Touch restart file for Passenger-style restarts
    try:
        sftp.mkdir(REMOTE_NODE + "/tmp")
    except:
        pass
    try:
        with sftp.file(REMOTE_NODE + "/tmp/restart.txt", "w") as f:
            import time
            f.write(str(time.time()))
        print("Restart signal sent.")
    except Exception as e:
        print(f"Note: Could not write restart.txt: {e}")

    sftp.close()
    client.close()
    print("\nDone! Next.js app deployed to felcin.com.")
    print("Wait 30-60 seconds for Hostinger to restart the Node.js app.")

if __name__ == "__main__":
    main()
