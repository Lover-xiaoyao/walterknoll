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
let page;
const errors = [];
const badRequests = [];
async function open(name) {
  const response = await page.goto(base + routes[name]);
  assert.equal(response.status(), 200);
  if (name.startsWith("products"))
    await page.locator(".product-card").first().waitFor();
  if (name === "magazine") await page.locator(".article-row").first().waitFor();
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
  await check("only the drawer dialog is left", async () => {
    for (const name of files) {
      await open(name);
      const dialogs = await page.evaluate(() =>
        [...document.querySelectorAll("dialog")].map((dialog) => dialog.id),
      );
      assert.deepEqual(dialogs, ["menuDialog"], name);
    }
  });
  await check("no interaction hooks remain in the pages", async () => {
    for (const name of files) {
      await open(name);
      const hooks = await page.evaluate(() => ({
        wishlist: document.querySelectorAll(
          "[data-favorite], [data-product-open]",
        ).length,
        articles: document.querySelectorAll("[data-article]").length,
        materials: document.querySelectorAll(
          "[data-material], [data-swatch]",
        ).length,
        filters: document.querySelectorAll("[data-category], [data-topic]")
          .length,
        carousel: document.querySelectorAll(
          "[data-slide], [data-slide-pause], [data-slide-next], [data-slide-number]",
        ).length,
        backToTop: document.querySelectorAll("[data-top]").length,
        drawer: document.querySelectorAll('[data-open="menuDialog"]').length,
      }));
      assert.deepEqual(
        hooks,
        {
          wishlist: 0,
          articles: 0,
          materials: 0,
          filters: 0,
          carousel: 0,
          backToTop: 0,
          drawer: 1,
        },
        name,
      );
    }
  });
  await check("nothing outside the main navigation navigates", async () => {
    for (const name of files) {
      await open(name);
      const targets = await page
        .locator(
          'main [aria-disabled="true"], .site-footer a[aria-disabled="true"], ' +
            '.header-tools [aria-disabled="true"]',
        )
        .all();
      let clicked = 0;
      for (const target of targets) {
        if (clicked >= 12) break;
        // hidden controls are skipped: the click would only time out
        if (!(await target.isVisible().catch(() => false))) continue;
        clicked++;
        await target
          .scrollIntoViewIfNeeded({ timeout: 2000 })
          .catch(() => {});
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
  await check("every remaining link is navigation or an external source", async () => {
    for (const name of files) {
      await open(name);
      const offenders = await page.evaluate(() =>
        [...document.querySelectorAll("a[href]")]
          .filter((link) => {
            const href = link.getAttribute("href");
            if (href.startsWith("#")) return false;
            if (/^https?:/.test(href)) return false;
            // only page targets matter here; downloads and assets are fine
            if (!/\.html(?:[?#]|$)/.test(href)) return false;
            return !link.closest(
              ".primary-nav, .drawer-nav, .breadcrumbs, .logo, .footer-logo, " +
                ".skip-link",
            );
          })
          .map((link) => link.getAttribute("href")),
      );
      assert.deepEqual(offenders, [], name);
    }
  });
  await check("the lists stay complete without pagination", async () => {
    await open("products");
    assert.equal(await page.locator(".product-card").count(), 12);
    await open("products-chairs");
    assert.equal(await page.locator(".product-card").count(), 9);
    assert.match(await page.locator("#pageSummary").innerText(), /Page 1 of 4/);
    await open("magazine");
    assert.equal(await page.locator(".article-row").count(), 9);
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
