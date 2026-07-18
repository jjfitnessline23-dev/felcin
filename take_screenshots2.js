const puppeteer = require("puppeteer");
const path = require("path");

const WIDTH = 1290;
const HEIGHT = 2796;
const OUT_DIR = path.join(__dirname, "screenshots");

const RETRY_PAGES = [
  { name: "1-feed",    url: "https://felcin.com/" },
  { name: "3-explore", url: "https://felcin.com/explore.html" },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    protocolTimeout: 60000,
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 },
    args: [`--window-size=${WIDTH},${HEIGHT + 100}`, "--no-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 });

  console.log("Opening felcin.com — please log in...");
  await page.goto("https://felcin.com/", { waitUntil: "networkidle2" });

  console.log("Waiting for login...");
  await page.waitForFunction(
    () => !document.querySelector("#login-form, #auth-form, form[id*='login'], .login-container, #sign-in-btn"),
    { timeout: 120000 }
  );
  console.log("Logged in! Capturing missing pages...\n");
  await new Promise(r => setTimeout(r, 3000));

  for (const p of RETRY_PAGES) {
    try {
      console.log(`Navigating to ${p.url} ...`);
      await page.goto(p.url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      const file = path.join(OUT_DIR, `${p.name}.png`);
      await page.screenshot({ path: file, fullPage: false, timeout: 60000 });
      console.log(`  Saved: screenshots/${p.name}.png`);
    } catch (e) {
      console.log(`  FAILED ${p.name}: ${e.message}`);
    }
  }

  console.log("\nDone!");
  await browser.close();
})();
