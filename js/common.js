// 展示用静态 UI 模板：只保留两件事——标记当前主导航项、拦住死链跳转。
// 手机端的导航抽屉也在这里开合（抽屉本身就是主导航）。
const page = document.body.dataset.page;
const section = page?.startsWith("products")
  ? "products"
  : page?.startsWith("materials")
    ? "materials"
    : page;
document
  .querySelector(`[data-nav="${section}"]`)
  ?.setAttribute("aria-current", "page");

const menuDialog = document.getElementById("menuDialog");
const menuToggle = document.querySelector('[data-open="menuDialog"]');
menuToggle.addEventListener("click", () => {
  menuDialog.showModal();
  document.body.classList.add("dialog-open");
  menuToggle.setAttribute("aria-expanded", "true");
});
menuDialog.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
  menuToggle.setAttribute("aria-expanded", "false");
});
for (const link of menuDialog.querySelectorAll("[data-close], .drawer-nav a"))
  link.addEventListener("click", () => menuDialog.close());

// 正文里的死链（href="#" + aria-disabled）不许产生任何跳转
document.addEventListener("click", (event) => {
  if (event.target.closest('[aria-disabled="true"]')) event.preventDefault();
});
