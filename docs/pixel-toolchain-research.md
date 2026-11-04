# pixel 横幅：Skills / 工具组合调研与实测

2026-11-05。结论：**对外预设名用 `pixel`（像素风），`pixelfx` 只是内部特效引擎。** 这里记录独立原型的调研与实测；示例源码和产物随仓库提供，但没有接入正式 CLI、替换根横幅、修改项目 npm 依赖或安装全局 Skill。后续美术与中文宽幅版本见[细像素工坊](../examples/pixel-game-vfx/README.md)。

## 1. 最值得采用的组合

```text
项目资料 + 品牌约束
  → readme-banner 的编排 Skill：内容、布局、配色、动画范围
  → pxl：低分辨率像素场景 / 图标 / 位图文字
  → pixelfx：可选的独立局部特效
  → 我们的合成器：固定图层、实际深浅背景、最终区域裁剪
  → Pixelbolt：RGBA → 无损 APNG；pxl：PNG / 全局调色板 GIF
  → 静态兜底 + README 引用 + 确定性检查
```

这条路线**现在已实际跑通**，不是仅凭 README 推断可用。[本地样张与复现](../examples/pixel-prototype/README.md) · [深浅对比](../examples/pixel-prototype/comparison.png)。

不要为了“工具丰富”一次装六个编码库。已有 RGBA 帧时不需要再加 Sharp、image-q、gifenc、UPNG.js；只有导入、调色或部署需求明确时再补。

## 2. 经作者源码核实的素材 Skills

