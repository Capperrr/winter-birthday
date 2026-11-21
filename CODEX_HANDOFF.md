# 最新：首页角落文字清理（2026-11-21）

- 仅限实验分支 `preview/winter-editorial-20261121`。保留首页左上角的原生 WINTER. 品牌标识，不修改任何原有文案或生日交互。
- 删掉了实验海报不适用的旧版 Unsplash 摄影署名链接（原 `.photo-credit`），但保留左下角 `TAKE A BREATH / STAY A WHILE`。
- 原艺术海报 WebP `dist/assets/winter-sunrise-master98.webp` **没有重编码，也没有大改构图**。新增透明 `dist/assets/winter-poster-corner-retouch.svg`，精确修补海报右上角内嵌 `WINTER` 和左下角 `HOME STUDY` 的狭小区域；CSS 两层背景同尺寸对齐，不允许恢复另一个版本的山丘或压缩成 25KB。
- 新 CSS 查询参数 `poster-clean-corners-20261121`，不影响 Morning/Night。不要将两处局部修补解释成全画面的新图像生成。原始图保留以便回滚。
- 需要在 iPad 上实际检查两处文字是否完全消失、线条是否连贯；不能把代码检查或 READY 当成真机测试。

# 2026-11-21 · Home 海报锐度修复（当前最终指令，覆盖下方旧版本）

- **用户的 iPad 反馈：上一版 Home 海报严重发灰、发糊。** 根因之一是之前 `dist/assets/winter-sunrise-original.avif` 文件只有约 25 KB，线条损失明显，1440px 在 iPad 高屏幕上可能被进一步放大。
- **当前正式使用 `dist/assets/winter-sunrise-master98.webp`**：由同一张用户认可的 `winter_sunrise_linefield.png` 原海报高质量编码生成，**1672×941px，468,166 bytes，WebP quality 98**；对应 Git blob `b3b3ea626aef8e3da5572882ec13cef2701eeca9`。比 25KB 版本显著保留更多细光栅细节。
- `dist/winter-editorial.css` 最后覆盖 Home 原海报显示和 `landscape-shade`、云雾、光晕等，**Morning 不加 blur、opacity 蒙层或 parallax、不放大整张图**。`dist/index.html` 提前 preload 高质量 WebP 并刷新 CSS 缓存。Night 保留用户点击后的变暗效果。
- 这是同一张**原图的高保真压缩版**，不是旧的替代 SVG；不应重新绘制简化山峰。没有声称从 1672px 素材中凭空生成真正 4K 细节。
- 只在 `preview/winter-editorial-20261121` 修改。旧版预览和正式 `main` 保持不变。所有 iPad 视觉效果仍需用户实机确认。
- 以下历史交接若写 `winter-sunrise-original.avif`、`winter-editorial-linefield.svg` 是 Home 当前素材，或建议重新添加景深，**一律以本节最新内容为准**。

# 2026-11-21 · 用户截图纠错：必须使用原光栅海报
用户明确指出：此前网页的简化山丘 SVG 与其认可的艺术海报完全不同。
**新视觉来源：`dist/assets/winter-sunrise-original.avif`，由用户确认的 `winter_sunrise_linefield.png` 原图压缩得到，保留同一张海报的叶片、日出、雪山和密集光栅线条。**
`dist/winter-editorial.css` Home 背景已改用该真实海报文件；`dist/winter-editorial-linefield.svg` 仅为旧尝试，不再在 Home 中引用。
Home 额外写实云层 `.moving-clouds`、雾层、光晕及日间蒙层已禁用，避免覆盖原图。
保留网站自带的 For you / WINTER 标题、诗句、导航和 Morning/Night；Night 手动切换可以给原图加深色调。
只改独立试验分支 `preview/winter-editorial-20261121`，不可覆盖旧预览或正式版 main。

# LATEST HANDOFF — 2026-11-21 ART EXPERIMENT
Use `preview/winter-editorial-20261121` for the independent new art direction. This branch loads `dist/winter-editorial.css` last and uses `dist/assets/winter-editorial-linefield.svg` as optical Home art. Palette: blue `#09318D`, white `#FFFFFF`, pink `#FD91CC`; Night uses `#02070A`, `#0297DE`, `#FC734D`. It is a newly rendered vector adaptation of the visual proposal, not a binary copy of the ChatGPT-generated PNG. Read `EDITORIAL_ART_DIRECTION_2026-11-21.md`. Original prior preview and main must not be touched. Retain 19-memory expanding cluster, deep About Me, Journey's 3D photos and minimal ending, Morning/Night, lake ripple and all five camera-hand-gesture candle ignitions.

# 最新指示：2026-11-21 · 只升级顶部导航与 Journey 右侧清透玻璃

