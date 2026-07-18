const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

// 6.7-inch iPhone 16 Pro Max — required by App Store
const WIDTH = 1290;
const HEIGHT = 2796;

const PAGES = [
  { name: "1-feed",             url: "https://felcin.com/" },
  { name: "2-reels",            url: "https://felcin.com/reels" },
  { name: "3-explore",          url: "https://felcin.com/explore" },
  { name: "4-profile",          url: "https://felcin.com/user-profile" },
  { name: "5-notifications",    url: "https://felcin.com/notifications" },
  { name: "6-private-chats",    url: "https://felcin.com/private-chats" },
];

const OUT_DIR = path.join(__dirname, "screenshots");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 },
    args: [
      `--window-size=${WIDTH},${HEIGHT + 100}`,
      "--no-sandbox",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 });

  // Open login page and wait for user to log in
  console.log("Opening felcin.com — please log in...");
  await page.goto("https://felcin.com/", { waitUntil: "networkidle2" });

  // Wait until the user is past the login screen (URL changes or login form disappears)
  console.log("Waiting for you to log in...");
  await page.waitForFunction(
    () => !document.querySelector("#login-form, #auth-form, form[id*='login'], .login-container, #sign-in-btn"),
    { timeout: 120000 }
  );
  console.log("Logged in! Starting screenshots...\n");

  // Give the feed a moment to load content
  await new Promise(r => setTimeout(r, 2000));

  for (const p of PAGES) {
    try {
      console.log(`Navigating to ${p.url} ...`);
      await page.goto(p.url, { waitUntil: "networkidle2", timeout: 20000 });
      await new Promise(r => setTimeout(r, 2500));

      const file = path.join(OUT_DIR, `${p.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log(`  Saved: screenshots/${p.name}.png`);
    } catch (e) {
      console.log(`  SKIP ${p.name}: ${e.message}`);
    }
  }

  console.log("\nAll done! Screenshots saved to felcin/screenshots/");
  console.log("You can now upload them to App Store Connect.");
  await browser.close();
})();
