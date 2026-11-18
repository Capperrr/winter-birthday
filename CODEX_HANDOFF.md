# WINTER 完整网站 — 给 Codex 的唯一交接说明

**请先读同分支根目录的 `AGENTS.md` 和 `DESIGN.md`，然后才开始改代码。**

- GitHub 仓库： https://github.com/Capperrr/winter-birthday
- 当前完整版分支： `preview/living-landscape-home-20261116`
- 可操作的完整预览： https://winter-living-landscape-preview.vercel.app/
- 网站入口： `dist/index.html`；Vercel 根目录： `dist`
- Vercel 项目名： `winter-living-landscape-preview`
- **禁止未经再次确认就改动或合并 `main`**。这个分支目前是全部新增视觉交互的唯一源代码，不要用更旧的 main、PR 或本地缓存覆盖它。
- 当 Codex 完成修改，请同时提供新的 **GitHub commit SHA、目标分支、Vercel 部署 SHA 和预览链接**。不应该只回答“改好了”。

## 开始之前，先同步远程源代码

```bash
git fetch origin
git switch preview/living-landscape-home-20261116 || git switch --track origin/preview/living-landscape-home-20261116
git pull --ff-only origin preview/living-landscape-home-20261116
git rev-parse HEAD
```

如果 Codex 云环境无法切换分支，应在 Codex 的仓库/分支选择器中明确选择 `Capperrr/winter-birthday` 和 `preview/living-landscape-home-20261116`；绝不将过时的 `main` 视作最新版。

## 当前已整合的完整交互（不是单独展示 demo）

### Home
- `dist/living-home.js`、`dist/living-home.css`：晨光、夜空、星星、月光与 Morning/Night 开关。首页瑞士草甸照片**完全静止**；没有动态草或草地物理模拟。
- `dist/living-interactions.js`：按钮按压回弹、触点跟手光晕、弹性开关、文字入场和昼夜变化的字色/柔光。
- `dist/living-water.js`、`dist/living-water.css`：Morning/Night 切换时短暂的金色/冷色扩散光波，不能遮挡文字或按钮。首页底图没有水面，切勿在草地添加水波。

### Birthday / 生日
- `dist/cake-five-candles.js`、`dist/cake-five-candles.css`：五根蜡烛上方提示“手指在此处捏合即可”，提示在手拿起打火机或点火之后消失。
- 摄像头由用户授权后启动；MediaPipe 追踪手势；捏合抓住打火机，将火焰依次靠近五根灯芯，五根都点亮后才触发继续流程。**不能用普通点击、一根蜡烛、一次捏合直接完成五根。**
- `dist/cake-scene.js`、`dist/gesture-controls.js`、`dist/creator-studio.js` 不得破坏烟花、吹蜡烛、相机和创作流程。

### 两个国家 / Photo memories
- `dist/nature-atlas.css` 的 `.memory-backdrop` 使用真正有湖面的 `assets/memory-natural.webp`。
- `dist/living-water.js` 仅在 `data-destination="letter"` 且触摸点击命中湖水区域时产生照片折射水波；避免与卡片/按钮抢手势，滚动不误触，触发后约 1.5 秒结束。不要给草地、树林和雪山加水波。
- 原有中国/英国的信纸、照片和路线仍然可交互。

### About Me · 七张照片 3D Coverflow（2026-11-18 预览）
- 在 About Me 的七张挂在便利贴周围的拍立得照片上点击，原放大照片弹窗已升级为真实 3D Coverflow：`dist/portrait-coverflow.js` + `dist/portrait-coverflow.css`。
- 七张照片的原始顺序和对应素材保持不变。第二张个人照片使用 `assets/winter-about-second-photo.webp`，其他沿用高分辨率照片拼图素材，不能覆盖或替换。
- 水平手指拖动跟手；松手按速度与位移吸附；点击两侧照片跳转；保留旧的上一张/下一张、键盘方向键、Escape 关闭与焦点恢复。动画只发生在弹窗，不影响 About Me 页面原布局或后面独立的 19 张星空照片墙。
- 新旧浏览器逻辑以 `dist/interactive-finale.js` 的 `winter:portrait-index` 事件同步，**不得让两个脚本分别维护不同当前索引**。
- 在 iPad 横屏/竖屏实测卡片遮挡、触摸滚动、弹性回弹和原图加载；`prefers-reduced-motion` 下自动移除弹性过渡。

