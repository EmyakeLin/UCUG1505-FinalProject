# AI Usage Declaration

本项目使用 OpenAI Codex 辅助准备与开发。本文档记录 AI 实际执行的文件修改及相关协助，不是 design diary，也不替代学生本人的创作记录与反思。

## 使用边界

- 以项目根目录 `AGENTS.md` 和用户后续明确要求为依据。
- AI 不参与 design diary 的写作、代写或润色。
- AI 每次修改项目文件时，同步在本文档记录修改范围与内容。
- 不将尚未实现、运行或验证的内容描述为已完成。

## 已确认的开发约束

- Prototype A 截止时间：2026 年 11 月 9 日上午 11:59（Asia/Shanghai，北京时间）。
- 使用 p5.js；可按需使用 three.js、matter.js。
- Prototype A 的交互全部在屏幕内完成，目标是可玩、好玩的游戏；实体交互留给 Prototype B 和 Prototype C。
- 遵循用户要求，不主动扩展项目理念或探索评分标准。

## AI 协助与修改记录

### 2026-11-08：开发准备

- 使用工具：OpenAI Codex。
- 协助内容：读取根目录 `AGENTS.md`；检查工作目录及 `project_spec`、`prototype_a` 的文件状态；确认截止时间和开发工具约束。
- 检查结果：`project_spec`、`prototype_a` 当前为空；项目根目录当前不是 Git 仓库。
- 新增文件：`AI usage declaration.md`，建立 AI 使用边界、开发约束和修改追踪记录。
- 未读取或修改 `design_diary` 内的内容；未生成游戏代码、设计文稿或测试。

### 2026-11-08：世界日常建筑设计

- 使用工具：OpenAI Codex 与内置 image_gen 图像生成工具；使用 imagegen 技能及 write-page 写作规范。
- 用户要求：暂缓灾难与拯救叙事，先为小球的日常世界设计三渲二、卡通、粗勾边建筑，供用户自行建模。
- 协助内容：设计供能巨碑、睡眠窝、分享食盆、游玩拱门，给出统一比例、拆件、材质区域、通行空间、俯视可见性和资产交付建议。这些是 AI 提出的建模方案，尚未作为完成的游戏功能。
- 新增 `project_spec/建筑建模说明_v01.md`：建模交接说明；不属于 design diary。
- 新增 `project_spec/building-concepts-v01.png`：AI 生成的四建筑概念板，从工具生成目录复制至项目。
- 新增 `project_spec/building-concepts-v01.prompt.txt`：保存生成概念板使用的完整提示词。
- 更新 `AI usage declaration.md`：记录本次文件修改和 AI 图像生成。
- 验证：已目视检查生成图；图中比例与部分投影不精确，已在建模说明中标注以文字尺寸为准。本次未创建 3D 模型、未实现渲染或碰撞、未进行游戏运行测试。
- 未读取或修改 `design_diary` 内的内容。

### 2026-11-08：按 2001 太空漫游修订巨碑

- 用户要求：巨碑参考斯坦利·库布里克与亚瑟·克拉克的《2001太空漫游》。
- AI 协助：查阅电影制作资料和小说巨碑比例资料；将种子状供能建筑改为无装饰的黑色直立长方体，采用厚宽高 1:4:9 的设计比例；修正固定视野被过度限定为垂直俯视的假设。
- 修改 `project_spec/建筑建模说明_v01.md`：替换巨碑形体、尺寸、材质、拆件、碰撞和检查要求；标明旧图 01 作废，新增来源链接与镜头可见性限制。
- 新增 `project_spec/monolith-concept-v02.png`：使用内置 image_gen 生成独立修订概念板并复制至项目；旧版概念图保留用于其他三种建筑参考。
- 新增 `project_spec/monolith-concept-v02.prompt.txt`：保存完整生成提示词。
- 修改 `AI usage declaration.md` 记录本次工作。已目视检查图像，标注图像比例误差；未创建或测试 3D 模型，未读取或修改 design diary。

### 2026-11-08：纠正巨碑参考的含义

- 用户澄清：巨碑应与世界其他元素格格不入，整体是肃杀气氛的立方体，不应照抄 2001 巨碑，也不必保持 1:4:9。
- 修改 `project_spec/建筑建模说明_v01.md`：撤销 v02 的细长碑和比例要求，采用冷硬立方体方案；3D 边长仅为 AI 建议的灰模起点。同步修订尺寸、碰撞、镜头说明、参考说明及文件名。
- 使用内置 image_gen 编辑前一版概念板，新增 `project_spec/monolith-concept-v03.png` 与完整提示词 `project_spec/monolith-concept-v03.prompt.txt`。旧图保留，文档明确其被替代。
- 更新 `AI usage declaration.md` 记录本次修改。已目视检查概念图，未创建 3D 模型或进行游戏运行测试；未读取或修改 design diary。

