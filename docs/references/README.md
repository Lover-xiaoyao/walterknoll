# 参考资料与观察

采集日期：2026-10-14。官网会更新，本项目复刻的是这次观察到的版式与选定内容。

## 用户提供

- deepseek_text_20261014_46c253.txt：目录与 CSS 分层要求。
- wk\_副本.zip：十页骨架、两份 Logo、首页摄影及材料图。
- 页面分工截图：A–E 每组两页与核心模块。
- jyy/：课程字幕、梳理、工程 Playbook 及示例工具。

压缩包原始内容已保存在首次提交。本项目没有把用户的大型课程资料或 ZIP 重复上传到仓库。

## 官网页面

| 本项目               | 官方参考                                                    |
| -------------------- | ----------------------------------------------------------- |
| Home                 | https://www.walterknoll.info/en                             |
| About                | https://www.walterknoll.info/en/about                       |
| History              | https://www.walterknoll.info/en/about/history               |
| Products             | https://www.walterknoll.info/en/products                    |
| Chairs               | https://www.walterknoll.info/en/products/chairs-barstools   |
| Materials            | https://www.walterknoll.info/en/materials                   |
| Leathers             | https://www.walterknoll.info/en/materials/overview/leathers |
| Magazine             | https://www.walterknoll.info/en/magazine                    |
| Professionals        | https://www.walterknoll.info/en/professionals               |
| Sustainability       | https://www.walterknoll.info/en/sustainability              |
| Sustainability facts | https://www.walterknoll.info/en/sustainability/attitude     |
| Retailers            | https://www.walterknoll.info/en/store                       |
| Contact              | https://www.walterknoll.info/en/professionals/contact       |

## 布局观察

使用 Playwright/Chromium 采集首页、产品、椅子、材料与关于页面，以及首页手机视口。浏览器实测标题字体为 ivar_displayregular，首页标题 80px，内页标题 56px。本项目以 Georgia 替代。

官网桌面顶栏约 64px、手机约 48px；1440px 视口左右留白 44px。首页 Hero 图片在固定导航下方被遮住一部分；手机文字居中。内页采用三列图片、细线与较大垂直留白。

截图及字体观察可通过 npm run capture:reference 重新采集。官网的 Cookie 窗口曾出现在座椅页参考截图中；本地网站没有跟踪脚本，不添加此窗口。

assets.json 记录新下载图片的本地路径与官方源 URL。ZIP 自带图片位于 assets/images/index/、材料两张 material-\* 图片与 assets/images/common/。产品名称、分类、材料与门店数据提取自上述公开页面，只保留本项目使用的字段。
