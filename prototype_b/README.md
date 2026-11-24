# 小球世界 · Prototype B 软件预演

这个包只接「放下物件 → 稳定 → 尝试建造 → 拿走后保留建筑」。**模拟输入是开发验收工具，不是展场输入；没有连接摄像头。**

## 启动

1. 将这个包里的 `prototype_b` 文件夹放到 `UCUG1505-FinalProject` 项目根目录，与 `prototype_a` 并列。
2. 在项目根目录打开终端，运行 `node prototype_b/build.mjs`。
3. 用 Chrome 或 Edge 打开生成的 `prototype_b/living-world.html`。原来的 `prototype_a/living-world.html` 不会被修改。

如果重新构建，先把旧的 B 页面改名或移走；脚本默认不覆盖已有的 B。A 和 B 使用不同的存档键。

构建需要本地已有原项目的 `prototype_a/living-world.html`（GitHub 上当前版本已包含）。不需要 `npm install`，也不需要联网。若不知道 Node.js 是否可用，先运行 `node --version`。

## 开发验收

在 B 右上角的「模拟输入（非现场试玩）」中点击「选地面并模拟放下」，再点画面里的一块空地。约 2 秒后，成功时会生成一座安静花园。点击「模拟拿走」不会删除花园；等状态显示为空后，可再放到另一块空地。若待选位置挡路，橙圈变红，不会生成建筑；可直接改选位置重试。小球发现新设施时会短暂出现问号。

花园沿用既有建筑通行检查和小球自主生活，不强制小球去访问。真实摄像头、轮廓追踪、真实桌面坐标校准、物体分类、环境声音和临时障碍都不在这次交付范围内。

测试状态逻辑：`node --test prototype_b/placement.test.mjs`。
