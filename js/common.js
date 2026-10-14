/* ================================================================
   common.js —— 公共逻辑（每个页面都要引入）
   ----------------------------------------------------------------
   五个功能：
     1. 顶栏滚动变色（首页透明白字 → 往下滚变白底黑字）
     2. 手机抽屉菜单开合
     3. 导航栏"当前页"高亮
     4. 回到顶部按钮
     5. （可选）把 js/components/ 里的 header、footer 注入页面

   引入顺序：base → layout → components → pages/xxx → 最后引入本文件
   ================================================================ */


/* ================================================================
   0. 小工具函数（本文件内部用，别处也可以调）
   ================================================================ */
function $(selector) { return document.querySelector(selector); }
function $$(selector) { return document.querySelectorAll(selector); }
function addClass(el, className) { if (el) el.classList.add(className); }
function removeClass(el, className) { if (el) el.classList.remove(className); }

/* 节流：让函数最多每 wait 毫秒执行一次（滚动事件触发太频繁，必须限流） */
function throttle(fn, wait) {
  var lastTime = 0;
  return function () {
    var now = new Date().getTime();
    if (now - lastTime >= wait) {
      lastTime = now;
      fn();
    }
  };
}


/* ================================================================
   1. 顶栏滚动变色
   ================================================================ */
var header = $('#siteHeader');

function updateHeader() {
  if (!header) return;                    // 页面上没有顶栏就跳过
  if (window.pageYOffset > 60) {
    addClass(header, 'is-scrolled');      // 加这个 class 就变白底黑字
  } else {
    removeClass(header, 'is-scrolled');
  }
}

window.addEventListener('scroll', throttle(updateHeader, 100));
updateHeader();   // 打开页面先执行一次（防止刷新后停在中部）


/* ================================================================
   2. 手机抽屉菜单
   ================================================================ */
var drawer = $('#drawer');
var navToggle = $('#navToggle');
var drawerClose = $('#drawerClose');

if (navToggle) {
  navToggle.addEventListener('click', function () { addClass(drawer, 'is-open'); });
}
if (drawerClose) {
  drawerClose.addEventListener('click', function () { removeClass(drawer, 'is-open'); });
}
// 按 Esc 也能关掉
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') removeClass(drawer, 'is-open');
});


/* ================================================================
   3. 导航栏当前页高亮
   原理：拿当前网址的文件名，去和每个导航项的 href 比，相同就高亮
   ================================================================ */
function highlightNav() {
  var here = location.pathname.split('/').pop() || 'index.html';
  $$('.nav-item, .drawer-item').forEach(function (a) {
    var target = (a.getAttribute('href') || '').split('/').pop();
    if (target && target === here) addClass(a, 'is-active');
  });
}
highlightNav();


/* ================================================================
   4. 回到顶部按钮（不用在 HTML 里写，这里自动生成）
   ================================================================ */
var backTop = document.createElement('button');
backTop.className = 'back-to-top';
backTop.setAttribute('aria-label', 'Back to top');
backTop.innerHTML = '&uarr;';
document.body.appendChild(backTop);

backTop.addEventListener('click', function () {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('scroll', throttle(function () {
  if (window.pageYOffset > 600) {
    addClass(backTop, 'is-visible');
  } else {
    removeClass(backTop, 'is-visible');
  }
}, 150));


/* ================================================================
   5. 【可选】把 js/components/ 的 header、footer 自动注入页面
   ----------------------------------------------------------------
   默认【不启用】，因为用 file:// 双击打开时浏览器会拦 fetch。
   要用的话：
     ① 页面里把导航/页脚那段换成占位：<div id="site-header"></div>
     ② 起一个本地服务器（见 README「本地预览」一节）
     ③ 把下面 injectComponents(); 这行的注释去掉
   ================================================================ */
function injectComponents() {
  var slots = [
    { id: 'site-header', file: 'js/components/header.html' },
    { id: 'site-footer', file: 'js/components/footer.html' }
  ];
  slots.forEach(function (slot) {
    var box = document.getElementById(slot.id);
    if (!box) return;
    fetch(slot.file)
      .then(function (res) { return res.text(); })
      .then(function (html) { box.innerHTML = html; })
      .catch(function () {
        console.warn('[common.js] 组件注入失败：请用本地服务器打开页面（file:// 会被浏览器拦截）');
      });
  });
}

// injectComponents();   // ← 需要动态注入时，去掉这行注释
