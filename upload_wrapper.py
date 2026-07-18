import paramiko, sys, time
sys.stdout.reconfigure(encoding="utf-8")

HOST = "82.25.87.145"; PORT = 65002; USER = "u461432591"; PASS = "JJ@dagym1!"
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
sftp = client.open_sftp()

NEW_WRAPPER = r"""#!/usr/bin/env node
/**
 * Felcin process manager — Passenger starts this instead of server.js directly.
 * Spawns server.js as a child and auto-restarts it on any crash.
 * The wrapper itself stays alive so Passenger never tries to spawn a new instance.
 */
const { spawn, execSync } = require("child_process");
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

// Kill any previous wrapper
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

// Kill any previous child
try {
  if (fs.existsSync(CHILD_PID_FILE)) {
    const oldChild = parseInt(fs.readFileSync(CHILD_PID_FILE, "utf8").trim(), 10);
    if (!isNaN(oldChild) && isRunning(oldChild)) {
      try { process.kill(oldChild, "SIGKILL"); } catch {}
    }
  }
} catch {}

// Kill anything holding port 3000
try { execSync("fuser -k 3000/tcp 2>/dev/null", { timeout: 3000 }); } catch {}

// Register own PID
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
"""

remote_path = "/home/u461432591/domains/felcin.com/nodejs/server-wrapper.js"
with sftp.file(remote_path, "w") as f:
    f.write(NEW_WRAPPER)
print("Uploaded new server-wrapper.js")

# Trigger restart
def run(cmd):
    _, o, _ = client.exec_command(cmd)
    return o.read().decode("utf-8", errors="replace").strip()

run("date +%s > /home/u461432591/domains/felcin.com/nodejs/tmp/restart.txt")
run("pkill -f 'next-server' 2>/dev/null; true")
print("Restart triggered. Waiting 35 seconds...")

time.sleep(35)

# Hit the origin to trigger Passenger boot
run("curl -s -o /dev/null --max-time 45 --resolve 'felcin.com:80:82.25.87.145' http://felcin.com/ &")
time.sleep(15)

print("Wrapper PID:  ", run("cat /tmp/felcin-next.pid 2>/dev/null || echo NONE"))
print("Child PID:    ", run("cat /tmp/felcin-next-child.pid 2>/dev/null || echo NONE"))
print("Processes:    \n", run("ps -eo pid,ppid,cmd | grep -E 'node|next' | grep -v grep"))
print("Log:\n", run("tail -20 /home/u461432591/.cagefs/tmp/felcin_node.log 2>/dev/null || echo EMPTY"))
print("HTTP:", run("curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://felcin.com/"))

sftp.close()
client.close()
