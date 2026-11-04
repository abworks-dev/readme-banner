# 第三方归属与许可

## ascii.rest 0.4.0

readme-banner 的首个 `ascii` renderer 使用精确版本 **`ascii.rest@0.4.0`**，通过其 banner / SVG 能力与内置 pieces 生成资源。

| 项目 | 信息 |
| --- | --- |
| 上游 | [ascii.rest](https://ascii.rest/docs/) |
| 源码 | [bas3line/ascii](https://github.com/bas3line/ascii) |
| 包 | [ascii.rest 0.4.0](https://www.npmjs.com/package/ascii.rest/v/0.4.0) |
| 作者 / 版权方 | bas3line |
| 许可 | MIT |

依赖版本见 [package.json](<package.json>) 与 [package-lock.json](<package-lock.json>)。这是对上游的依赖与归属说明，不表示 readme-banner 是上游官方项目或获得其背书。

### 再分发要求

- 使用 npm 依赖时，保留依赖包自带的许可文件。
- 如果未来把上游源码、内置 pieces 或其代码的实质部分复制、vendor、打包或随本项目重新分发，必须保留**原始版权声明与 MIT 许可全文**，不能只保留本项目自己的许可或这个摘要。
- 若再分发经过修改的副本，应清楚标注修改，避免把本项目改动归因于上游。应按实际打包内容逐项复核第三方许可；本文件不替代其他依赖随附的许可。

以下为本次安装的 `ascii.rest@0.4.0` 所附 MIT 许可原文：

```text
MIT License

Copyright (c) 2026 bas3line (https://github.com/bas3line)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 品牌与商标

上游内置 pieces 可能包含产品、公司、项目或发行版的名称与标志。**软件的 MIT 许可不自动授予商标、品牌使用或背书权利。** 选择品牌 art 前应核对对应权利人的使用规范；不要暗示合作、认证或官方身份。默认文档示例使用 `donut` 这样的非品牌图案，不代表所有内置图案都适用于任意用途。

## 开发依赖

构建 / 类型检查使用 TypeScript（Apache-2.0）、`@types/node`（MIT）及其 `undici-types`（MIT）类型依赖。它们的锁定版本与依赖关系见 [package-lock.json](<package-lock.json>)；再分发工具链或其源码时须另外保留各包自己的完整许可。不要把运行时 `ascii.rest` 的 MIT 声明当作整个工具链的统一许可。

本项目自己的许可见 [LICENSE](<LICENSE>)；它不覆盖、替换或抹去第三方版权声明。
