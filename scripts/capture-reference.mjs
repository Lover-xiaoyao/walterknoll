import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const output = new URL("../artifacts/reference/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const measurements = [];
try {
  for (const [name, path] of [
    ["home", ""],
    ["products", "/products"],
    ["chairs", "/products/chairs-barstools"],
    ["materials", "/materials"],
    ["about", "/about"],
  ]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.goto(`https://www.walterknoll.info/en${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(1200);
    measurements.push({
      name,
      data: await page.evaluate(() => ({
        title: document.title,
        header: [...document.querySelectorAll("header")].map((el) => ({
          class: el.className,
          height: el.offsetHeight,
        })),
        headings: [...document.querySelectorAll("h1,h2")]
          .slice(0, 6)
          .map((el) => ({
            text: el.innerText,
            font: getComputedStyle(el).fontFamily,
            size: getComputedStyle(el).fontSize,
          })),
        bodyWidth: document.body.scrollWidth,
      })),
    });
    await page.screenshot({
      path: new URL(`${name}-desktop.png`, output).pathname,
    });
    if (name === "home") {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: new URL("home-mobile.png", output).pathname,
      });
    }
    await page.close();
    console.log(`Captured ${name}`);
  }
} finally {
  await browser.close();
  await writeFile(
    new URL("measurements.json", output),
    JSON.stringify(measurements, null, 2),
  );
}
