# 配置与运行参考

本参考用于 [readme-banner skill](<../SKILL.md>)；用户入口见 [项目 README](<../../../README.md>)。配置是 JSON 数据，不是可执行 JavaScript。

## 完整示例

```json
{
  "schemaVersion": 1,
  "preset": "ascii",
  "theme": "ocean",
  "title": "MY PROJECT",
  "tagline": "用简单工具构建有趣的项目",
  "colors": ["#0369a1", "#0e7490"],
  "outputDir": "assets/banner",
  "options": {
    "font": "block",
    "shadow": "double",
    "fill": "█",
    "effect": "glint",
    "art": "donut",
    "place": "left",
    "speed": 1,
    "background": false
  }
}
```

只配置实际需要覆盖的选项即可；不要把所有上游 `ascii.rest` 参数直接拷进本工具的 `options`。

## 通用字段

| 字段 | 约束 / 含义 |
| --- | --- |
| `$schema` | 可选的编辑器 schema 提示字符串；不是代码入口，也不会令渲染器下载远程 SVG |
| `schemaVersion` | 必须为数字 `1` |
| `preset` | 必填非空字符串，最多 64 字符；当前内置为 `ascii` |
| `theme` | 必填非空字符串，最多 64 字符；`terminal`、`ocean`、`neon`、`minimal` |
| `title` | 必填非空单行字符串，最多 120 字符；ASCII preset 还逐字检查字形支持 |
| `tagline` | 可选非空单行普通文本，最多 240 字符，可包含中文；不需要时省略 |
| `colors` | 可选的 1–8 个 `#rrggbb` 颜色，覆盖标题颜色 / 渐变；浅深色标题都会使用此覆盖 |
| `outputDir` | 输出目录，省略时为 `assets/banner`；必须在目标根目录安全边界内 |
| `options` | 可选 JSON 对象，省略等价于 `{}`；由所选 preset 验证 |

不接受未知顶层字段、控制字符、空标题、错误版本或非对象配置。`preset` 不是主题名；不要把 `ocean` 写成 preset。JSON 不能注册插件，也不能导入模块、执行 shell 命令或提供函数。

## ASCII preset 的 options

| 字段 | 可用值 / 行为 |
| --- | --- |
| `font` | `block`（默认）、`slim`、`tall`、`bold`、`round`、`wide`、`mixed`、`italic` |
| `shadow` | `double`（默认）、`single`、`heavy`、`rounded`、`ascii`、`none` |
| `fill` | 一个非空白字符，例如 `█`；不接受任意字体对象或复杂上游设置 |
| `effect` | `glint`（默认，扫光）、`type`（逐字出现）、`still`（标题与 art 均静止） |
| `art` | 可选的内置 piece 名称，例如 `donut`；为保证可重复生成，拒绝依赖实时时钟的 piece；不接受文件路径、URL、原始 SVG 或任意模块 |
| `place` | `left`（默认）、`right`、`above`、`below`；控制 art 相对标题的位置 |
| `speed` | 0.25–4 范围内的有限数字；默认 `1`，`2` 表示更快 |
| `background` | 布尔值，默认 `false`；为 `true` 时使用当前浅 / 深主题的背景色，而不是 CSS 颜色字符串 |

未提供 `fill` 时保留渲染器自己的浅 / 深色填充选择。主题与 art 各有自身颜色，顶层 `colors` 不是对整个 SVG 的全局换色操作。`still` 会冻结标题与内置 art 的动画，但 art 的动画帧数据仍保留在 SVG 中，因此不保证文件体积显著减小。

### 字形与长度

ASCII 大标题支持所选内置字体的字母、数字、空格以及这些标点：

```text
. , ! ? ' : - + = / _
```

`mixed` 保留英文大小写，其他字体把标题转为大写。含有中文、emoji、`&`、括号或其他缺失字形的标题应报错，而不是静默删字。要忠实呈现这类项目名，先向用户确认一个可绘制的英文短标题，把原文放入普通文本 `tagline`，不要擅自改名或音译。

