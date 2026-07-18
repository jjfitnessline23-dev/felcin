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
  console.log("Connecting to Chrome...");
  const browser = await puppeteer.connect({
    browserURL: "http://localhost:9222",
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 },
  });

  const allPages = await browser.pages();
  const page = allPages.find(p => p.url().includes("felcin.com")) || allPages[0];
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 });
  console.log("Connected! Current page:", page.url());
  console.log("Starting screenshots...\n");

  for (const p of PAGES) {
    try {
      console.log(`Navigating to ${p.url} ...`);
      await page.goto(p.url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 4000));

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
