const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

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

async function waitForAuth(page, timeout = 12000) {
  // Wait until the page is NOT showing the login form (Firebase auth settled)
  await page.waitForFunction(
    () => {
      const onLogin = !!document.querySelector("#login-form, #login-btn");
      const hasContent = !!document.querySelector("nav, .post-card, video, .tile, .notif, .chat-item, .convo-item, #feed, main");
      return !onLogin || hasContent;
    },
    { timeout, polling: 500 }
  );
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    protocolTimeout: 90000,
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 },
    args: [`--window-size=${WIDTH},${HEIGHT + 100}`, "--no-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 });

  // Step 1: go to login page, wait for user to log in
  console.log("Opening login page — please log in...");
  await page.goto("https://felcin.com/login.html", { waitUntil: "networkidle2" });

  await page.waitForFunction(
    () => !window.location.href.includes("login"),
    { timeout: 180000, polling: 500 }
  );
  console.log("Redirected away from login. Waiting for app to load...");

  // Wait for feed to actually render
  await waitForAuth(page, 15000);
  await new Promise(r => setTimeout(r, 3000));
  console.log("App loaded! Starting screenshots...\n");

  for (const p of PAGES) {
    try {
      console.log(`Navigating to ${p.url} ...`);

      // Use JS navigation to stay in same browsing context (preserves Firebase in-memory state)
      await page.evaluate(u => { window.location.href = u; }, p.url);

      // Wait for navigation to complete
      try {
        await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 });
      } catch (_) {}

      // Wait for Firebase auth to settle and page to render
      await waitForAuth(page, 12000).catch(() => {});
      await new Promise(r => setTimeout(r, 3000));

      // Check we're not on login
      const onLogin = await page.evaluate(() => !!document.querySelector("#login-form, #login-btn"));
      if (onLogin) {
        console.log(`  SKIP ${p.name}: still showing login form — session may have expired`);
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
  await browser.close();
})();