### 2026-11-08：补充纹理并恢复供能功能的视觉表达

- 用户要求：巨碑不能只是光秃立方体，需要纹理；作为供能巨碑，外观必须体现供能。
- 使用内置 image_gen 先编辑生成石纹刻槽中间稿 v04；用户补充功能要求后继续编辑为 v05，加入顶部核心、连续导能槽、低位供能口和能量传递示意。v04 未采用，未复制到项目。
- 新增 `project_spec/monolith-concept-v05.png` 和完整最终提示词 `project_spec/monolith-concept-v05.prompt.txt`。
- 修改 `project_spec/建筑建模说明_v01.md`：撤销无纹理、无核心、无出口及单一网格的限制，补充石质贴图、几何刻槽、独立发光部件、尺寸、UV、能量流动和模型检查要求。
- 修改 `AI usage declaration.md` 记录此次修订。已目视检查概念图，并标明视图之间的刻槽差异及浅嵌尺寸依据；尚未创建模型、材质或运行游戏验证。未读取或修改 design diary。

### 2026-11-08：打包建模资产

- 用户要求：将建模所需样图与提示词打包为 ZIP。
- 新增 `project_spec/建模交付包说明.md`：明确有效版本、阅读顺序、建模交付要求，以及四建筑合图第 01 栏作废的说明。
- 新增 `project_spec/当前建筑建模提示词.txt`：按当前方案整理四类建筑的独立建模提示词，避免原始图片编辑提示词依赖此前对话。
- 新增根目录 `Prototype_A_Modeling_Assets_2026-11-08.zip`：包含两张有效参考图片、两个原始图片提示词、当前建模提示词、建模说明、交付说明及本 AI 使用声明。未包含废止的独立巨碑 v02、v03 图像或 design diary。
- 更新 `AI usage declaration.md` 记录打包工作。ZIP 创建后检查条目、解压读取和源文件字节一致性；未生成新的图片或 3D 模型。

### 2026-11-08：小球 HTML 演示

- 用户要求：编写一个小 HTML 展示小球。
- 新增 `prototype_a/little-lives.html`：单文件交互演示，使用固定版本 p5.js 主循环、Three.js 三渲二球体及外扩描边、Matter.js 地面碰撞；包含呼吸、步态形变、眨眼、追逐、结伴休息、点击地面、点击小球及暂停功能。
- 演示中的动作控制和 42 秒循环用于展示，不是正式游戏的造物主权能或已实现的自主生命系统。
- 新增 `prototype_a/UCUG1505-VARIABLES.md`：变量、单位、动作逻辑和使用说明。
- 更新 `AI usage declaration.md` 记录文件修改。采用 frontend-design-emyake 技能，以代码逻辑审查验证结构、状态及交互，未运行页面、截图或语法测试。依赖地址网络验证受环境限制，尚未确认浏览器实际运行效果；HTML 需要联网加载库并提供备用 CDN。
- 未读取或修改 design diary；未修改已交付的建筑模型 ZIP。

### 2026-11-08：建筑接入与自主生活场景

- 用户授权：继续完成模型接入、基本通行，以及小球自主补充能量、休息和玩耍。
- 读取用户提供的 `prototype_a/Prototype_A_Entry_Wall_Revision5.zip` 的模型目录、README、几何检查记录及建造脚本，用于核对节点、平台高度与坐标；未执行包内建模脚本，未修改原包或原模型。
- 新增 `prototype_a/assets/models/` 下六个 GLB 副本，包括四建筑、食盆展示版与能量粒。场景使用无粒子的干净食盆，展示版仅保留为源资产。
- 新增 `prototype_a/world/world.js`、`index.template.html`、`build.mjs`、`README.md`、`UCUG1505-WORLD-VARIABLES.md`：实现 GLB 解析、卡通材质、固定镜头、按结构网格投影建立障碍、栅格路线、平台高度采样、设施预约、能量/疲劳/社交规则、简单相聚玩耍和观察界面，提供离线打包及变量说明。
- 新增 `prototype_a/world/vendor/`：下载固定版本 Three.js 0.160.1、GLTFLoader、BufferGeometryUtils、Matter.js 0.20.0、p5.js 1.11.3 及各自许可证。第三方源码未作直接修改；打包时将加载器的工具模块路径替换为内嵌 import map 名称。
- 新增 `prototype_a/living-world.html`：把代码、五种运行时 GLB、纹理、依赖及许可证内嵌为可离线打开的单文件。保留原 `little-lives.html`。
- 已完成资源层面的检查：核对 GLB 节点及内嵌资源情况；打包后比较五个内嵌模型与源文件的字节一致性。代码逻辑审查覆盖碰撞范围、寻路、安全净空、预约释放、需求优先级、暂停与状态反馈。
- 遵照 frontend-design-emyake 技能限制，未运行浏览器、场景模拟、截图或语法 smoke test。运行时代码中的入口可达性检查尚未实际执行，不能把其存在视为已通过测试；实际视觉、通行与长期行为效果仍待实机确认。
- 此版使用预置建筑、规则行为和缓慢自动补充食盆；没有实现建造交互、污染灾难、LLM、自主文明、搬运链或存档。更新本 AI 声明；未读取或修改 design diary。

