// Magazine 页的 Tab：只做视觉切换。
// 九篇文章写死在 HTML 里，这里不加载、不请求、不读写任何数据。
const rows = [...document.querySelectorAll(".article-row")];
const count = document.querySelector("#articleCount");
const tabs = [...document.querySelectorAll(".tabs button")];

function show(tab) {
  const topic = tab.textContent.trim();
  let visible = 0;
  for (const row of rows) {
    const category = row.querySelector(".eyebrow").textContent.trim();
    const match = topic === "All Topics" || topic === category;
    row.hidden = !match;
    if (match) visible += 1;
  }
  count.textContent = `${visible} ${visible === 1 ? "story" : "stories"}`;
}

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    for (const other of tabs) {
      const selected = other === tab;
      other.setAttribute("aria-selected", String(selected));
      other.tabIndex = selected ? 0 : -1;
    }
    show(tab);
  });
}
