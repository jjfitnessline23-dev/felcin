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

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    protocolTimeout: 300000,
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 },
    args: [`--window-size=${WIDTH},${HEIGHT + 100}`, "--no-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 });

  // Go to login, wait for full network idle (Firebase init complete)
  console.log("Opening login page — please log in...");
  await page.goto("https://felcin.com/login.html", { waitUntil: "networkidle2", timeout: 30000 });
  console.log("Waiting for you to log in (up to 3 minutes)...");

  // Wait for the login→feed navigation AND for the feed page to fully settle (networkidle2)
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 180000 });
  console.log("Login detected. Waiting 5s for Firebase auth to finish writing...");
  await new Promise(r => setTimeout(r, 5000));

  console.log("Starting screenshots...\n");

  for (const p of PAGES) {
    try {
      console.log(`Navigating to ${p.url} ...`);

      // networkidle2: waits until Firebase re-initialises, reads IndexedDB, and renders page
      await page.goto(p.url, { waitUntil: "networkidle2", timeout: 40000 });
      await new Promise(r => setTimeout(r, 3000));

      // If app redirected us to login, bail
      const onLogin = await page.evaluate(() => !!document.querySelector("#login-form, #login-btn"));
      if (onLogin) {
        console.log(`  SKIP ${p.name}: still showing login — Firebase auth not restored`);
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
