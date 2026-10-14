# 实际验证记录

日期：2026-10-14。受测实现为提交 `70fe539`；后续文档与截图提交不改变页面或脚本。详细执行结果保存在 [browser-results.json](verification/browser-results.json)。

## 结果

- `npm run check`：十个页面、707 个本地链接/资源、页面锚点、公共片段、目录图片、JavaScript 语法通过。
- `npm test`：**35/35 通过**。Node 24.10.0、Playwright 1.55.0、Chromium，使用实际本地 HTTP 服务。
- 十页分别在 **1440 × 900** 与 **390 × 844** 验证，共二十个页面视口；无横向溢出、无裂图、无页面脚本错误、无本地资源 HTTP 失败。
- 额外检查首页在 320、859、1199、1200px 的布局宽度。

## 已实际操作

移动端菜单打开、Escape 关闭与跳转；轮播切换与暂停；产品分类/设计师/关键词组合筛选、空结果、加载更多；产品预览与心愿单在刷新后保留；椅子分页首尾边界与不同页内容；全站搜索结果跳转与零结果；材料弹窗与 FAQ；皮革纹理与色名同步；杂志分类与键盘切换；教学文件下载；门店查询；联系表单无效输入与有效结果；订阅演示。

联系表单验证明确检查没有发出 POST 请求。没有发送邮件、创建官方订阅或写入远程业务数据。

## 修正过程

首次观察发现本地服务器根目录 URL 返回 404，以及移动菜单按钮被通用样式压缩；均已修正。首轮完整测试有三处测试定位问题：弹窗与卡片的心愿单按钮选择器不唯一、分页数字与下一页按钮共享页码、CSS 大写显示与文本断言不一致。修正测试定位后，第二轮 35 项全部通过，保持用户行为预期不变。

## 验证范围

验证对象是本地静态复刻，未验证原官网后端、外部站点可用性、Safari/Firefox 或线上部署。系统替代字体与商业字体存在字形差异。素材和内容选取为教学子集；文章全文和完整产品规格通过原站链接访问。

GitHub Actions 已配置相同检查流程。远端 CI 状态另看仓库 Actions；本地通过不等同于远端任务已完成。

## 十页范围收口（2026-10-14 追加）

背景：确认全站页面数量没有超出十页——`index.html` 加 `pages/` 下九个，共十个；`ref/` 与 `tools/` 之类草稿页不在本仓库内。产品、文章、材料详情本来就以 `#detailDialog` 弹窗呈现，没有为商品或文章生成详情页。

改动：把页面正文里 27 处“点了会离开当前页”的卡片/图块/按钮/列表项改成死链（`href="javascript:void(0);"` + `aria-disabled="true"`）——首页 11、about 4、materials 2、materials-leathers 5、products 2、professionals 3。保留可跳转：顶部主导航、移动端抽屉、页脚、面包屑、同页锚点与同页筛选（`products.html?category=…#collection`）、搜索弹窗结果、`professionals` 的 `.txt` 下载、以及指向官网页面的来源链接。`css/components.css` 为死链加了 `cursor: not-allowed` 并停用箭头位移；`js/common.js` 点击死链时弹出提示，不产生跳转；`js/pages/index.js` 不再改写首屏轮播的说明链接。

脚本：`scripts/check.mjs` 跳过 `javascript:` 与 `#` 链接，并把共享片段比对从逐字比较改为比目标记内容（忽略缩进与换行）——工作区里十个页面的公共块此前被重新折行，逐字比较会误报 20 处 out of sync，改后与 `js/components/*.html` 语义一致。

本轮实际执行与结果：本机原先没有 Node，先按 CI 同版本装了 Node 24.21.0（解压在 `~/.local/node-v24.21.0-darwin-arm64`，未做全局安装），随后运行项目自带脚本：① `npm run check` **PASS**：10 页、656 个本地链接/资源、共享片段一致、锚点与 id 无冲突、目录图片齐全、JavaScript 语法通过；② `npm ci` + `npx playwright install chromium` 后 `npm test` **35/35 通过**（Chromium 140 headless shell），报告在 `artifacts/verification/`，其中包含十页在 1440/390 的渲染、无横向溢出、无裂图、无脚本错误、搜索与弹窗交互、筛选与分页、下载、表单演示等。无头 Chrome 154 的独立抽查（逐个点击 27 处死链 URL 不变、死链光标为 `not-allowed`、导航/抽屉/页脚/面包屑完好）作为补充证据。未验证：GitHub Actions 远端结果与 Safari/Firefox。

## 视觉与交互降级（2026-10-14 追加）

