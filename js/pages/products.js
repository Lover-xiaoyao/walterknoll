// 展示用静态 UI 模板：产品页只渲染固定的默认视图。
// 筛选、排序、分页、加载更多、详情弹窗都不再实现。
import { getCatalog, productCard } from "../api.js";

const grid = document.querySelector("#productGrid");
const count = document.querySelector("#productCount");
const isChairs = document.body.dataset.page === "products-chairs";

try {
  const { products } = await getCatalog();
  const pool = products.filter(
    (p, i, all) => all.findIndex((x) => x.id === p.id) === i,
  );
  if (isChairs) {
    const chairs = pool.filter((p) => p.category === "chairs-barstools");
    grid.innerHTML = chairs.slice(0, 9).map(productCard).join("");
    count.textContent = `${chairs.length} products found`;
  } else {
    const view = pool.slice(0, 12);
    grid.innerHTML = view.map(productCard).join("");
    count.textContent = `${view.length} products found`;
  }
} catch (error) {
  count.textContent = error.message;
}
