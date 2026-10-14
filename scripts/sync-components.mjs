import { readFile, writeFile, readdir } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const header = await readFile(
  new URL("js/components/header.html", root),
  "utf8",
);
const footer = await readFile(
  new URL("js/components/footer.html", root),
  "utf8",
);
const pages = [
  "index.html",
  ...(await readdir(new URL("pages/", root)))
    .filter((x) => x.endsWith(".html"))
    .map((x) => "pages/" + x),
];
let changed = 0;
for (const file of pages) {
  const url = new URL(file, root);
  const original = await readFile(url, "utf8");
  const prefix = file === "index.html" ? "./" : "../";
  let output = original;
  for (const [name, template] of [
    ["header", header],
    ["footer", footer],
  ]) {
    output = output.replace(
      new RegExp(
        `<!-- shared:${name}:start -->[\\s\\S]*?<!-- shared:${name}:end -->`,
      ),
      `<!-- shared:${name}:start -->\n${template.replaceAll("{{root}}", prefix)}\n<!-- shared:${name}:end -->`,
    );
  }
  if (output !== original) {
    await writeFile(url, output);
    changed++;
  }
}
console.log(`Synchronized ${pages.length} pages (${changed} changed).`);