| 项目 | 真正能做什么 | 放在哪一层 | 限制 / 决策 |
| --- | --- | --- | --- |
| [claude-pxl / pxl](https://github.com/crsolver/claude-pxl) | `.px.js` 定义 sprite、scene、layer、遮罩、调色板、位图文字与帧动画；输出 PNG/GIF/精灵表 JSON | 首选本地 AssetGenerator；本次已实测 | 零运行时依赖，源码运行需要 Node >=22.18；代码作者仍要看图迭代。不是训练好的像素画模型。MIT |
| [pixelwright](https://github.com/m4bwav/pixelwright) | 真实网格恢复、透明背景、palette lock、轮廓/杂点清理；按区域动画，输出 outside-mask 等校验 | 导入规范化 + Animator + QA | Python + NumPy + Pillow；不负责凭语义创造新原画。项目较新，采用前需用自有素材建立基准。MIT |
| [pixel-art-studio](https://github.com/Gamezxz/pixel-art-studio) | Python/Pillow 形状、图层、帧、描边、Bayer、mask、PNG/GIF/表格导出；pixelpipe 清理输入 | pxl 的 Python 替代路线 | 没必要和 pxl 同时作为必装依赖。需要代理执行看图→批评→修正。MIT |
| [generating-dot-assets](https://github.com/abagames/agentic-gamedev-skills/tree/main/.agents/skills/generating-dot-assets) | 主机图像模型生成孤立物体，之后 cutout / pixelize / fit / validate | 可选图片素材提供者 | **需要 image_gen 或等价模型 + ImageMagick**；不是独立离线生图器。本会话无此模型，没有假装执行。MIT collection |
| [dsh-aseprite-skill](https://github.com/Ral6224/dsh-aseprite-skill) | 写 Lua，用真实 Aseprite 批量绘制、保存可编辑源、PNG/精灵表 | 可选美术工作站 / 导出适配器 | 需要实际 Aseprite 二进制；Skill 的 MIT 不等于 Aseprite 商业程序免费或同许可证 |
| [Layer pixel-art skill](https://github.com/layerai/skills) | 调用 Layer 平台模型创作/编辑像素素材 | 可选远程 AssetProvider | 需 Layer MCP、OAuth 与可用额度；增加授权、费用和服务依赖。不是当前本地默认路线 |

核实过真实 Skill 与脚本，不只看名称：

- [pxl SKILL](https://github.com/crsolver/claude-pxl/blob/main/SKILL.md)、[DSL/API](https://github.com/crsolver/claude-pxl/blob/main/reference.md)、[实际 CLI](https://github.com/crsolver/claude-pxl/blob/main/bin/pxl.js)。
- [pixelwright hub](https://github.com/m4bwav/pixelwright/blob/main/skills/pixelwright/SKILL.md)、[实际 pxw.py](https://github.com/m4bwav/pixelwright/blob/main/skills/pixelwright/scripts/pxw.py)。
- [pixel-art-studio SKILL](https://github.com/Gamezxz/pixel-art-studio/blob/main/SKILL.md)、[实际绘图实现](https://github.com/Gamezxz/pixel-art-studio/blob/main/scripts/pixelstudio.py)。
- [dot-assets SKILL](https://github.com/abagames/agentic-gamedev-skills/blob/main/.agents/skills/generating-dot-assets/SKILL.md)、[像素化脚本](https://github.com/abagames/agentic-gamedev-skills/blob/main/.agents/skills/generating-dot-assets/scripts/pixelize.mjs)。
- [Aseprite SKILL](https://github.com/Ral6224/dsh-aseprite-skill/blob/main/SKILL.md)、[实际 Lua 示例](https://github.com/Ral6224/dsh-aseprite-skill/blob/main/scripts/minimal-example.lua)。

本轮做过 skills CLI 搜索与作者仓库核验，没有自动安装这些 Skill。安装数、星标只能反映部分采用情况，不能替代代码和作品验证。尤其不把一个热门“建议型 Skill”等同于可执行生成器。

## 3. 处理与导出工具，不必全部采用

| 工具 | 适用需求 | 关键限制 |
| --- | --- | --- |
| [Pixelbolt](https://github.com/skulitom/Pixelbolt) | 纯 Node 的 JSON 像素创作、PNG/APNG/GIF 编码；本次实际用了 APNG 编码器 | 当前源码 `renderProject` 的**多帧创作画布**限制 256×256；低层 `encodeAPNG` 不受这个边长限制，960×320 已实测。不是所有 API 都有相同限制。MIT |
| [Sharp](https://github.com/lovell/sharp) | 输入解码、合成、nearest resize、PNG/GIF 量化 | Apache-2.0；原生 libvips；同一 pipeline 多次 resize 只保留一次，降采样→放大要分阶段。未发现其文档承诺 APNG 输出 |
| [image-q](https://github.com/ibezkrovnyi/image-quantization) | 精确控制量化 / 抖动，跨帧共同训练调色板 | MIT；不负责图片解码或排版；ordered/Bayer 并非其已实现承诺。已有手工调色板时无需引入 |
| [gifenc](https://github.com/mattdesl/gifenc) | 直接编码共享索引调色板 GIF | MIT、无依赖；不自带 dithering；GIF 单表最多 256 色、透明度为二值、时间单位 10ms |
| [UPNG.js](https://github.com/photopea/UPNG.js) | PNG/APNG 编解码备选 | MIT；依赖 pako，旧 CommonJS 包装需测试；不是零依赖新库 |
| [LibreSprite](https://github.com/LibreSprite/LibreSprite) | 可编辑美术源、批处理精灵表输出 | GPLv2 原生桌面程序，也有 batch CLI；不应成为本项目默认运行依赖 |
| [Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font) | 未来中文 / CJK 真像素字体，8/10/12px | 字体 OFL-1.1，构建代码 MIT；要固定字体文件、许可证和栅格器。不能借用 pixelfx 非 MIT 的 PatchPixel gallery 字体 |

接口证据：[Pixelbolt 编码源码](https://github.com/skulitom/Pixelbolt/blob/main/src/png.js)、[画布限制](https://github.com/skulitom/Pixelbolt/blob/main/src/core.js)、[Sharp 输出](https://sharp.pixelplumbing.com/api-output/)、[Sharp resize](https://sharp.pixelplumbing.com/api-resize/)、[image-q API](https://github.com/ibezkrovnyi/image-quantization/blob/main/packages/image-q/API-README.md)、[LibreSprite CLI 源码](https://github.com/LibreSprite/LibreSprite/blob/master/src/app/app_options.cpp)。

除下节三个组件外，其余工具本轮主要是文档/源码核实，**没有宣称全部安装或运行测试**。Pixelbolt 测的是固定的 current-main 提交，不把它的新行为一概归给 npm 已发布的 `0.11.0`。

## 4. 实际跑通的样张

原创“项目工作坊”场景：左边是清晰项目名、tagline、输出纸张，右边是独立反应堆。不是把一整张高清图降采样，也不是在 Logo 阴影上扫光。

| 项目 | 实测结果 |
| --- | --- |
| 场景源 | pxl 的 3×5 位图字体 / 像素形状，无系统字体或外部图像 |
| 尺寸 | 480×160 原生网格，最近邻 2× 输出 960×320 |
| 动画 | pixelfx `scifi/energy-core`，seed 35，30 帧 × 80ms，2.4 秒，12.5fps |
| 主题 | 两次独立实例，分别对实际浅/深背景合成光照 |
| 导出 | pxl 静态 PNG、共享调色板 GIF；Pixelbolt 无损 APNG |
| 体积 dark | PNG 13,798 B / APNG 436,365 B / GIF 340,744 B |
| 体积 light | PNG 11,548 B / APNG 361,731 B / GIF 309,128 B |
| 保护范围 | 指定区域之外，原始帧及解码后的 APNG/GIF 所有帧变化像素均为 0 |
| 时间与清晰度 | 独立解码核实 30 帧、2400ms、无限循环；2×2 块一致；APNG 首帧和静态 PNG 像素完全相同 |
| 确定性 | 固定提交 + 干净源码树；再次生成 `--check` 字节相同 |
| 原有功能 | 原有 20 项本地测试通过；根 ASCII banner 和 gallery 的 drift 检查未变化 |

[源代码与复现](../examples/pixel-prototype/README.md)、[参数记录](../examples/pixel-prototype/verification.json)。两套主题都已看图。GIF 会做全局量化，颜色可与无损 PNG/APNG 略有差异。

尚未完成：正式 CLI 注册、中文字体、真实 GitHub/Camo 上传验证、客户端主题/reduced-motion 行为、多样板质量评估。没有因为“文件能打开”就宣称已达到生产可用。

## 5. 产品架构建议

### 只保留一个对外 Skill

readme-banner Skill 负责整个任务：读仓库→拟定文案与视觉→挑 layout/theme/motif→生成→看图修正→安全更新 README。第三方库是内部工具或可选创作适配器，不要求每个使用者先安装五套 Skill/MCP。

```text
BannerSpec
  ├─ AssetProvider：pxl / 仓库 PNG / 人工精灵 / 可选图像服务
  ├─ Layout：标题、安全边距、主视觉、文字保护区
  ├─ Theme：语义调色板 + 深浅真实背景
  ├─ Motion：pixelfx 或受限帧动画 + 明确最终 mask
  └─ Encoder：PNG / APNG / GIF → 多资产清单
```

正式 JSON 不执行 `.px.js`、Lua、任意模块或 shell。像素素材先经过可信构建生成 PNG/帧集，由安全 resolver 加载；开发者自己的场景源码是构建输入，不是可上传执行的配置。

### 推荐两条素材路线

**A. 默认、可复现：** 代理写 pxl 场景 / 图标 → 看 1× 和最终整数倍图 → 调整造型 → 固定素材 → 合成特效 → 导出。这是当前样张路线，没调用生图模型。

**B. 可选、更自由：** 已授权的 image_gen / Layer / 其他图像服务 → 生成无文字主体 → pixelwright 或等价规范化 → 人工/视觉复核轮廓与色块 → 提供明确 mask → 再合成和编码。图片模型只能补“素材来源”，不替代排版、精确文字和质量检查。

付费服务调用、上传品牌文件、模型额度都需要明确选择。主标题始终由确定性字体栅格器排版，不交给图像模型拼字。

### 首版不要做的事情

- 不一次集成所有工具，不默认要求浏览器、ffmpeg、Aseprite、Layer MCP。
- 不把 nearest resize / 减色 / dithering 当作高质量像素画的充分条件。
- 不自动给没有 mask 的 Logo 加光；mask 在最终光照/bloom 之后生效。
- 不让标题、细小 tagline、阴影和留白被粒子覆盖。
- 不把本地可复现当成无条件跨系统字节一致；要固定编码器、Node/压缩栈与字体，并继续 golden-test。

## 6. 下一步实施优先级

1. 产品预设叫 `pixel`，实现一个固定 hero-right 布局、PNG 静帧、一个明确 opt-in 的局部动效。
2. 扩展资产结果/二进制写入/README source 和 `--check`，兼容原 ASCII，不复制它的 `effect: glint` 默认值。
3. 根据实际 GitHub 测试决定 APNG/GIF 发布默认；加 reduced-motion 静态选择，但不未测先承诺。
4. 再加入受限仓库 PNG + matching mask、中文字体、小型风格图库。工具组合证明可行后，再做正式依赖选择与发布。

更早的架构草案见 [pixel 预设设计](pixel-preset-design.md)。
