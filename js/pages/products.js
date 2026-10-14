import { getCatalog, productCard, asset, escapeHtml as esc } from "../api.js";
import { syncFavorites, showProduct } from "../common.js";
const grid = document.querySelector("#productGrid");
const count = document.querySelector("#productCount");
const params = new URLSearchParams(location.search);
const isChairs = document.body.dataset.page === "products-chairs";
let currentPage = 1;
let category = isChairs ? "chairs-barstools" : params.get("category") || "all";
let visibleLimit = 12;
try {
  const { products, categories } = await getCatalog();
  const pool = products.filter(
    (p, i, all) => all.findIndex((x) => x.id === p.id) === i,
  );
  const categorySelect = document.querySelector("#categoryFilter");
  const designerSelect = document.querySelector("#designerFilter");
  const search = document.querySelector("#productSearch");
  const designerPool = isChairs
    ? pool.filter((p) => p.category === "chairs-barstools")
    : pool;
  designerSelect.innerHTML =
    '<option value="all">All designers</option>' +
    [...new Set(designerPool.map((p) => p.designer).filter(Boolean))]
      .sort()
      .map((d) => `<option value="${esc(d)}">${esc(d)}</option>`)
      .join("");
  if (categorySelect) {
    categorySelect.innerHTML =
      '<option value="all">All products</option>' +
      categories
        .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)
        .join("");
    categorySelect.value = category;
    category = categorySelect.value || "all";
  }
  function render() {
    const filtered = pool.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (designerSelect.value === "all" ||
          p.designer === designerSelect.value) &&
        `${p.name} ${p.designer}`
          .toLowerCase()
          .includes(search.value.trim().toLowerCase()),
    );
    const pageSize = 9;
    const total = Math.max(1, Math.ceil(filtered.length / pageSize));
    currentPage = Math.min(currentPage, total);
    const view = isChairs
      ? filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
      : filtered.slice(0, visibleLimit);
    count.textContent = `${filtered.length} products found`;
    grid.innerHTML = view.map(productCard).join("");
    const empty = document.querySelector("#productEmpty");
    empty.hidden = !!filtered.length;
    if (isChairs) {
      document.querySelector("#pagination").innerHTML = filtered.length
        ? `<button type="button" data-page="${currentPage - 1}" aria-label="Previous page" ${currentPage === 1 ? "disabled" : ""}>←</button>` +
          Array.from(
            { length: total },
            (_, i) =>
              `<button type="button" data-page="${i + 1}" ${currentPage === i + 1 ? 'aria-current="page"' : ""}>${i + 1}</button>`,
          ).join("") +
          `<button type="button" data-page="${currentPage + 1}" aria-label="Next page" ${currentPage === total ? "disabled" : ""}>→</button>`
        : "";
      document.querySelector("#pageSummary").textContent = filtered.length
        ? `Page ${currentPage} of ${total}`
        : "";
    } else {
      document.querySelector("#loadMore").hidden =
        visibleLimit >= filtered.length;
      document
        .querySelectorAll("[data-category]")
        .forEach((b) =>
          b.setAttribute(
            "aria-pressed",
            String(b.dataset.category === category),
          ),
        );
    }
    syncFavorites();
  }
  function changed() {
    currentPage = 1;
    visibleLimit = 12;
    render();
  }
  categorySelect?.addEventListener("change", () => {
    category = categorySelect.value;
    changed();
    const query = new URLSearchParams(location.search);
    if (category === "all") query.delete("category");
    else query.set("category", category);
    history.replaceState(
      null,
      "",
      `${location.pathname}${query.size ? "?" + query : ""}`,
    );
  });
  designerSelect.addEventListener("change", changed);
  search.addEventListener("input", changed);
  document.querySelectorAll("[data-category]").forEach((button) =>
    button.addEventListener("click", () => {
      category = button.dataset.category;
      categorySelect.value = category;
      changed();
    }),
  );
  document.querySelector("#resetFilters").addEventListener("click", () => {
    category = isChairs ? "chairs-barstools" : "all";
    if (categorySelect) categorySelect.value = category;
    designerSelect.value = "all";
    search.value = "";
    changed();
  });
  document.querySelector("#loadMore")?.addEventListener("click", () => {
    visibleLimit += 12;
    render();
  });
  document.querySelector("#pagination")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (!button || button.disabled) return;
    currentPage = Number(button.dataset.page);
    render();
    grid.scrollIntoView({ behavior: "instant", block: "start" });
    document
      .querySelector("#pagination [aria-current]")
      ?.focus({ preventScroll: true });
  });
  render();
  if (params.get("product")) showProduct(params.get("product"));
} catch (error) {
  count.textContent = error.message;
}
