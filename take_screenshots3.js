const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const WIDTH = 1290;
const HEIGHT = 2796;
const OUT_DIR = path.join(__dirname, "screenshots");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const PAGES = [
  { name: "1-feed",          url: "https://felcin.com/",               waitFor: ".post-card, .feed-post, #feed, .feed-wrap, nav" },
  { name: "2-reels",         url: "https://felcin.com/reels.html",     waitFor: "video, .reel, #reels-feed, nav" },
  { name: "3-explore",       url: "https://felcin.com/explore.html",   waitFor: ".explore, #explore, .grid, nav" },
  { name: "4-profile",       url: "https://felcin.com/user-profile.html", waitFor: ".profile, #profile, .tile, nav" },
  { name: "5-notifications", url: "https://felcin.com/notifications.html", waitFor: ".notif, #notifications, nav" },
  { name: "6-chats",         url: "https://felcin.com/private-chats.html", waitFor: ".chat, #conversations, nav" },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    protocolTimeout: 90000,
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 },
    args: [`--window-size=${WIDTH},${HEIGHT + 100}`, "--no-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 });

  // Go to login page
  console.log("Opening login page — please log in...");
  await page.goto("https://felcin.com/login.html", { waitUntil: "domcontentloaded" });

  // Wait until the login form disappears (user submitted login) AND a real app element appears
  console.log("Waiting for you to log in...");
  await page.waitForFunction(
    () => {
      const onLoginPage = !!document.querySelector("#login-form, #login-btn");
      return !onLoginPage;
    },
    { timeout: 180000 }
  );

  // Give Firebase auth + redirect a moment to settle
  await new Promise(r => setTimeout(r, 4000));
  console.log("Logged in! Starting screenshots...\n");

  for (const p of PAGES) {
    try {
      console.log(`Navigating to ${p.url} ...`);
      await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Check we didn't land back on login
      const currentUrl = page.url();
      if (currentUrl.includes("login")) {
        console.log(`  SKIP ${p.name}: redirected to login — session lost`);
        continue;
      }

      // Wait for something real to appear
      try {
        await page.waitForSelector(p.waitFor, { timeout: 8000 });
      } catch (_) {
        // Page might still look fine, just no exact selector — wait fixed time
        await new Promise(r => setTimeout(r, 3000));
      }

      await new Promise(r => setTimeout(r, 2000));

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
