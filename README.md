<!-- readme-banner:start -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner/banner.dark.svg">
  <img alt="readme-banner" src="assets/banner/banner.light.svg" width="960">
</picture>
<!-- readme-banner:end -->

# readme-banner

配置驱动的 README 横幅工具：本地生成浅色 / 深色 SVG，需要时才更新 README。

由 [abworks-dev](https://github.com/abworks-dev) 维护，公开仓库为 [abworks-dev/readme-banner](https://github.com/abworks-dev/readme-banner)，首个版本标签为 `v0.1.0`。`@readme-banner/cli` 目前只是本地包名占位，**尚未发布到 npm**。

## 做什么，不做什么

- **preset 决定怎么画，theme 决定配色。** `ascii` 是第一个渲染 preset，不是整个工具未来的唯一风格。
- 同一份 JSON 生成 `banner.light.svg` 与 `banner.dark.svg`，保留 SVG 自身的动画；不需要截图或 GIF 转码。
- 默认只写图片、向 stdout 输出 `<picture>` 片段；**只有显式传入 `--readme` 才修改 README**。
- 内置 `terminal`、`ocean`、`neon`、`minimal` 四套独立主题，允许自定义颜色。
- 提供可移植的 [agent skill](<skills/readme-banner/SKILL.md>)；也可通过 TypeScript 接口注册新 preset。
- v1 刻意不提供 GitHub Action、托管 Web 服务或 MCP 服务。不执行配置 JavaScript，不从配置加载任意代码插件，不拉取远程用户 SVG。

## 快速开始：从源码运行

需要 **Node.js 22 或更高版本**与 npm。先进入本工具源码目录：

```sh
npm install
node bin/readme-banner.mjs --help
```

`npm install` 会通过 `prepare` 编译 TypeScript，无需先手动构建。假设目标仓库在 `/path/to/my-project`：

```sh
# 只创建配置，不生成图片、不改 README
node bin/readme-banner.mjs init --cwd "/path/to/my-project" --preset ascii --theme ocean --title "MY PROJECT" --tagline "Build something useful" --art donut --effect glint

# 只生成两张 SVG，并输出可复制的嵌入片段
node bin/readme-banner.mjs generate --cwd "/path/to/my-project"
```

确认需要插入横幅后，再单独运行：

```sh
node bin/readme-banner.mjs generate --cwd "/path/to/my-project" --readme "README.md"
```

在本工具源码 checkout 中执行时，`node bin/readme-banner.mjs` 指向本地 CLI；`--cwd` 指向**要添加横幅的仓库**，两者不要混淆。路径、标题、副标题中的空格或 shell 特殊字符必须按所用 shell 正确引用；不要把不可信输入拼接为命令执行。

### GitHub 安装运行

使用公开仓库的固定 Git 标签 `v0.1.0` 安装。GitHub npm 安装需要本机 **Git**，首次安装也需要网络：

```sh
npx --yes --package github:abworks-dev/readme-banner#v0.1.0 readme-banner --help
npx --yes --package github:abworks-dev/readme-banner#v0.1.0 readme-banner init --cwd "/path/to/my-project" --theme ocean --title "MY PROJECT"
npx --yes --package github:abworks-dev/readme-banner#v0.1.0 readme-banner generate --cwd "/path/to/my-project"
```

若用户明确要求插入 README，最后一条才增加 `--readme "README.md"`。不要使用看似已发布 npm 包的 `npx @readme-banner/cli`；它不是当前的安装方式。版本固定只固定工具代码，不代表安装过程不会执行依赖或构建脚本，应只运行信任的来源。

## 配置

默认配置文件为目标仓库根目录下的 `banner.config.json`：

```json
{
  "schemaVersion": 1,
  "preset": "ascii",
  "theme": "ocean",
  "title": "MY PROJECT",
  "tagline": "Build something useful",
  "outputDir": "assets/banner",
  "options": {
    "font": "block",
    "shadow": "double",
    "effect": "glint",
    "art": "donut",
    "place": "left",
    "speed": 1,
    "background": false
  }
}
```

可选的顶层 `colors` 接受 1–8 个 `#rrggbb` 颜色，覆盖标题配色，例如 `"colors": ["#0369a1", "#0e7490"]`；它不等同于新增 theme。具体字段、ASCII 选项和约束见 [配置参考](<skills/readme-banner/references/configuration.md>)。

### preset 与 theme

| 概念 | 职责 | v0.1.0 |
| --- | --- | --- |
| `preset` | 布局、字形、渲染实现与特有选项 | `ascii` |
| `theme` | 与渲染器分离的浅 / 深色调色板 | `terminal` / `ocean` / `neon` / `minimal` |
| `options` | 当前 preset 自己验证的设置 | ASCII 字体、阴影、动画、内置 art 等 |

| theme | 风格 |
| --- | --- |
| `terminal` | 绿色终端 |
| `ocean` | 蓝色与青色 |
| `neon` | 紫色与粉色 |
| `minimal` | 克制的单色 |

### ASCII 标题的边界

- `title` 必须非空、单行，最多 **120** 个字符；首个 ASCII preset 还要求每个字符都有所选字体的字形。使用字母、数字、空格与受支持标点；中文、emoji 等不能当作 ASCII 大标题悄悄丢弃。
- 除 `mixed` 外的字体会把标题转为大写。需要保留英文大小写时选择 `"font": "mixed"`。
- `tagline` 是普通文本，最多 **240** 个字符，可使用中文；最终显示取决于 SVG 查看器可用的字体。省略不需要的副标题，不要用空字符串代替。
- 上游 Web / URL 接口的 **20 / 60** 字符限制不是本地 CLI 的限制。120 是校验上限，不是推荐排版宽度；长标题仍应缩短、换字体或去掉 art，并检查实际效果。

## CLI

以下用 `readme-banner` 表示已经选定的 CLI 入口；源码运行时替换为 `node bin/readme-banner.mjs`，GitHub 安装运行时使用上面的完整 `npx --package …` 前缀。

```text
readme-banner --help
readme-banner init [--cwd PATH] [--config banner.config.json]
  [--preset ascii] [--theme terminal|ocean|neon|minimal]
  [--title TEXT] [--tagline TEXT] [--art BUILTIN_PIECE]
  [--effect glint|type|still] [--force]
readme-banner generate [--cwd PATH] [--config PATH]
  [--readme README.md] [--check] [--json]
readme-banner presets [--json]
readme-banner themes [--json]
```

- `init` **只创建配置**；已有配置时不会静默覆盖，确认后才使用 `--force`。没有单独的 `--font`、`--colors` 等 init 标志，进阶设置请编辑 JSON。
- `generate` 读取配置，生成两张固定命名的 SVG；不传 `--readme` 时不触碰任何 README。JSON 输出用 `generate --json`，方便其他工具消费，不要混同为配置格式切换。
- `--cwd` 建立本次操作的目标根目录；`--config`、`outputDir`、`--readme` 都受此根目录的安全路径边界约束。指向外部、通过符号链接逃逸的路径，以及硬链接数大于 1 的现有文件会被拒绝，而不是替用户扩大写入范围。
- `--readme` 必须显式指定已存在的 `.md` 文件。受管块以包含 `readme-banner:start` / `readme-banner:end` 的 HTML 注释为边界，块外内容应保留；不要手工在块内维护其他文字。同一 README 不要在代码示例中重复完整标记注释，否则也会被视为重复标记。
- `--check` 比较目标产物是否与当前配置一致，**不写文件**；发现缺失、过期或校验错误时以非零退出。只有同时传入 `--readme`，才把该 README 的受管块也纳入检查。
- `presets --json` 与 `themes --json` 列出机器可读元数据，不修改项目。

```sh
# 在本工具源码目录中检查另一个仓库的图片与 README 受管块
node bin/readme-banner.mjs generate --cwd "/path/to/my-project" --readme "README.md" --check

# 查看元数据，或以 JSON 返回生成结果（generate 仍会写图片）
node bin/readme-banner.mjs presets --json
node bin/readme-banner.mjs themes --json
node bin/readme-banner.mjs generate --cwd "/path/to/my-project" --json
```

### 生成的嵌入片段

当 README 在根目录、输出目录使用默认值时，核心片段如下：

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner/banner.dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/banner/banner.light.svg">
  <img alt="MY PROJECT" src="assets/banner/banner.light.svg">
</picture>
```

实际输出以 CLI 为准：资源 URL **相对于目标 README 所在目录**，不是相对于配置文件或启动目录；路径逐段 URI 编码，alt 文本进行 HTML 转义。README 位于子目录时不要手工照抄根目录 URL。GitHub 或其他查看器是否播放 SVG 动画，取决于其渲染策略；工具保留动画，不承诺所有客户端都播放。

## 示例

同一 `ascii` preset，四种独立主题；以下预览均按浅 / 深色模式自适应。

### terminal · block / double / donut / glint

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="examples/gallery/ascii-terminal.dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="examples/gallery/ascii-terminal.light.svg">
  <img alt="ASCII terminal theme example" src="examples/gallery/ascii-terminal.light.svg">
</picture>

### ocean · slim / single / earth / glint

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="examples/gallery/ascii-ocean.dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="examples/gallery/ascii-ocean.light.svg">
  <img alt="ASCII ocean theme example" src="examples/gallery/ascii-ocean.light.svg">
</picture>

### neon · italic / double / dna-helix / type

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="examples/gallery/ascii-neon.dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="examples/gallery/ascii-neon.light.svg">
  <img alt="ASCII neon theme example" src="examples/gallery/ascii-neon.light.svg">
</picture>

### minimal · mixed / none / 无 art / still

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="examples/gallery/ascii-minimal.dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="examples/gallery/ascii-minimal.light.svg">
  <img alt="ASCII minimal theme example" src="examples/gallery/ascii-minimal.light.svg">
</picture>

这些是仓库内的 SVG 资源，不是远程截图服务；示例不代表测试或 CI 已通过。构建后，可用 [gallery 脚本](<examples/generate-gallery.mjs>)重新生成：

```sh
node examples/generate-gallery.mjs
```

## 给 agent 使用

标准 skills 仓库发现路径为 [skills/readme-banner/SKILL.md](<skills/readme-banner/SKILL.md>)：

```sh
npx skills add abworks-dev/readme-banner --skill readme-banner
```

安装 skill 只安装操作说明，不会自动为项目添加图片。请明确告诉 agent：目标仓库在哪里、偏好的主题和标题、是否授权插入 README。skill 要求先确认目标目录、先 `init` 后 `generate`，默认不碰 README，不提交、不推送、不发布，并保留用户无关改动。

## 扩展与开发

扩展通过程序代码进行：实现 `BannerPreset`，由 `PresetRegistry.register()` 注册；渲染器接收 `RenderContext` 中的配置、主题调色板和 light / dark 变体，返回 SVG。JSON 中只有数据，没有 npm 包名插件加载器或 JavaScript 配置入口。接口与信任边界见 [架构说明](<docs/architecture.md>)。

```sh
npm run build
npm run check
npm test
```

以上是开发者检查命令，不是本 README 对测试结果的声明。

## 许可与第三方

项目采用 [MIT License](<LICENSE>)。ASCII renderer 依赖精确版本 `ascii.rest@0.4.0`（MIT）；上游版权、完整许可文本、源码再分发与商标注意事项见 [THIRD_PARTY_NOTICES.md](<THIRD_PARTY_NOTICES.md>)。内置品牌图案可用不等于获得相关商标授权，也不代表本项目与上游或品牌方有关联。