- 新增 `dist/winter-liquid-glass.css`，在 `dist/index.html` 的其他样式之后加载，**不修改 HTML 结构和 JS 逻辑**。顶部导航 `.glass-nav` 保留原有三个 tab、44px+ 点击区域、活动胶囊动画，采用约 2px 背景模糊、180% 饱和度、极薄轻着色、细腻冷暖色边缘光和双层内侧反射；深色 About Me／Cake 使用较深的玻璃材质，浅色页面使用浅色材质；文字颜色沿用已有的路由变量确保可读。
- Journey **宽屏真正展示的滚动故事信笺是 `.journey-story-card`**，窄屏的旧信笺是 `.journey-letter`。二者都需要统一的薄玻璃材质，取消旧的 27–34px 大范围模糊而采用 2px blur + 180% saturation + 1.06 brightness 的清透版本，保留原文、五站切换、留言与摄影内容。
- 这版没有借助跨浏览器不稳定的 SVG backdrop displacement，因此实现的是**低模糊、边缘高光与轻微冷暖色散感**，不可谎称完整物理光学折射或实时采样背景亮度。浏览器不支持 backdrop-filter 时保留有对比度的浅色降级。
- **绝对不要重新添加 Journey 底部长方形毛玻璃导航面板**：`.journey-navigation`、`#journey-next-chapter` 和「有几句话想对你说 / 下一页」不受液态玻璃样式影响。
- 不恢复已被否决的纸片状景深；Home 原瑞士照片、Morning/Night、About Me 深色摄影展、19 张星图式照片、原文字体文案、蜡烛逐根手势点亮等全部保留。
- 所有真实 iPad Safari／竖屏／横屏交互仍须设备实测，不要将 GitHub 检查或 Vercel READY 说成真机测试成功。

# 最新用户要求：2026-11-20 14:16 · 撤销有破绽景深、清理 Journey 结尾

- **Home：撤销 2026-11-20 刚加的纸片剪影景深。** 用户实际 iPad 截图显示树丛像生硬裁切的纸片，这是不可接受的。已删除 `dist/winter-spatial-depth.js`、`dist/winter-spatial-depth.css`，并从 `dist/index.html` 解除引用。原瑞士静态山野图、Morning/Night、光波和原文案保留。**绝不可恢复硬边剪影、粗糙多边形或只靠模糊处理的假景深。**
- **Journey：删除最后一块笨重的长方形毛玻璃导航底板。** `dist/journey-sticky-story.css` 为 `.journey-navigation` 清除背景、模糊、边框、阴影，仅留下没有大卡片底板的进度条和简洁导航。
- **最后一站结尾文案改为「有几句话想对你说」**。在导航后独立的 `footer#journey-next-chapter` 中，以该文案配一个明确的 **「下一页 →」** 按钮。按钮沿用 `#journey-afterword-trigger` 的原事件，进入原有后记，不增加多余大玻璃框；前四站隐藏该 footer。
- **修复截图里的末尾照片和导航重叠**：`dist/journey.js` 监测导航进入滚动视窗时设置 `data-reading-end`，大屏 `journey-frame` 柔和淡出，回到正文再出现。保留全部五张 3D 照片、原来的信笺内容、站点控制和留言。
- 原有深色 About Me、19 张照片聚合后星图展开、五蜡烛摄像头捏合点火与水波纹均不变。
- **旧交接文档里的“重新做 Home 视差”已被此次用户实际截图和撤销指示取代。** 仅改预览分支，不触碰正式版 main；不要称 Vercel READY 为 iPad 实测通过。

# 最新指示：2026-11-20 · 真实前后景层次 + 固定式滚动叙事

- **用户重新明确要求实现真正可感知的 Home 空间视差**。以前删除的 `living-depth.js/css` 因只是模糊/整张背景复制而被否决；**现在采用新的 `dist/winter-spatial-depth.js/css`**，只取原始瑞士照片的真实树林/近处枝叶剪影作不同速度前后分层，远处雪山与整张草地保持清晰和静止。不得以 CSS 模糊、单张缩放、WebGL 假山/草地替代。不调整原字体、文案、Morning/Night、切换光波。
- **Journey 新增真正的 Sticky Scrollytelling**：`dist/journey.js` 从唯一 `stops` 数据自动生成五张完整原文案的右侧信笺；`dist/journey-sticky-story.css` 在宽屏让左侧五张 3D 照片固定在滚动视野，用户自然向下滚动右侧信笺时，照片/索引同步。手动点照片、切换下一站、滑动底部进度均保留；各站留言调用原 `journey-write`/笔记保存，不丢数据。窄屏保持原来的单站展示，避免 iPad/手机滚动锁死。原标题「你走过的路，我陪你再走一遍。」保持。
- **原有19张照片聚合后星图式展开**，当前 `cosmos-glass-album.js/css` 保持不动；About Me 深色七张 Coverflow 保持不动；五根蜡烛摄像头捏合点火流程完全不变。
- 此条**取代下方 2026-11-18 所述“不要再加入景深”的历史指令**；用户于2026-11-20亲自重新授权新的、有前后空间关系的版本。仍禁止把之前那套纯模糊版本恢复。
- 必须验证真实 iPad 横竖屏及摄像头流程。仅 JS 语法通过或 Vercel READY **不代表**已完成真机测试。