本地 `title` / `tagline` 上限是 **120 / 240**，不是上游 Web URL 的 **20 / 60**。上限只表示允许输入，不保证紧凑美观或一定在产物大小限制内；长标题优先缩短，再考虑 `slim` 字体或移除 art。渲染保留 SVG 原生动画；当前标题动画采样为 8 fps，每张输出 SVG 的大小上限为 2 MB，超限应调整配置而非绕过保护。

## 安装与命令入口

需要 Node.js >=22。源码 checkout 中先在**工具目录**运行 `npm install`（`prepare` 自动构建），然后使用本地入口，不必联网重装自己：

```sh
node "/absolute/path/readme-banner/bin/readme-banner.mjs" --help
```

从 GitHub 的固定标签 `v0.1.0` 运行，完整入口为：

```sh
npx --yes --package github:abworks-dev/readme-banner#v0.1.0 readme-banner --help
```

GitHub npm 安装需要 Git 和网络。`@readme-banner/cli` 尚未发布，不要把它当成 npm 安装来源。以下示例以本地入口说明目标隔离；Windows 可使用 `C:/work/my-project` 等经 shell 正确引用的路径。

```sh
# 在目标仓库中创建配置；不会生成图片或编辑 README
node "/absolute/path/readme-banner/bin/readme-banner.mjs" init --cwd "/absolute/path/my-project" --config "banner.config.json" --preset ascii --theme ocean --title "MY PROJECT" --tagline "Build something useful" --art donut --effect glint

# 默认只生成 assets/banner/banner.light.svg、banner.dark.svg 并输出片段
node "/absolute/path/readme-banner/bin/readme-banner.mjs" generate --cwd "/absolute/path/my-project" --config "banner.config.json"

# 仅用户授权插入时使用 --readme
node "/absolute/path/readme-banner/bin/readme-banner.mjs" generate --cwd "/absolute/path/my-project" --config "banner.config.json" --readme "README.md"

# 无写入检查：只有传入 --readme，才同时检查该受管块
node "/absolute/path/readme-banner/bin/readme-banner.mjs" generate --cwd "/absolute/path/my-project" --config "banner.config.json" --readme "README.md" --check
```

`init --force` 会允许覆盖已有配置，不是常规流程，也不应由 agent 自动添加。高级选项通过 JSON 编辑，不存在 `init --font` 或 `init --background` 等标志。`generate --json`、`presets --json`、`themes --json` 提供机器可读输出。

## 文件与 README 契约

- `--cwd` 是本次操作的根目录。默认配置名是 `banner.config.json`；配置路径、输出路径、README 路径均受根目录限制，并检查符号链接逃逸；硬链接数大于 1（`nlink > 1`）的现有文件也会被拒绝。推荐在该根目录下使用清晰的相对路径。
- 固定文件名为 `<outputDir>/banner.light.svg` 与 `<outputDir>/banner.dark.svg`，不要猜测额外文件名或擅自删除旧目录。
- 不带 `--readme` 时，只写图片并返回嵌入片段，不扫描并修改所有 README。
- 显式 `--readme` 授权对已存在的 `.md` 文件的受管块进行插入 / 更新；边界是 `<!-- readme-banner:start -->` 和 `<!-- readme-banner:end -->`，块外保留。完整标记即使出现在同一 README 的代码示例中也会被算作标记，所以不要重复放置演示标记对。标记损坏或重复时应先检查错误，不手工删除无关正文来“修好”生成。
- 图片 URL 相对于目标 README 所在目录，路径逐段 URI 编码；alt 文本 HTML 转义。优先使用实际生成片段，不手动推算子目录路径或拼接未转义标题。
- `--check` 不写文件；缺失或过期产物会失败。不要把失败当成“已生成”或为了得到成功结果省略 README 检查。
- 配置不支持远程用户 SVG、任意代码插件或可执行配置。安装工具本身仍是可信代码执行，与 JSON 配置的数据边界是两回事。
