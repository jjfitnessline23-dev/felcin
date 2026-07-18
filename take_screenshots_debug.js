const puppeteer = require("puppeteer");

const WIDTH = 1290;
const HEIGHT = 2796;

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    protocolTimeout: 300000,
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 },
    args: [`--window-size=${WIDTH},${HEIGHT + 100}`, "--no-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 });

  // Capture browser console logs
  page.on("console", msg => console.log("BROWSER:", msg.text()));

  console.log("Opening login page...");
  await page.goto("https://felcin.com/login.html", { waitUntil: "networkidle2", timeout: 30000 });
  console.log("Please log in now...");

  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 180000 });
  const urlAfterLogin = page.url();
  console.log("Navigation fired. Current URL:", urlAfterLogin);
  await new Promise(r => setTimeout(r, 3000));

  // Check Firebase auth state on current page
  const authState = await page.evaluate(() => {
    return new Promise(resolve => {
      if (typeof firebase === "undefined") { resolve({ error: "firebase undefined" }); return; }
      const user = firebase.auth().currentUser;
      if (user) {
        resolve({ uid: user.uid, email: user.email, loggedIn: true });
      } else {
        firebase.auth().onAuthStateChanged(u => {
          resolve(u ? { uid: u.uid, email: u.email, loggedIn: true } : { loggedIn: false });
        });
        setTimeout(() => resolve({ loggedIn: false, timeout: true }), 5000);
      }
    });
  });
  console.log("Auth state on feed page:", authState);

  // Check IndexedDB keys for Firebase
  const idbKeys = await page.evaluate(async () => {
    return new Promise(resolve => {
      const req = indexedDB.open("firebaseLocalStorageDb");
      req.onsuccess = e => {
        const db = e.target.result;
        const stores = Array.from(db.objectStoreNames);
        if (!stores.length) { resolve({ stores: [] }); return; }
        const tx = db.transaction(stores[0], "readonly");
        const store = tx.objectStore(stores[0]);
        const allReq = store.getAll();
        allReq.onsuccess = () => resolve({ stores, keys: allReq.result.map(r => r.fbase_key || r.key || JSON.stringify(r)).slice(0, 5) });
        allReq.onerror = () => resolve({ stores, error: "getAll failed" });
      };
      req.onerror = () => resolve({ error: "indexedDB open failed" });
    });
  });
  console.log("IndexedDB Firebase keys:", JSON.stringify(idbKeys));

  // Now navigate to feed and check again
  console.log("\nNavigating to feed page...");
  await page.goto("https://felcin.com/", { waitUntil: "networkidle2", timeout: 40000 });
  await new Promise(r => setTimeout(r, 3000));
  const currentUrl2 = page.url();
  console.log("URL after feed navigation:", currentUrl2);

  const authState2 = await page.evaluate(() => {
    return new Promise(resolve => {
      if (typeof firebase === "undefined") { resolve({ error: "firebase undefined" }); return; }
      const user = firebase.auth().currentUser;
      if (user) {
        resolve({ uid: user.uid, email: user.email, loggedIn: true });
      } else {
        firebase.auth().onAuthStateChanged(u => {
          resolve(u ? { uid: u.uid, email: u.email, loggedIn: true } : { loggedIn: false });
        });
        setTimeout(() => resolve({ loggedIn: false, timeout: true }), 5000);
      }
    });
  });
  console.log("Auth state on feed (second load):", authState2);

  const hasLoginForm = await page.evaluate(() => !!document.querySelector("#login-form, #login-btn"));
  console.log("Login form visible:", hasLoginForm);

  await browser.close();
})();
