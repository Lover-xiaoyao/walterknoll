// 展示用静态 UI 模板：杂志页只渲染完整列表。
// 分类 Tab 切换和文章弹窗都不再实现，Tab 只作为静态的界面元素。
import { getCatalog, asset, escapeHtml as esc } from "../api.js";

const count = document.querySelector("#articleCount");
const list = document.querySelector("#articleList");

try {
  const { articles } = await getCatalog();
  count.textContent = `${articles.length} stories`;
  list.innerHTML = articles
    .map(
      (article) =>
        `<article class="article-row"><span class="article-image"><img src="${asset(article.image)}" alt="${esc(article.title)}" loading="lazy" width="1000" height="667"></span><div class="article-copy"><p class="eyebrow">${esc(article.category)}</p><h2>${esc(article.title)}</h2><p class="muted">Architecture, spaces and the people who bring them to life.</p></div></article>`,
    )
    .join("");
} catch (error) {
  count.textContent = error.message;
}
