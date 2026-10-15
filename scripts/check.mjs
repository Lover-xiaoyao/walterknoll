import { readFile, readdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const root = new URL("../", import.meta.url);
const files = [
  "index.html",
  ...(await readdir(new URL("pages/", root)))
    .filter((x) => x.endsWith(".html"))
    .map((x) => "pages/" + x),
];
assert.equal(files.length, 10, "The scope requires ten pages.");
const errors = [];
let links = 0;
// The fragment source keeps its own wrapping; each page re-indents and re-wraps
// the embedded copy. Compare the markup tokens instead of the raw characters.
const compact = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s*([<>])\s*/g, "$1")
    .trim();
const header = await readFile(
  new URL("js/components/header.html", root),
  "utf8",
);
const footer = await readFile(
  new URL("js/components/footer.html", root),
  "utf8",
);
for (const file of files) {
  const url = new URL(file, root);
  const content = await readFile(url, "utf8");
  const prefix = file === "index.html" ? "./" : "../";
  for (const [name, template] of [
    ["header", header],
    ["footer", footer],
  ]) {
    const block = content.match(
      new RegExp(
        `<!-- shared:${name}:start -->([\\s\\S]*?)<!-- shared:${name}:end -->`,
      ),
    );
    if (compact(block?.[1]) !== compact(template.replaceAll("{{root}}", prefix)))
      errors.push(`${file}: shared ${name} is out of sync`);
  }
  if (!content.includes('<main id="main">'))
    errors.push(`${file}: missing main content landmark`);
  if (/本页由|你的内容写在这里|\{R\}|\{\{root\}\}/.test(content))
    errors.push(`${file}: starter placeholder remains`);
  for (const [tag] of content.matchAll(/<a\b[^>]*href="#"[^>]*>/g))
    if (!tag.includes('aria-disabled="true"'))
      errors.push(`${file}: href="#" without aria-disabled`);
  const ids = [...content.matchAll(/\bid="([^"]+)"/g)].map((x) => x[1]);
  if (new Set(ids).size !== ids.length)
    errors.push(`${file}: duplicate element ids`);
  for (const match of content.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const target = match[1];
    if (/^(https?:|tel:|mailto:|data:|javascript:|#)/.test(target)) continue;
    links++;
    const resolved = new URL(target, url);
    const hash = resolved.hash.slice(1);
    resolved.hash = "";
    resolved.search = "";
    try {
      await access(resolved);
    } catch {
      errors.push(`${file}: missing ${target}`);
      continue;
    }
    if (hash && resolved.pathname.endsWith(".html")) {
      const text =
        resolved.href === url.href ? content : await readFile(resolved, "utf8");
      if (!text.includes(`id="${hash}"`))
        errors.push(`${file}: missing anchor ${target}`);
    }
  }
}
// The ten pages write their content straight into the HTML: no data layer,
// no network calls, no storage.
async function staticOnly(directory) {
  for (const entry of await readdir(new URL(directory, root), {
    withFileTypes: true,
  })) {
    const file = directory + entry.name;
    if (entry.isDirectory()) await staticOnly(file + "/");
    else if (file.endsWith(".js")) {
      const source = await readFile(new URL(file, root), "utf8");
      if (/\bfetch\(|XMLHttpRequest|localStorage|sessionStorage/.test(source))
        errors.push(`${file}: a page script may not reach the network or storage`);
    }
  }
}
await staticOnly("js/");
for (const gone of ["assets/data", "assets/downloads"])
  try {
    await access(new URL(gone, root));
    errors.push(`${gone} should be gone: the content lives in the HTML`);
  } catch {}
for (const file of files) {
  const content = await readFile(new URL(file, root), "utf8");
  if (/\sdownload(?=[\s=>])/.test(content))
    errors.push(`${file}: a download link must stay inert`);
  if (/maps\.google/.test(content))
    errors.push(`${file}: a map link must stay inert`);
}
async function javascript(directory) {
  for (const entry of await readdir(new URL(directory, root), {
    withFileTypes: true,
  })) {
    const file = directory + entry.name;
    if (entry.isDirectory()) await javascript(file + "/");
    else if (file.endsWith(".js") || file.endsWith(".mjs")) {
      try {
        execFileSync(
          process.execPath,
          ["--check", fileURLToPath(new URL(file, root))],
          { stdio: "pipe" },
        );
      } catch (error) {
        errors.push(`Invalid JavaScript: ${file}\n${error.stderr}`);
      }
    }
  }
}
await javascript("js/");
await javascript("scripts/");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `PASS: ${files.length} pages, ${links} local links/resources, shared components, anchors, inert downloads and map links, no page fetch, and JavaScript syntax.`,
  );
}
