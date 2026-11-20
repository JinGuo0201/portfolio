# 博士面试汇报 · 郭晋（网页版 deck）

基于 `../PHDPresentation.html` 的设计语言与动画系统重构的**另一份**演示，面向博士面试/申请汇报。
原版（本地与线上 `phd-presentation/`）保持不动。

## 打开方式

直接双击 `index.html`，或拖进 Chrome / Edge。16:9 舞台会自动缩放适配窗口。

- `← / →`、`PageUp / PageDown`、空格：翻页
- `Home / End`：首页 / 末页
- `F`：全屏
- 底部圆点可点击跳页
- `?shot=1&p=N`：截图模式（跳过动画、隐藏 UI）
- `?film=1`：隐藏 UI 但保留动画（录屏用）
- `#sN`：深链到第 N 页

## 页面结构

| 页 | 内容 |
|---|---|
| 01 封面 | 棱彩玻璃肖像卡，鼠标悬停倾斜；点击卡片翻开进入 Agenda |
| 02 Agenda | 四个磨砂玻璃气泡：Overview / Researches / Projects / Skills；中央漫画卡可点，翻卡进入 Thank you |
| 03 Overview | 个人基础信息（英语 CET-4/6 成绩、获奖情况、学生工作经历）+ 教育/联培时间轴 |
| 04 Researches | 四项研究（含期刊与影响因子、关键精度指标；Published 悬停显示论文二维码） |
| 05 Projects | 洪水风险图、黑土粮仓变量施肥两个国家级项目 + 真实成果图件（默认裁切，悬停上浮展开为完整图件）；底部「横向任务」两条 + `···` |
| 06 Skills | 星轨：中心四重身份球 + 10 颗不同材质技能球，悬停放大并暂停公转 |
| 07 研究路线 | 四张卡片：采样密度 → 多核融合 → 人地耦合 → 三维碳储量。**入口**：第 04 页第四条论文状态的 `Underway`（点击翻卡进入）；**返回**：点击本页标题或按 `←` 回 Agenda |
| 08 Thank you | 光晕从中心扩散铺满，蓝色栏目条压在最上层 |
| 09 Q & A | 光晕收缩回中心并加深，作为问答页背景（末页，原 Backup 页已删除） |

## 素材来源

- 文字与数据：`../../portfolio-site/research.html`（期刊、IF、分区、R² 0.714、1,431 验证样本、公开数据集 DOI）、`../../portfolio-site/projects.html`
- 图片：`../../portfolio-site/assets/project-figs/flood-1.jpg`（→ `assets/proj-flood.jpg`）、`../Materials/黑土粮仓师范图片.jpg`（→ `assets/proj-sanjiang.jpg`）
- 讲稿结构：`../讲话稿.txt`
- 视觉与动画：`../PHDPresentation.html` 的同一套 CSS / JS

## 文件

```
index.html            单文件页面（约 81 KB）
assets/               肖像、校徽、漫画卡、二维码、项目图件、字体、世界地图
README.md             本文件
```