### About Me / 星空后照片墙
- 保留照片和用户上传的真实影像；About Me 第二张照片已经替换。
- 星空后面的 19 张照片墙：保留标题“一些闪闪发光的普通日子”，说明文字为“我喜欢你所有的模样。”
- 创作页文案：“这一页换你来留下作品。”

### 你走过的路，带我再走一遍
- `dist/journey.css`、`dist/journey.js`：左侧展示完整原始图片，无相框、胶带和白底；右侧独立的更轻薄、高透明度玻璃信笺；底部导航同样更透。左右间有真实留白和略微倾斜，但**不允许拼接/重叠**。
- 玻璃文字为深墨蓝，阅读可见性优先；背景是山野照片 + 独立艺术层 `dist/assets/journey-atmosphere.svg`。
- 保留四川达州、初中高中、重庆工商大学南岸校区、南安普顿大学、深圳相遇 5 站，以及确认过的中文内容。

## 建议的设计 Skill（给 Codex 使用）

你要的是**改善已经存在的网站**，所以最贴合的是：
- `redesign-existing-projects`： https://github.com/elayadesign/redesign-skill/tree/main/skills/redesign-existing-projects
- 查看 Skill 原文： https://github.com/elayadesign/redesign-skill/blob/main/skills/redesign-existing-projects/SKILL.md

在支持 Skill Installer 的 Codex 里，可以提交这句话：

```text
请使用 $skill-installer 安装
https://github.com/elayadesign/redesign-skill/tree/main/skills/redesign-existing-projects
然后用 $redesign-existing-projects 审查当前 WINTER 预览分支，先报告问题，再做小范围修改。
以本仓库 AGENTS.md 与 DESIGN.md 作为设计约束；不要应用 Skill 的默认黑白配色、禁止渐变或替换字体等与 WINTER 相冲突的规则。
```

若你确实要为**新建独立的落地页**选择 Skill，才使用：
- `landing-page-design`： https://github.com/elayadesign/ai-design-skills/tree/main/skills/landing-page-design

不要为了使用这个 Skill 把现有 WINTER 网站重做成营销 Landing Page。**Skill 是指导代码修改的规则，不是点一下就给网页增加动画的运行时插件。**

## Codex 要检查的真实问题

1. iPad Safari/Chrome：页面上下轻滑后不应掉出画布或产生无法返回的大面积空白。
2. Home Morning/Night 按钮在 About Me / Home / Destination 导航**下面**，不得遮挡任何文案；昼夜动画与跟手波纹不干扰点击。
3. 原始 Home 草地静态，湖面折射只发生在真实湖水区域。对比桌面和移动端的 image `object-fit` 后，再微调水域掩码，确保折射不穿过树林和草坪。
4. Journey 轻薄玻璃在高亮山景前仍应有足够字色对比，保证 5 站文字可读。
5. 蜡烛摄像头的权限、捏合抓取、五次逐根点火提示和完成序列必须正确。不能用模拟成功掩盖设备兼容问题。
6. 照片墙放大图不是低清缩略图；相应个人文案没有回退。
7. 触摸动画不能吃掉页面原本的手势。支持 `prefers-reduced-motion`，停止不在当前场景的动画。
8. 维护 `dist/index.html` 的 CSS/JS 资源缓存版本，并在实际设备/浏览器可用时做截图验证。

## Codex 交付格式

- 先检查远程 SHA，并确认工作分支；
- 列出将要修改的文件和风险；
- 在预览分支上完成有针对性的优化；
- 提交并推送 commit（可先开目标为预览分支的 PR）；**勿合并 `main`**；
- 如已获得权限，部署到预览项目并验证 READY；未部署必须明确说明；
- 反馈准确的 SHA、修改摘要、测试结果和最新预览链接。

> 最重要的原则：**先保留真实、可用的整站，再升级美术和交互。**