# 最新指示 2026-11-20（覆盖此前单张相册方案）
星空后的19张照片默认聚合，点击沿三层半弧展开，点击单张放大，按钮收拢。保留照片本体圆角和玻璃高光，无白边、额外底板或独立背景。禁止恢复单张轮播。实现：dist/cosmos-glass-album.js 与 css。其他章节不动。

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

## 2026-11-18 · About Me 与 Journey 双 3D Coverflow 更新

- **About Me 顺序**：点 About Me 首先进入由 `dist/about-entry.js`、`dist/about-entry.css` 提供的七张真实照片 3D Coverflow 开场。点击“翻开下一页 · 25 岁的便利贴”后才进入原本用 22 张可编辑便利贴排成“25”的页面。再次点击 About Me 或便利贴顶部返回按钮，可以回到七张照片。原照片点击放大的弹窗依然保留。**星空后 19 张照片墙是完全不同的模块，绝不能搬到 About Me 开场。**
- **Journey**：`dist/journey-coverflow.js`、`dist/journey-coverflow.css` 将五站照片变成独立、无白色底板、无胶带的 3D 拖动卡片；右边轻薄玻璃信笺保持视觉独立，并在每次站点切换时同步标题、正文、提问和签名；底部进度导航/留给 Gwen 的文字原功能保留。`dist/journey.js` 通过 `winter:journey-select-stop` 和 `winter:journey-stop` 两个事件与新 3D 浏览交互同步，避免生成第二份错位文案数据。
- **仅选择少量效果**：Journey 侧重 3D Coverflow，右侧透明玻璃只加入非常轻的鼠标聚光、不到 2.4 度的 3D 倾斜。不要添加持续运行的流光边框、光标拖尾、极光背景、乱码打字或新拟态按钮。iPad 触摸不触发玻璃鼠标聚光。
- 照片需要完整显示、不可裁切成白色相框；草地静态、文字可读；`prefers-reduced-motion` 和 iPad 竖屏优先。更改资源时更新 `dist/index.html` 的查询参数。
- 正式网站 `main` 仍禁止未经授权修改；此交接描述**预览分支**。

## 2026-11-18 · 深色 About Me 开场 + Home 恢复静态照片

- About Me 第一幕是深蓝黑色电影感七张照片摄影展，`dist/about-entry.css` 中以 `data-about-theme="night"` 限定；进入「25」便利贴时切回原暖色纸张，保留原照片、文字和保存机制。
- **2026-11-18 历史指示（已被上方 2026-11-20 新指示取代）：当时取消模糊式 Home 景深。** `dist/living-depth.js` 与 `dist/living-depth.css` 已删除，`dist/index.html` 不再引用它们。不得恢复当时那套效果；新的照片剪影分层按上方最新要求执行。
- Home 保留原瑞士真实静态山野照片、Morning/Night、柔和云雾与昼夜光影、切换光波和原文字。草地不动。
- iPad 实测仍需进行；Vercel READY 不是设备测试通过。

## 2026-11-19 · Journey 标题/位置 + 星空后极简毛玻璃相册

- **Journey 标题统一为「你走过的路，我陪你再走一遍。」**：`dist/index.html` 的旅途主标题和入口邀请、`dist/app.js` 的浏览器标题已同步。左侧五张真实照片仍是 3D Coverflow，但位于更低的位置；`dist/journey-coverflow.css` 使用 `object-fit:contain` 和相对更小的卡片区域，尽量完整显示照片、保证与右侧独立玻璃信笺不重叠。
- **「一些闪闪发光的普通日子」**：星空后原来 19 张散列照片墙，改成单张居中的 **4:5 极简毛玻璃相册卡**，大留白、低饱和、圆角柔光、极简无衬线英文标签；通过左右箭头和 iPad 手指横滑依次浏览 **19 张原照片**。代码在 `dist/cosmos-glass-album.css` / `dist/cosmos-glass-album.js`，旧的 `dist/cosmos-chapter.js` 保留独立原图点击放大功能。
- 毛玻璃相册背景颜色依据**当前真实照片的像素平均色相**动态派生，并大幅降低饱和度；保留原来的中文相册标题、**「我喜欢你所有的模样。」**、用户亲笔图片和进入创作页的按钮。
- 没有真实拍摄日期，**不能编造日期**；先用 `PRIVATE ALBUM · XX / 19` 显示相册编号。如果用户随后提供照片日期，可按正确日期替换。
- 星后相册不是 About Me 的七张照片开场。**不要更换照片、不要改写私人的 19 张照片标题，也不要恢复旧的散乱图钉/倾斜相纸照片墙**。
- 历史说明：此前取消了模糊式 2.5D 景深；2026-11-20 已改为用户主动要求的清晰原图前后景分层版本，详见最上方。五根蜡烛逐根手势点火、玻璃信笺和其他用户文案都不变。
- iPad 与浏览器截图需要真实测试；代码语法和 Vercel READY 不能等同于真机体验。

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
