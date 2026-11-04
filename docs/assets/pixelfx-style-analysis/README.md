# pixelfx 美术分析参考图

这些是[美术方向分析](../../pixelfx-art-direction-analysis.md)的固定版本采样证据，不是新的横幅预设。

- 上游：[patch-gg/pixelfx](https://github.com/patch-gg/pixelfx/tree/a84159688af3ca37a4be05a0d422b94451b2e24e)，提交 `a84159688af3ca37a4be05a0d422b94451b2e24e`。
- [默认特效对照](native-style-board.png)：六个原默认特效，每个循环选择原始 `light` 总能量最大的 30fps 采样帧，统一最近邻 2×；没有分别拉伸。
- [同相位参数对照](same-phase-options.png)：固定 Energy core 的 0.08 秒、原生 112×100 和同一官方深色地面，只比较默认值与早期原型的参数。
- [采样数据](measurements.json)：光与实体像素、包含微弱辉光的支撑包围盒、实际合成后的 RGB 数及早期原型的尺度。主色阶长度不是最终画面的颜色上限。

临时采样脚本留在开发缓存中，不属于稳定接口。生成画面来自上游程序化特效与其 MIT 核心绘图/字形，不使用专有 Patch Pixel 画廊字体或图片生成服务。

上游代码与特效为 MIT，Copyright (c) 2026 Patch；部分素材包含 Copyright (c) 2026 Hugo Duprez。保留[完整 MIT 声明和上游署名](../../../examples/pixel-game-vfx/THIRD_PARTY_NOTICES.md)。
