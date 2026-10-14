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
async function open(name, query = "") {
  const response = await page.goto(base + routes[name] + query);
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
    acceptDownloads: true,
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
  await check("mobile drawer navigates to a page", async () => {
    await open("index");
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page
      .locator(".drawer-nav")
      .getByRole("link", { name: "Material Library" })
      .click();
    assert.ok(page.url().includes("materials.html"));
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await check("slideshow switches and pauses", async () => {
    await open("index");
    await page.locator("[data-slide-next]").click();
    assert.equal(await page.locator("h1").innerText(), "Amorin Table.");
    await page.locator('[data-slide="0"]').click();
    assert.equal(await page.locator("h1").innerText(), "Ayabi Chair.");
    await page.getByRole("button", { name: "Play slideshow" }).click();
    assert.equal(
      await page.getByRole("button", { name: "Pause slideshow" }).count(),
      1,
    );
    await page.getByRole("button", { name: "Pause slideshow" }).click();
  });
  await check("product filters, empty state and load more", async () => {
    await open("products");
    assert.equal(await page.locator(".product-card").count(), 12);
    await page.locator("#loadMore").click();
    assert.equal(await page.locator(".product-card").count(), 24);
    await page.locator("#categoryFilter").selectOption("tables");
    assert.equal(await page.locator(".product-card").count(), 3);
    assert.match(
      await page.locator("#productCount").innerText(),
      /^3 products/,
    );
    await page.locator("#designerFilter").selectOption("Wolfgang C. R. Mezger");
    assert.equal(await page.locator(".product-card").count(), 1);
    assert.equal(
      await page.locator(".product-card h3").innerText(),
      "Amorin Table",
    );
    await page.locator("#productSearch").fill("no matching product");
    assert.equal(await page.locator("#productEmpty").isVisible(), true);
    await page.locator("#resetFilters").click();
    assert.equal(await page.locator(".product-card").count(), 12);
  });
  await check("product preview and persistent wish list", async () => {
    await open("products-chairs");
    await page.locator('[data-product-open="ayabi-chair"]').first().click();
    assert.equal(await page.locator("#detailTitle").innerText(), "Ayabi Chair");
    await page.locator("#detailDialog [data-close]").click();
    await page.locator('#productGrid [data-favorite="ayabi-chair"]').click();
    assert.equal(
      await page
        .locator('#productGrid [data-favorite="ayabi-chair"]')
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.reload();
    await page.locator(".product-card").first().waitFor();
    assert.equal(
      await page
        .locator('#productGrid [data-favorite="ayabi-chair"]')
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.getByRole("button", { name: "Wish list", exact: true }).click();
    assert.match(
      await page.locator("#wishlistContent").innerText(),
      /Ayabi Chair/,
    );
    await page.locator("#wishlistContent [data-favorite]").click();
    assert.match(
      await page.locator("#wishlistContent").innerText(),
      /Your collection starts here/,
    );
    await page.keyboard.press("Escape");
  });
  await check(
    "chairs pagination has distinct products and bounds",
    async () => {
      await open("products-chairs");
      assert.equal(await page.locator(".product-card").count(), 9);
      assert.match(
        await page.locator("#productCount").innerText(),
        /^35 products/,
      );
      assert.equal(
        await page.getByRole("button", { name: "Previous page" }).isDisabled(),
        true,
      );
      const first = await page.locator(".product-card h3").first().innerText();
      await page.getByRole("button", { name: "2", exact: true }).click();
      assert.notEqual(
        await page.locator(".product-card h3").first().innerText(),
        first,
      );
      await page.getByRole("button", { name: "4", exact: true }).click();
      assert.equal(await page.locator(".product-card").count(), 8);
      assert.equal(
        await page.getByRole("button", { name: "Next page" }).isDisabled(),
        true,
      );
    },
  );
  await check("site search finds a product and handles no result", async () => {
    await open("about");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.locator("#siteSearch").fill("Ayabi");
    await page
      .getByRole("link", { name: "Ayabi Chair Dai Sugasawa", exact: true })
      .waitFor();
    await page
      .getByRole("link", { name: "Ayabi Chair Dai Sugasawa", exact: true })
      .click();
    await page.locator("#detailDialog[open]").waitFor();
    assert.equal(await page.locator("#detailTitle").innerText(), "Ayabi Chair");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.locator("#siteSearch").fill("nonexistent furniture 12345");
    await page.locator("#searchResults .empty-state").waitFor();
    assert.match(
      await page.locator("#searchSummary").innerText(),
      /^0 results/,
    );
    await page.keyboard.press("Escape");
  });
  await check("material preview and FAQ work", async () => {
    await open("materials");
    await page.locator('[data-material="Fabrics"]').click();
    assert.equal(await page.locator("#detailTitle").innerText(), "Fabrics");
    await page.keyboard.press("Escape");
    await page.locator("details").first().locator("summary").click();
    assert.equal(
      await page.locator("details").first().getAttribute("open"),
      "",
    );
  });
  await check("leather swatch changes texture and caption", async () => {
    await open("materials-leathers");
    const before = await page.locator("#leatherPreview").getAttribute("src");
    await page.locator('[data-swatch="1217 atlantic"]').click();
    assert.notEqual(
      await page.locator("#leatherPreview").getAttribute("src"),
      before,
    );
    assert.equal(
      await page.locator("#selectedColor").innerText(),
      "1217 atlantic",
    );
    assert.equal(
      await page
        .locator('[data-swatch="1217 atlantic"]')
        .getAttribute("aria-pressed"),
      "true",
    );
  });
  await check(
    "magazine categories, keyboard tabs and article preview",
    async () => {
      await open("magazine");
      await page.getByRole("tab", { name: "News", exact: true }).click();
      assert.equal(await page.locator(".article-row").count(), 3);
      for (const tag of await page
        .locator(".article-row .eyebrow")
        .allInnerTexts())
        assert.equal(tag.toLowerCase(), "news");
      await page.keyboard.press("ArrowRight");
      assert.equal(
        await page
          .getByRole("tab", { name: "Stories", exact: true })
          .getAttribute("aria-selected"),
        "true",
      );
      await page.getByRole("tab", { name: "References", exact: true }).click();
      assert.equal(await page.locator(".article-row").count(), 3);
      await page.locator(".article-image").first().click();
      assert.match(await page.locator("#detailTitle").innerText(), /Retreat/);
      await page.keyboard.press("Escape");
    },
  );
  await check("professional resource downloads a real study file", async () => {
    await open("professionals");
    const promise = page.waitForEvent("download");
    await page.locator("a[download]").first().click();
    const download = await promise;
    assert.equal(download.suggestedFilename(), "project-guide.txt");
    assert.equal(await download.failure(), null);
    await download.saveAs(new URL("project-guide.txt", output).pathname);
  });
  await check("showroom search supports result and empty states", async () => {
    await open("contact");
    await page.locator("#storeSearch").fill("New York");
    assert.equal(await page.locator(".store-card:visible").count(), 1);
    await page.locator("#storeSearch").fill("no matching city");
    assert.equal(await page.locator("#storeEmpty").isVisible(), true);
    await page.locator("#storeSearch").fill("");
    assert.equal(await page.locator(".store-card:visible").count(), 6);
  });
  await check("contact validation and local demo result", async () => {
    await open("contact");
    let posts = 0;
    const listener = (req) => {
      if (req.method() === "POST") posts++;
    };
    page.on("request", listener);
    await page.locator("#contactForm button[type=submit]").click();
    assert.equal(
      await page.locator("#contactForm .form-status").innerText(),
      "",
    );
    await page.locator('[name="name"]').fill("Study visitor");
    await page.locator('#contactForm [name="email"]').fill("bad-email");
    await page.locator('[name="message"]').fill("A showroom enquiry.");
    await page.locator("#contactForm input[type=checkbox]").check();
    await page.locator("#contactForm button[type=submit]").click();
    assert.equal(
      await page
        .locator('#contactForm [name="email"]')
        .evaluate((el) => el.validity.typeMismatch),
      true,
    );
    await page
      .locator('#contactForm [name="email"]')
      .fill("visitor@example.com");
    await page.locator("#contactForm button[type=submit]").click();
    assert.match(
      await page.locator("#contactForm .form-status").innerText(),
      /nothing has been sent or saved/,
    );
    assert.equal(posts, 0);
    page.off("request", listener);
  });
  await check("newsletter shows local demo completion", async () => {
    await open("index");
    await page
      .getByRole("button", { name: "Subscribe", exact: true })
      .first()
      .click();
    await page
      .locator('#newsletterForm [name="email"]')
      .fill("visitor@example.com");
    await page.locator("#newsletterForm input[type=checkbox]").check();
    await page.locator("#newsletterForm button[type=submit]").click();
    assert.match(
      await page.locator("#newsletterForm .form-status").innerText(),
      /no subscription was sent/,
    );
    await page.keyboard.press("Escape");
  });
  await check("tablet and narrow phone navigation fit", async () => {
    for (const width of [320, 859, 1199, 1200]) {
      await page.setViewportSize({ width, height: 900 });
      await open("index");
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Overflow at ${width}px`,
      );
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