审计结论：项目本来就没有动画库（无 GSAP、Animate.css、CDN 引用）、没有 `@keyframes`、没有渐变、没有 3D 翻转、没有视差、没有鼠标跟随。实际存在的“花活”只有 6 处 hover 位移或放大（箭头 `translateX(5px)`、卡片图片 `scale(1.025~1.06)`）、1 处弹窗阴影、1 处 `backdrop-filter` 毛玻璃、1 处 `scroll-behavior: smooth` 加 JS 平滑滚动，以及 `:has()`、`:not()` 各若干。

本轮改动：删除上述全部 hover 位移/放大、弹窗阴影与毛玻璃、平滑滚动（`window.scrollTo(0, 0)`）；hover 统一为颜色/背景变化，只保留 `.2s` 的 `color`、`background-color`、`color` 过渡；`body:has(dialog[open])` 与 `.form-status:not(:empty)` 改为 JS 切换类名 `body.dialog-open`、`.form-status.filled`；`.store-card>p:not(.eyebrow)` 与 `#contactForm input:not([type=checkbox])` 改为显式的类与 `type` 选择器。保留：基础属性选择器（承载 JS 状态）、媒体查询（390/1440 响应式要求）、`:root` 一层平铺的 11 个变量、`calc()` 布局算式（弹窗与容器尺寸需要）。

结果：`npm run check` **PASS**；`npm test` **35/35 通过**；降级前后同机同视口截图对比，首页首屏**像素完全一致**（说明降级没有误伤排版），产品卡 hover 与产品弹窗两处按要求不再放大、不再有阴影与毛玻璃。对比截图为本轮临时产物，未入库。

## 死链统一改为 href="#"（2026-10-14 追加）

按交接要求，27 处死链由 `href="javascript:void(0);"` 改为 `href="#"`，仍保留 `aria-disabled="true"`。`js/common.js` 本来就对 `a[aria-disabled="true"]` 调用 `preventDefault()`，所以点 `#` 不会跳到页首，只弹提示。`scripts/check.mjs` 的占位符检查因此拆成两条：仍然拦截空的 `href="#"` 占位链接，但允许带 `aria-disabled="true"` 的死链。

验证：Playwright 实测首页 11 处死链 href 全为 `#`、点击后 URL 不变、滚动位置不变（`y=600` 保持）、提示文字正常；弹窗开合时 `body.dialog-open` 正常增删；产品弹窗仍可打开；表单状态带 `.filled`；无脚本错误。`npm run check` **PASS**、`npm test` **35/35 通过**。

说明：带 `aria-disabled="true"` 的链接在无障碍语义上是“已禁用”，因此 Playwright 的默认点击会拒绝操作（需要 `force: true`），人工点击不受影响。

## 改成展示用静态 UI 模板（2026-10-14 追加）

范围：十页只呈现界面，除顶部主导航与 logo 外不产生任何跳转，也不再有任何交互逻辑。

删除：`#searchDialog`、`#wishlistDialog`、`#detailDialog`、`#newsletterDialog` 四个弹窗及其头部按钮/订阅按钮钩子；`js/pages/index.js`（轮播）、`contact.js`（门店搜索 + 表单校验）、`materials.js`（材料弹窗）、`materials-leathers.js`（色卡切换）四个脚本；`js/common.js` 里除“导航高亮、手机抽屉、死链不跳转”以外的全部逻辑（搜索、心愿单、localStorage、toast、回到顶部、订阅表单）；60 个只服务已删逻辑的 `data-*` 钩子；30 条只服务已删弹窗/搜索/心愿单的 CSS 规则。`js/pages/products.js` 与 `magazine.js` 改成只渲染列表（产品 12 条、座椅 9 条、杂志 9 条），筛选/分页/加载更多/Tab 都只是界面元素。

保留并静态化：所有可见控件保留原样并标 `aria-disabled="true"`（筛选下拉与输入框、分类按钮、加载更多、分页按钮、材料九张卡、15 个皮革色卡、轮播圆点与暂停、搜索与心愿单图标、页脚回到顶部、联系表单的提交按钮改成 `type="button"`）；桌面/手机布局、配色、排版完全未改。

验证：`npm run check` **PASS**（10 页、313 个本地链接/资源、共享片段、锚点、JS 语法）；`npm test` **27/27 通过**，其中新增三条针对本次范围的断言——① 全站只剩 `#menuDialog` 一个 `dialog`；② 十个页面里所有交互钩子计数为 0（只允许抽屉开关 1 个）；③ 逐页抽样点击正文、页头、页脚的失效控件，URL 与滚动位置都不许变化，并检查除主导航/logo/面包屑/内页锚点/`.txt` 下载/外链之外没有指向 `.html` 的链接。测试过程中抓出并修掉两个真问题：产品页 9 张分类图块原本是同页筛选链接（点了会重载页面），已改为死链；`.txt` 下载属于资料而非页面跳转，测试规则相应放宽。未验证：GitHub Actions 远端结果与 Safari/Firefox。
