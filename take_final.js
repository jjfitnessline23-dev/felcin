const puppeteer = require("puppeteer");
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

// 6.9-inch iPhone slot in App Store Connect
const WIDTH = 1320;
const HEIGHT = 2868;
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

async function waitForChrome(maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try { await fetchJSON("http://localhost:9222/json"); return true; } catch (_) {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

(async () => {
  console.log("Opening Chrome with saved session...");
  execSync(
    `start "" "${CHROME}" --remote-debugging-port=9222 --user-data-dir="${PROFILE}" "https://felcin.com/"`,
    { shell: true }
  );

  console.log("Waiting for Chrome to start...");
  const ready = await waitForChrome(15000);
  if (!ready) { console.error("Chrome didn't start."); process.exit(1); }

  // Give Firebase time to restore auth from IndexedDB
  await new Promise(r => setTimeout(r, 6000));

  // Check if logged in
  const tabs = await fetchJSON("http://localhost:9222/json");
  const feedTab = tabs.find(t => t.type === "page" && t.url.includes("felcin.com"));
  console.log("Current tab:", feedTab ? feedTab.url : "unknown");

  if (feedTab && feedTab.url.includes("login")) {
    console.log("Session expired — please log in manually in the Chrome window, then wait 5 seconds.");
    await new Promise(r => setTimeout(r, 15000));
  }

  console.log("Connecting Puppeteer...");
  const browser = await puppeteer.connect({
    browserURL: "http://localhost:9222",
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 },
  });

  const allPages = await browser.pages();
  const page = allPages.find(p => p.url().includes("felcin.com")) || allPages[0];
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 });
  console.log("Connected. Taking screenshots at 1320x2868 (6.9-inch)...\n");

  for (const p of PAGES) {
    try {
      console.log(`Navigating to ${p.url} ...`);
      await page.goto(p.url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 4000));

      const onLogin = await page.evaluate(() => !!document.querySelector("#login-form, #login-btn"));
      if (onLogin) { console.log(`  SKIP ${p.name}: showing login`); continue; }

      const file = path.join(OUT_DIR, `${p.name}.png`);
      await page.screenshot({ path: file, fullPage: false, timeout: 90000 });
      console.log(`  Saved: ${p.name}.png`);
    } catch (e) {
      console.log(`  FAILED ${p.name}: ${e.message}`);
    }
  }

  console.log("\nDone! Upload the PNGs from felcin/screenshots/ to the 6.9-inch slot in App Store Connect.");
  await browser.disconnect();
})();
