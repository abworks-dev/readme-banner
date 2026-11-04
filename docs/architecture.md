# 架构与信任边界

## 产品与范围

readme-banner 是 Node.js >=22 / TypeScript / ESM 的本地 CLI 与可编程渲染基础设施。目标是把仓库中的 JSON 配置转为可提交的浅色、深色 SVG，并在用户明确指定时维护 README 中的一小块嵌入标记。首个版本为 `v0.1.0`，仓库为 [abworks-dev/readme-banner](https://github.com/abworks-dev/readme-banner)。

`ascii` 是第一个 **renderer preset**；`terminal`、`ocean`、`neon`、`minimal` 是独立 **theme**。后续可增加非 ASCII 渲染器，不需要把所有样式硬塞入 ASCII 的选项。

v1 不包含 GitHub Action、托管 Web 服务、MCP 服务、HTTP API、登录 / 会话、数据库、邮件或定时任务。没有应用凭据或服务端秘密需要配置；因此不创建这些能力的空白运维文档。可分发的 agent skill 是操作指南，不是 CLI 内嵌的 LLM 执行器。

## 模块与数据流

```text
CLI arguments + target root (--cwd)
              |
              v
JSON configuration -> common validation -> preset / theme lookup
                                              |
                        +---------------------+---------------------+
                        v                                           v
           RenderContext(light palette)                RenderContext(dark palette)
                        |                                           |
                        +------------- BannerPreset.render ---------+
                                              |
                                       two SVG strings
                                              |
                         safe root-bound paths / generated snippet
                                              |
                     +------------------------+----------------------+
                     v                                               v
         assets or --check comparison                 explicit --readme only:
                                                      managed block / comparison
```

| 层 | 责任 | 明确不负责 |
| --- | --- | --- |
| CLI | 解析 `init` / `generate` / `presets` / `themes` 和显式文件操作意图 | 默认修改所有 README、执行 git 发布 |
| 配置 | JSON 解析、通用字段与版本验证、归一化 `options` | 动态 import、执行 JS 配置 |
| Registry | 按 id 注册、查找、列举 `BannerPreset` | 从用户 JSON 安装插件、隔离不可信代码 |
| Theme | 提供 light / dark 的 foreground、background、colors | 字体、布局与 preset 特有校验 |
| Preset | 校验自己的 `options`，接收上下文，返回 SVG | 自行决定 README 插入与目标路径 |
| 文件与 README 编排 | 安全路径、固定产物名、相对 URL、受管块、检查模式 | 把远程 SVG 当作可直接执行 / 注入的输入 |
| Skill | 确认目标仓库、主题、README 授权，调用相同 CLI | 扩大文件权限、自动提交或发布 |

通用配置与类型见 [配置实现](<../src/config.ts>)、[公开类型](<../src/types.ts>)；注册表和调色板见 [registry](<../src/registry.ts>)、[themes](<../src/themes.ts>)。ASCII renderer 使用精确锁定的 `ascii.rest@0.4.0`；依赖声明与构建入口见 [package.json](<../package.json>)。

## 核心接口与扩展

以下接口来自 [公开类型](<../src/types.ts>)：

```ts
export interface RenderContext {
  readonly config: BannerConfig;
  readonly palette: ThemePalette;
  readonly variant: ThemeVariant;
}

export interface BannerPreset {
  readonly id: string;
  readonly description: string;
  validateOptions(options: Record<string, unknown>): void;
  render(context: RenderContext): string | Promise<string>;
}
```

`ThemeVariant` 为 `'light' | 'dark'`。`ThemePalette` 含 `foreground`、`background` 和只读颜色数组 `colors`。原始 JSON 可以省略 `options`；通用解析后，`BannerConfig.options` 总是对象，便于渲染器处理。

[PresetRegistry](<../src/registry.ts>) 的关键入口是 `register(preset: BannerPreset): this`。注册 id 必须符合 `^[a-z][a-z0-9-]*$`，重复 id 报错；未知 preset 不回退到别的渲染器。调用方在程序代码中显式注册实现：

```ts
const registry = new PresetRegistry();
registry.register(myPreset); // myPreset implements BannerPreset
```

这不是 JSON 插件系统。新 renderer 必须自己验证选项、输出有效且安全的 SVG，并遵守既有上下文契约。注册表不提供沙箱；程序化接入新实现等于信任该代码。无需通过改变 `theme` 来“注册”新布局。

## 关键操作与副作用

| 操作 | 前置条件 | 可写范围 / 成功结果 | 拒绝或失败情况 |
| --- | --- | --- | --- |
| `init` | 已确认目标根目录，选项有效 | 只创建指定 JSON 配置 | 配置已存在时默认拒绝；只有显式 `--force` 才允许覆盖 |
| `generate` | JSON、preset、theme、选项、路径有效 | 写 `<outputDir>/banner.light.svg`、`banner.dark.svg`；stdout 给出片段 | 输入、渲染或路径错误，不通过扩大范围绕过 |
| `generate --readme PATH` | 用户明确要求插入 / 更新指定 README | 两张 SVG 与该 README 的受管块；块外原文保留 | 异常或重复标记需处理，不猜测删除范围 |
| `generate --check` | 相同的配置与路径校验 | 比较 SVG，不写文件 | 缺失、过期或无效输入以非零退出 |
| `generate --check --readme PATH` | 与上行相同，并显式指定 README | 同时比较该 README 受管块，不写文件 | README 或产物与预期不一致时失败 |
| `presets` / `themes` | CLI 可运行 | 只输出元数据，可 `--json` | 不修改项目 |
| 安装 skill | 用户授权安装说明 | 标准 skills 路径下的操作指南 | 不自动生成横幅、不自动授权 README 编辑 |

本地 CLI 没有额外的应用角色体系：调用者拥有其操作系统账户的文件权限。`--readme` 是防止意外编辑的显式意图门槛，不是防御恶意调用者的身份鉴权。

## 输入与文件边界

1. **目标根目录**：`--cwd` 确定本次操作的根；配置文件、输出目录与 README 路径均受此边界限制。路径解析检查包含符号链接逃逸的情况，并拒绝硬链接数 `nlink > 1` 的现有文件，不因配置要求而访问外部目标。
2. **配置是数据**：只解析 JSON；验证 `schemaVersion: 1`、通用字段与未知字段。preset 特有设置留在 `options` 并由对应 preset 验证。不执行配置 JavaScript、不加载任意代码插件。
3. **ASCII 输入**：标题非空、单行、最多 120 字符，所有字形必须受所选字体支持；副标题为最多 240 字符的普通文本。标题缺失字形报错，而非悄悄删除字符。`mixed` 以外的字体转为大写。
4. **art 来源**：只按名称选择已安装依赖中的内置 piece；拒绝 `meta.clock` 为真的实时时钟类 piece，以保证可重复生成。不拉取远程用户 SVG，也不把路径、URL 或原始 SVG 当成配置 art。
5. **产物契约**：输出固定为 light / dark 两个 SVG，保留原生动画；不把任意远程资源合并进产物。当前 ASCII 标题采样为 8 fps，每张 SVG 上限 2 MB；速度限制为 0.25–4。
6. **README 输出**：受管块标记为 `<!-- readme-banner:start -->` / `<!-- readme-banner:end -->`。图片 URL 从 README 所在目录计算并逐段 URI 编码；alt 文本进行 HTML 转义。默认没有 README 写入。
7. **安装边界**：本地生成不需要远程渲染服务；`npm install`、GitHub `npx --package` 与 skill 安装本身仍可能联网、执行可信包代码。JSON 不执行代码，不等于安装无代码执行风险。

## 已知假设与风险

- [注册表](<../src/registry.ts>) 保存并执行调用方提供的 renderer；其安全性依赖调用者信任所注册代码，而非隔离机制。
- [配置](<../src/config.ts>) 的长度上限不是排版保证。长 ASCII 标题和复杂 art 仍可能过宽、过大，应查看产物并调整，不机械追求最大字数。
- [公开类型](<../src/types.ts>) 的 `readonly` 只是 TypeScript 约束，不是对不可信第三方 renderer 的运行时隔离。
- [主题](<../src/themes.ts>) 与自定义 `colors` 不保证每种组合都有足够对比度；显式颜色会覆盖两种变体的标题配色，需要检查浅 / 深背景效果。
- SVG 动画能否播放取决于最终 README 查看器。保留动画不代表 GitHub 所有客户端或第三方 Markdown 渲染器均支持播放。
- 根目录、符号链接与硬链接检查是本地误写防护，不把共享目录变为安全沙箱；不要在恶意进程可并发替换目录的环境中把它当作强隔离。
- 内置品牌 art 来自第三方依赖，代码 MIT 许可不授予品牌商标权；详见 [第三方说明](<../THIRD_PARTY_NOTICES.md>)。

## 配置、发布与验证

- 无必需环境变量、访问令牌或服务密钥；项目 JSON 只存展示数据。不要把秘密写进标题或副标题，因为它们会进入可公开的 SVG / README。
- 源码运行：在工具目录执行 `npm install`，`prepare` 调用 TypeScript 构建；之后用本地 Node 入口搭配目标 `--cwd`。
- GitHub 安装入口：`npx --yes --package github:abworks-dev/readme-banner#v0.1.0 readme-banner …`，需要 Git，且仓库和标签必须已可访问。`@readme-banner/cli` 只是未发布的包名占位。遇到 `EALLOWGIT` 时，仅在用户已授权且组织策略允许的前提下，支持该选项的 npm 可单次添加 `--allow-git=root`；不修改全局 npm 配置，详见 [README](<../README.md>)。
- [package.json](<../package.json>) 声明 `npm run build`、`npm run check`、`npm test`；这里记录的是验证入口，不声称它们已经通过，也不虚构 CI 状态。
- 发布检查应覆盖：无 README 参数不编辑 README；init 只写配置且不静默覆盖；浅 / 深产物与嵌入；根外 / symlink / 硬链接拒绝；编码与 HTML 转义；非法 glyph / 配置拒绝；缺失或过期产物的 `--check` 无写入；registry 扩展与重复 id 拒绝。这里是需核对的契约，不是测试覆盖率报告。

## Related Documents

- [README](<../README.md>)：安装、CLI、示例与使用边界。
- [SKILL.md](<../skills/readme-banner/SKILL.md>)：可移植 agent 操作流程与授权边界。
- [配置参考](<../skills/readme-banner/references/configuration.md>)：配置字段、ASCII 选项、长度与路径契约。
- [THIRD_PARTY_NOTICES.md](<../THIRD_PARTY_NOTICES.md>)：上游归属、MIT 许可与商标注意事项。
- [LICENSE](<../LICENSE>)：本项目许可。
