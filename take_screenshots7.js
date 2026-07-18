const puppeteer = require("puppeteer");
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const readline = require("readline");

const WIDTH = 1290;
const HEIGHT = 2796;
const OUT_DIR = path.join(__dirname, "screenshots");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const PAGES = [
  { name: "1-feed",          url: "https://felcin.com/" },
  { name: "2-reels",         url: "https://felcin.com/reels.html" },
  { name: "3-explore",       url: "https://felcin.com/explore.html" },
  { name: "4-profile",       url: "https://felcin.com/user-profile.html" },
  { name: "5-notifications", url: "https://felcin.com/notifications.html" },
  { name: "6-chats",         url: "https://felcin.com/private-chats.html" },
];

const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
];

function findChrome() {
  for (const p of CHROME_PATHS) if (fs.existsSync(p)) return p;
  return null;
}

function waitForEnter() {
  const rl = readline.createInterface({ input: process.stdin });
  return new Promise(resolve => rl.once("line", () => { rl.close(); resolve(); }));
}

(async () => {
  const chromePath = findChrome();
  if (!chromePath) {
    console.error("Chrome not found. Please install Google Chrome.");
    process.exit(1);
  }

  const profileDir = path.join(__dirname, ".chrome-profile");

  console.log("Opening Chrome — please log in to felcin.com...");
  const args = [
    `--remote-debugging-port=9222`,
    `--user-data-dir="${profileDir}"`,
    `--window-size=${WIDTH},${HEIGHT + 100}`,
    `"https://felcin.com/login.html"`,
  ].join(" ");
  execSync(`start "" "${chromePath}" ${args}`, { shell: true });

  console.log("\nChrome opened. Log in to felcin.com, then press ENTER here to take screenshots.");
  await waitForEnter();

  console.log("Connecting to Chrome...");
  const browser = await puppeteer.connect({
    browserURL: "http://localhost:9222",
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 },
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 });

  console.log("Connected! Starting screenshots...\n");

  for (const p of PAGES) {
    try {
      console.log(`Navigating to ${p.url} ...`);
      await page.goto(p.url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));

      const onLogin = await page.evaluate(() => !!document.querySelector("#login-form, #login-btn"));
      if (onLogin) {
        console.log(`  SKIP ${p.name}: still showing login`);
        continue;
      }

      const file = path.join(OUT_DIR, `${p.name}.png`);
      await page.screenshot({ path: file, fullPage: false, timeout: 90000 });
      console.log(`  Saved: screenshots/${p.name}.png`);
    } catch (e) {
      console.log(`  FAILED ${p.name}: ${e.message}`);
    }
  }

  console.log("\nAll done! Screenshots saved to felcin/screenshots/");
  await browser.disconnect();
})();
