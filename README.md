# Walter Knoll · Frontend Study

按 [Walter Knoll 英文官网](https://www.walterknoll.info/en) 与用户提供的十页分工表完成的响应式教学复刻。采用 **原生 HTML、CSS、JavaScript**，保留指定目录结构，旧 `runoob-ui-lab` 项目不受影响。

详细的项目介绍、A 至 E 成员职责、页面功能、代码入口和验收方法见 [项目说明](docs/project-overview.md)。

![Desktop homepage](docs/previews/home-desktop.jpg)

## 启动

```bash
npm install
npm run dev
```

打开 **http://localhost:4173**。运行时没有框架、构建工具或第三方 API；图片、产品与材料数据都在本地。服务器只使用 Node 标准库；安装的 Playwright 用于开发验证。

如需其他端口：`PORT=8080 npm run dev`。请通过 HTTP 服务打开，浏览器的 `file://` 模式不支持本项目的 ES modules 与 JSON 请求。

## 十个页面与分工

| 分工 | 页面                            | 内容                                                          |
| ---- | ------------------------------- | ------------------------------------------------------------- |
| A    | `index.html`                    | 六张 Hero 轮播、产品推荐、Magazine、Worldwide/About、订阅演示 |
| A    | `pages/about.html`              | Purpose、历史时间轴、设计师、门店入口                         |
| B    | `pages/products.html`           | 分类图片、分类/设计师/关键词筛选、加载更多、产品预览          |
| B    | `pages/products-chairs.html`    | 35 款座椅、9 款/页、分页与筛选                                |
| C    | `pages/materials.html`          | 九个材料入口、悬停效果、材料预览、FAQ                         |
| C    | `pages/materials-leathers.html` | Elen 大图、材料说明、15 款真实纹理色卡                        |
| D    | `pages/magazine.html`           | All Topics / News / Stories / References、文章列表与预览      |
| D    | `pages/professionals.html`      | 八项服务、可下载的项目参考文件、官方资源入口                  |
| E    | `pages/sustainability.html`     | 来源明确的统计、图文、原则与 Evo Concept                      |
| E    | `pages/contact.html`            | 六个门店、城市搜索、地图链接、联系表单演示                    |

这是一个**展示用的静态 UI 模板**：十页只用来呈现界面，不做交互。全站唯一的跳转是顶部主导航（Products、Material Library、Magazine、Designers、Professionals、About us、Sustainability，手机上是同一个导航的抽屉）和 logo；正文的卡片、图块、按钮、列表项一律是空链接（`href="#"` + `aria-disabled="true"`），鼠标指针不变、hover 不变色、点了不跳页也不滚顶。筛选、分页、Tab、色卡、表单等控件同样只是界面元素：`aria-disabled="true"` 表示"点了不会有反应"，并由 `pointer-events: none` 彻底惰性化。`js/common.js` 只做三件事：给当前主导航加 `aria-current`、开合手机导航抽屉、拦住死链的默认跳转；产品页和杂志页各有一个脚本，只负责把列表渲染出来。

**十页范围**：全站只有上表十个 HTML 页面（`index.html` 与 `pages/` 下九个；`js/components/*.html` 是公共片段，不是页面）。列表内容在页面里完整呈现，不靠翻页或加载更多隐藏：产品总览 12 条、座椅页 9 条（分页条只作为界面元素）、杂志 9 条、门店 6 家。

**视觉与交互范围**：全站零依赖，只有原生 HTML/CSS/JS——没有动画库、没有 `@keyframes`、没有渐变、阴影、毛玻璃，也没有视差、3D 翻转或鼠标跟随。hover 只做颜色/背景变化加 `.2s` 过渡；箭头不再位移、卡片图片不再悬停放大。选择器只用标签、类、后代/子代，以及状态需要的属性选择器（`[aria-current]`、`[aria-disabled]`），不使用 `:not()` 和 `:has()`。CSS 变量只有 `:root` 里一层平铺的 11 个（配色、字体、间距），没有变量套变量。

产品索引有 60 条分类记录（59 个不同产品，Management-X 跨分类）；总览页把前 12 条渲染成卡片，十个目前官网返回的产品分类作为界面图块展示。杂志保留九篇有官方来源的文章列表。完整产品规格和文章正文在原官网查看。

## 文件组织

```text
index.html                 首页
pages/                     九个内页
css/base.css               变量、重置、字体
css/layout.css             导航、页脚、网格、响应式
css/components.css         卡片、筛选、表单、弹窗
css/pages/                 每页专属样式
js/components/             公共导航与页脚的源片段
js/common.js               当前导航高亮、手机导航抽屉、死链不跳转
js/api.js                  本地数据读取与卡片输出
js/pages/                  列表渲染（只渲染，无交互）
assets/data/catalog.json   产品、文章、材料、门店、轮播索引
assets/images/             本地图片，按模块分类
assets/downloads/          可下载的教学参考文件
scripts/                   启动、公共片段同步、检查、截图
```

修改导航或页脚后运行：

```bash
npm run sync:components
```

它把片段同步到十页，保留每页正确的资源前缀。导航和页脚在 HTML 中直接可见，不依赖运行时组件请求。

## 检查与截图

```bash
npm run check
npx playwright install chromium
npm test
```

- `check`：十页数量、共享片段一致性（比较标记内容，忽略缩进与换行差异）、内部链接、锚点、图片与 JavaScript 语法。
- `test`：自动启动独立测试服务器，检查十页桌面/手机布局、主导航、内容完整性和"除主导航外不得跳转"；完成后自动停止测试服务器。
- 报告与完整截图在 `artifacts/verification/`，不把临时测试产物加入 Git。
- `npm run capture:reference`：采集指定官网页面截图与字体/尺寸观察，保存到 `artifacts/reference/`。
- GitHub Actions 自动执行检查与浏览器测试，并上传测试报告。

实际执行结果见 [验证记录](docs/VERIFICATION.md)。开发方法、资料取舍见 [工程说明](docs/ENGINEERING.md)，素材来源见 [参考记录](docs/references/README.md)。

## 使用范围

这是独立教学练习，品牌、产品照片和材料纹理属于原权利人；不代表 Walter Knoll 官方服务，不用于商业经营。下载文件为本项目编写的学习资料。商业字体用 Georgia 与系统无衬线字体替代，因此字体字形、部分排版与原站存在差异。本轮交付 GitHub 源码，尚未发布公开访问的网站。
