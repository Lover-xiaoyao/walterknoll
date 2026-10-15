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
| D    | `pages/professionals.html`      | 八项服务、下载按钮（只保留样式）、官方资源入口                |
| E    | `pages/sustainability.html`     | 来源明确的统计、图文、原则与 Evo Concept                      |
| E    | `pages/contact.html`            | 六个门店、门店搜索框、联系表单（都只画外观）                  |

这是一个**纯前端静态页面练习**：十页只呈现界面，内容全部写死在 HTML 里，页面之间用 `<a>` 互相跳转（图片也包在 `<a>` 里），不请求任何接口、不读写任何存储。筛选栏、分页、Tab、色卡、表单、下载按钮都只画外观——点击不会筛选、不会翻页、不会下载、不会提交。带逻辑的脚本只剩三件事：手机导航抽屉的开合、杂志页 Tab 的显示切换、以及拦住死链默认跳转的守卫。

**十页范围**：全站只有上表十个 HTML 页面（`index.html` 与 `pages/` 下九个；`js/components/*.html` 是公共片段，不是页面）。因为分页按钮不会加载新内容，页面上把内容一次写完：产品总览 59 件、座椅子页 35 件、杂志 9 篇、门店 6 家。**视觉与交互范围**：全站零依赖，只有原生 HTML/CSS/JS——没有动画库、没有 `@keyframes`、没有渐变、没有毛玻璃，也没有视差或 3D 翻转。卡片 hover 时上浮 4px、阴影加深、图片轻微变暗、标题变色，全部由 CSS 直接实现（`.2s` 过渡）。选择器只用标签、类、后代/子代与属性选择器，不使用 `:not()` 和 `:has()`。CSS 变量只有 `:root` 里一层平铺的 11 个（配色、字体、间距）。

产品索引共 59 件不同产品（原目录 60 条记录，Management-X 跨分类），全部写在产品总览页里；座椅类产品的卡片另有一份完整列表在座椅子页，两页互相链接。杂志保留九篇有官方来源的文章，按 News / Stories / References 分标签显示。完整产品规格和文章正文在原官网查看。

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
js/pages/magazine.js       杂志页 Tab 的显示切换（不加载数据）
assets/images/             本地图片，按模块分类
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

- `check`：十页数量、共享片段一致性（比较标记内容，忽略缩进与换行差异）、内部链接与锚点、图片与 JavaScript 语法，外加三条范围断言——页面脚本不许 `fetch`/存储、`assets/data` 与 `assets/downloads` 必须已删除、页面里不许有可下载链接和地图外链。
- `test`：自动启动独立测试服务器，用 Chromium 实测十页桌面/手机布局、主导航、内容确实写在 HTML 里（关掉 JS 也必须有卡片）、筛选与分页与搜索点击后数量不变、杂志 Tab 只切换显示、卡片 hover 有上浮与阴影、失效控件点不动；完成后自动停止测试服务器。
- 报告与完整截图在 `artifacts/verification/`，不把临时测试产物加入 Git。
- `npm run capture:reference`：采集指定官网页面截图与字体/尺寸观察，保存到 `artifacts/reference/`。
- GitHub Actions 自动执行检查与浏览器测试，并上传测试报告。

实际执行结果见 [验证记录](docs/VERIFICATION.md)。开发方法、资料取舍见 [工程说明](docs/ENGINEERING.md)，素材来源见 [参考记录](docs/references/README.md)。

## 使用范围

这是独立教学练习，品牌、产品照片和材料纹理属于原权利人；不代表 Walter Knoll 官方服务，不用于商业经营。下载文件为本项目编写的学习资料。商业字体用 Georgia 与系统无衬线字体替代，因此字体字形、部分排版与原站存在差异。本轮交付 GitHub 源码，尚未发布公开访问的网站。
