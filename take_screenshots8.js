const puppeteer = require("puppeteer");
const http = require("http");
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const WIDTH = 1290;
const HEIGHT = 2796;
const OUT_DIR = path.join(__dirname, "screenshots");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE = path.join(__dirname, ".chrome-profile");

const PAGES = [
  { name: "1-feed",          url: "https://felcin.com/" },
  { name: "2-reels",         url: "https://felcin.com/reels.html" },
  { name: "3-explore",       url: "https://felcin.com/explore.html" },
  { name: "4-profile",       url: "https://felcin.com/user-profile.html" },
  { name: "5-notifications", url: "https://felcin.com/notifications.html" },
  { name: "6-chats",         url: "https://felcin.com/private-chats.html" },
];

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on("error", reject);
  });
}

async function waitForLogin(maxWaitMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const tabs = await fetchJSON("http://localhost:9222/json");
      const activeTab = tabs.find(t => t.type === "page");
      if (activeTab && !activeTab.url.includes("login")) {
        return true;
      }
      process.stdout.write(".");
    } catch (_) {
      process.stdout.write("x");
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
}

(async () => {
  // Kill any existing Chrome with remote debugging
  try { execSync("taskkill /F /IM chrome.exe /T 2>nul", { shell: true }); } catch (_) {}
  await new Promise(r => setTimeout(r, 1000));

  console.log("Opening Chrome — please log in to felcin.com...");
  execSync(
    `start "" "${CHROME}" --remote-debugging-port=9222 --user-data-dir="${PROFILE}" "https://felcin.com/login.html"`,
    { shell: true }
  );

  console.log("Waiting for you to log in (watching Chrome automatically)...");
  const loggedIn = await waitForLogin(180000);
  if (!loggedIn) {
    console.log("\nTimed out waiting for login.");
    process.exit(1);
  }

  console.log("\nLogin detected! Connecting and taking screenshots...\n");
  await new Promise(r => setTimeout(r, 3000));

  const browser = await puppeteer.connect({
    browserURL: "http://localhost:9222",
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 },
  });

  const allPages = await browser.pages();
  const page = allPages.find(p => p.url().includes("felcin.com")) || allPages[0];
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 });

  for (const p of PAGES) {
    try {
      console.log(`Navigating to ${p.url} ...`);
      await page.goto(p.url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));

      const onLogin = await page.evaluate(() => !!document.querySelector("#login-form, #login-btn"));
      if (onLogin) {
        console.log(`  SKIP ${p.name}: showing login`);
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
