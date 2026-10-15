import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const output = new URL("artifacts/verification/", root);
await mkdir(output, { recursive: true });
const base = process.env.TEST_BASE_URL || "http://localhost:4174";
let server;
if (!process.env.TEST_BASE_URL) {
  server = spawn(process.execPath, ["scripts/serve.mjs"], {
    cwd: fileURLToPath(root),
    env: { ...process.env, PORT: "4174" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (data) => {
      if (data.toString().includes("Local:")) resolve();
    });
    server.stderr.on("data", (data) => reject(new Error(data.toString())));
    server.on("error", reject);
  });
}
const browser = await chromium.launch({ headless: true });
const report = {
  baseCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: fileURLToPath(root),
    encoding: "utf8",
  }).trim(),
  workingTreeModified: !!execFileSync("git", ["status", "--porcelain"], {
    cwd: fileURLToPath(root),
    encoding: "utf8",
  }).trim(),
  observedAt: new Date().toISOString(),
  environment: { node: process.version, browser: browser.version() },
  checks: [],
  failures: [],
};
const files = [
  "index",
  "about",
  "products",
  "products-chairs",
  "materials",
  "materials-leathers",
  "magazine",
  "professionals",
  "sustainability",
  "contact",
];
const routes = Object.fromEntries(
  files.map((name) => [
    name,
    name === "index" ? "/index.html" : `/pages/${name}.html`,
  ]),
);
const pageNames = new Set(files.map((name) => `${name}.html`));
let page;
const errors = [];
const badRequests = [];
async function open(name) {
  const response = await page.goto(base + routes[name]);
  assert.equal(response.status(), 200);
}
async function check(name, action) {
  const before = errors.length;
  const requestBefore = badRequests.length;
  try {
    await action();
    assert.deepEqual(errors.slice(before), [], "Browser page errors");
    assert.deepEqual(
      badRequests.slice(requestBefore),
      [],
      "Failed local resources",
    );
    report.checks.push({ name, result: "pass" });
    console.log("PASS", name);
  } catch (error) {
    report.checks.push({ name, result: "fail", message: error.message });
    report.failures.push(name);
    console.error("FAIL", name, error.message);
  }
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().startsWith(base) && response.status() >= 400)
      badRequests.push(`${response.status()} ${response.url()}`);
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    for (const name of files)
      await check(`${name} renders at ${width}px`, async () => {
        await open(name);
        assert.equal(await page.locator("main").count(), 1);
        assert.equal(await page.locator("h1").count(), 1);
        await page.locator("img").evaluateAll((images) =>
          Promise.all(
            images.map((image) => {
              image.loading = "eager";
              return image.decode();
            }),
          ),
        );
        const layout = await page.evaluate(() => ({
          width: innerWidth,
          content: document.documentElement.scrollWidth,
          broken: [...document.images]
            .filter((image) => !image.naturalWidth)
            .map((image) => image.src),
        }));
        assert.ok(
          layout.content <= layout.width,
          `Horizontal overflow: ${layout.content} > ${layout.width}`,
        );
        assert.deepEqual(layout.broken, []);
        await page.screenshot({
          path: new URL(`${name}-${width}.png`, output).pathname,
          fullPage: true,
        });
        if (width === 390) {
          await page
            .getByRole("button", { name: "Open menu", exact: true })
            .click();
          assert.equal(await page.locator("#menuDialog").isVisible(), true);
          await page.keyboard.press("Escape");
          assert.equal(await page.locator("#menuDialog").isVisible(), false);
        }
      });
  }
  await check("root URL serves the homepage", async () => {
    const response = await page.goto(base + "/");
    assert.equal(response.status(), 200);
    assert.equal(await page.locator("h1").innerText(), "Ayabi Chair.");
  });
  await check("the mobile drawer uses the main navigation", async () => {
    await open("index");
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page
      .locator(".drawer-nav")
      .getByRole("link", { name: "Material Library" })
      .click();
    assert.ok(page.url().includes("materials.html"));
  });
  await check("every page link points at one of the ten pages", async () => {
    for (const name of files) {
      await open(name);
      const targets = await page.evaluate(() =>
        [...document.querySelectorAll("a[href]")]
          .map((link) => link.getAttribute("href"))
          .filter((href) => href && !href.startsWith("#") && !/^https?:|^tel:|^mailto:/.test(href))
          .map((href) => href.split(/[?#]/)[0].split("/").pop()),
      );
      const strangers = [...new Set(targets)].filter(
        (target) => !pageNames.has(target),
      );
      assert.deepEqual(strangers, [], `${name} links outside the ten pages`);
    }
  });
  await check("the lists are written into the HTML, not fetched", async () => {
    const plain = await browser.newContext({ javaScriptEnabled: false });
    const bare = await plain.newPage();
    await bare.goto(`${base}/pages/products.html`);
    assert.equal(await bare.locator(".product-card").count(), 59);
    await bare.goto(`${base}/pages/products-chairs.html`);
    assert.equal(await bare.locator(".product-card").count(), 35);
    await bare.goto(`${base}/pages/magazine.html`);
    assert.equal(await bare.locator(".article-row").count(), 9);
    await bare.goto(`${base}/index.html`);
    assert.ok((await bare.locator(".image-card").count()) > 0);
    await plain.close();
  });
  await check("filters, pagination and search change nothing", async () => {
    await open("products");
    const cards = await page.locator(".product-card").count();
    for (const selector of [".chips button", "#loadMore", "#resetFilters"]) {
      const control = page.locator(selector).first();
      if (await control.count())
        await control.click({ force: true }).catch(() => {});
    }
    await page.locator("#productSearch").fill("zzz").catch(() => {});
    assert.equal(await page.locator(".product-card").count(), cards);
    await open("products-chairs");
    const chairs = await page.locator(".product-card").count();
    for (const button of await page.locator(".pagination button").all())
      await button.click({ force: true }).catch(() => {});
    assert.equal(await page.locator(".product-card").count(), chairs);
  });
  await check("magazine tabs only switch what is visible", async () => {
    await open("magazine");
    assert.equal(await page.locator(".article-row").count(), 9);
    await page
      .getByRole("tab", { name: "News", exact: true })
      .click();
    assert.equal(await page.locator(".article-row").count(), 9);
    assert.equal(await page.locator(".article-row:visible").count(), 3);
    assert.match(await page.locator("#articleCount").innerText(), /3 stories/);
    await page.getByRole("tab", { name: "All Topics", exact: true }).click();
    assert.equal(await page.locator(".article-row:visible").count(), 9);
  });
  await check("cards lift and deepen their shadow on hover", async () => {
    await open("products");
    const card = page.locator(".product-card").first();
    const resting = await card.evaluate((el) => {
      const style = getComputedStyle(el);
      return { transform: style.transform, shadow: style.boxShadow };
    });
    await card.hover();
    const hovered = await card.evaluate((el) => {
      const style = getComputedStyle(el);
      return { transform: style.transform, shadow: style.boxShadow };
    });
    assert.notEqual(hovered.transform, resting.transform);
    assert.notEqual(hovered.shadow, resting.shadow);
    assert.notEqual(hovered.shadow, "none");
  });
  await check("inert controls still do nothing", async () => {
    for (const name of files) {
      await open(name);
      const targets = await page
        .locator('main [aria-disabled="true"], .site-footer [aria-disabled="true"]')
        .all();
      let clicked = 0;
      for (const target of targets) {
        if (clicked >= 10) break;
        if (!(await target.isVisible().catch(() => false))) continue;
        clicked++;
        await target.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
        const before = await page.evaluate(() => ({
          url: location.href,
          y: scrollY,
        }));
        await target.click({ force: true, noWaitAfter: true }).catch(() => {});
        const after = await page.evaluate(() => ({
          url: location.href,
          y: scrollY,
        }));
        assert.equal(after.url, before.url, `${name} navigated away`);
        assert.equal(after.y, before.y, `${name} jumped within the page`);
      }
      assert.ok(clicked > 0, `${name} had no inert control to click`);
    }
  });
  await check("downloads and map links stay inert", async () => {
    for (const name of files) {
      await open(name);
      const leftovers = await page.evaluate(() => ({
        downloads: document.querySelectorAll("a[download]").length,
        maps: [...document.querySelectorAll("a[href]")].filter((link) =>
          link.getAttribute("href").includes("maps.google"),
        ).length,
        storage: (() => {
          try {
            return Object.keys(localStorage).length;
          } catch {
            return 0;
          }
        })(),
      }));
      assert.deepEqual(leftovers, { downloads: 0, maps: 0, storage: 0 }, name);
    }
  });
} finally {
  report.browserErrors = errors;
  report.failedLocalRequests = badRequests;
  await writeFile(
    new URL("results.json", output),
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  server?.kill();
  console.log(
    `Results: ${report.checks.length - report.failures.length}/${report.checks.length} passed. Report: artifacts/verification/results.json`,
  );
  if (report.failures.length) process.exitCode = 1;
}