### 2026-11-08：修正巨碑的场景呈现

- 用户反馈场景中的巨碑感觉不对。核对设计说明、GLB 材质与节点；从用户模型包复制原始巨碑参考图至 `prototype_a/assets/monolith-source-reference.png` 并查看，以理解原模型外观。此图是已有模型参考资产，不是对所产出网页运行截图。
- 修改 `prototype_a/world/world.js`：巨碑凹槽和发光零件取消逐件放大黑壳描边，改用单一外轮廓；保留原模型的发光强度差异，增加方向光投影，并将巨碑水平旋转 22.5 度以展示侧面。没有压缩模型高度或修改用户 GLB。
- 修改 `prototype_a/world/README.md` 与 `UCUG1505-WORLD-VARIABLES.md` 记录渲染机制和新增变量；重新生成 `prototype_a/living-world.html`。
- 进行模型数据和代码逻辑检查，未运行网页或截图，不能声称实际视觉效果已获验证。更新 AI 使用声明，未读取或修改 design diary。

### 2026-11-08：新供能巨碑与阳光中心

- 用户提供 `Prototype_A_Five_Buildings_Final.zip`，要求替换供能巨碑并接入阳光中心；补充确定 r=4D，最低恢复固定取静止基础消耗的 20%。
- 读取包内 README、阳光中心说明、验证元数据与建造脚本；提取 `building_monolith_v08.glb` 和 `building_sunlight_center_v01.glb` 至 `prototype_a/assets/models/`，不修改用户模型。读取 GLB 节点、材质与资源描述，确认新巨碑主动关闭高对比石纹，使用低对比板岩蓝配色。
- 修改 `prototype_a/world/world.js`：接入第五建筑，增加底座和巨碑接口碰撞，按距离连续计算被动阳光补给；0～r 采用线性衰减，r～3r 恒定最低值，超过 3r 停止。正常能量消耗继续扣除，能量不超过上限。
- 新增 `energy-rules.mjs` 和 `energy-rules.test.mjs`：将规则独立为纯数值模块；峰值为巨碑恢复率 20%，最低为静止消耗率 20%，分别为 0.017/s 与 0.0006/s。执行数值边界、衰减、连续性和截止测试并通过；未运行网页或场景模拟。
- 修改 `index.template.html`、`README.md`、`UCUG1505-WORLD-VARIABLES.md`：加入阳光范围观察开关、每只小球补给速率与规则说明，标明显示的是额外恢复而非净增长。
- 修改 `build.mjs` 并重新生成 `prototype_a/living-world.html`：内嵌新模型和能量模块，维持离线打开。旧巨碑文件保留但不加载；更新本声明，未读取或修改 design diary。

### 2026-11-08：食物工厂、小推车建模指南

- 用户要求：按此前建模资产包的方式，为食物工厂与小推车制作样图、提示词并打包 ZIP；用户新版食盆为 4D，尚未交付，本次不修改食盆。
- 新增 `project_spec/food-logistics/`：包含先读说明、食物工厂建模指南、小推车建模指南、两种资产的独立中文建模提示词、两份实际英文生图提示词和两张 PNG 概念参考板。
- 使用内置 imagegen 工具生成 `food-workshop-reference-v01.png` 与 `food-cart-reference-v01.png`；复制用户已有模型包内 `previews/approved_style_scene_STUDY.png` 为 `existing-world-style-reference.png`，仅作色彩与体块参照，明确其中旧食盆尺寸不可沿用。生成图已进行视觉检查；它们是概念参考，不是精确工程图，轮轴、门轴、尺度与净空由文字指南规定。
- AI 辅助细化开放式培养工坊、身体按压工作垫、出货槽、四轮低推垫配送车的外观与建模规格；建议工坊占地 6D×4.5D、推车 1.8D×2.2D、四颗 0.7D 食物单层装载，均为本次建模建议，非已经验证的平衡参数。
- 明确自然供能、食物储运和污染巨碑的功能关系；推车停在 4D 食盆外侧，不预设新版食盆入口或边缘高度。模型拆件、Empty 定位、坐标轴与 GLB 导出要求用于后续接入，不声称生产或配送已实现。
- 新增根目录 `食物工厂、小推车建模指南.zip`，打包上述资料与本声明快照；完成后核对 ZIP 条目及各文件解压读取后的 SHA-256 与源文件一致性。
- 未生成最终 3D 模型，未修改游戏代码、用户 GLB、已有 ZIP 或 design diary。未执行游戏、浏览器或场景测试。
