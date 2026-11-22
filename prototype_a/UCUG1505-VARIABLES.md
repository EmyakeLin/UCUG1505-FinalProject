# 小球演示变量与实现说明

对应 `little-lives.html`。直接用现代浏览器打开；需要网络加载固定版本 Three.js 0.160.1、Matter.js 0.20.0 与 p5.js 1.11.3，分别提供 jsDelivr 和 unpkg 地址。无需构建或服务器。这个文件展示角色和动作，不是完整生态或 LLM 行为系统。自由活动是 42 秒循环的散步、追逐、休息演示；追逐角色定期交换，散步目标和眨眼含随机变化。

## CSS 参数

| 变量 | 含义 |
| --- | --- |
| --paper / --ink / --muted | 页面纸色、主要文字、辅助文字颜色 |
| --line / --green | 控件及画布边界色、选中操作背景色 |
| --gap | 同组控件间距，10 CSS px |
| --radius | 场景容器圆角，16 CSS px |
| --motion | 控件颜色及按下过渡时间，160 ms；减少动效时为 0 |

## 加载与页面

| 作用域及变量 | 含义 |
| --- | --- |
| dependencies / urls / url | 三个库的候选 URL 列表、当前库的两个地址、当前加载地址 |
| loading | 加载及故障提示节点 |
| loadScript: resolve / reject / script | Promise 成功回调、失败回调、插入页面的经典脚本节点 |
| boot: error | 依赖加载或同步场景初始化失败对象 |
| stage / status / actions / buttonTemplate | 场景容器、当前行为说明、动作控件容器、共用按钮模板 |
| buttons | 操作键到按钮的 Map，便于原位更新选中状态 |
| addButton: key / label / handler / button | 操作标识、可见文本、点击回调、当前按钮实例 |
| syncButtons: key / button / selected | 当前操作标识、节点及 aria-pressed 目标状态 |
| selectMode: nextMode | 用户选择的下一演示模式 |

## 世界与资源

| 变量 | 含义 |
| --- | --- |
| reducedMotion | 系统减少动效媒体查询，缩小步态弹跳和碰触晃动 |
| renderer / scene / camera | WebGL 渲染器、三维场景、固定角度正交镜头 |
| sunlight / ramp | 方向光、三档明暗 DataTexture |
| bodyGeometry / eyeGeometry | 共用身体球体网格、眼睛与腮红使用的单位球体网格 |
| outlineMaterial / eyeMaterial | 反面外扩描边材质、五官深色材质 |
| ground / shadowMaterial | 可见圆形地面、每只小球阴影的基础材质 |
| engine / walls | Matter 物理引擎、四个静态边界刚体 |
| physicsScale | 每个 Three 世界单位对应 100 个 Matter 坐标单位 |
| fixedStep | 固定物理步长，1/60 秒 |
| marker | 点击目标地面的圆环反馈 |
| raycaster / pointer / groundPlane / hitPoint | 点击射线、标准设备坐标、y=0 地面平面、射线交点 |
| clock / accumulator | 模拟秒数、待处理时间累积秒数；暂停时不推进 |
| mode / paused | auto、play、rest 模式，以及暂停开关 |
| markerLife / manualUntil | 圆环剩余展示秒数、点击地面临时目标的模拟截止秒数 |
| destination / lastStatus | 临时地面目标 x/z（用 Vector2.x/y 存储）、上次已显示说明 |
| configs / creatures | 两只小球的初始外观配置、持久角色对象列表 |
| config.name / color / x / z / phase | 名称、肤色、起始世界位置、呼吸和步态相位（弧度） |

## 角色对象与创建局部量

| 变量或字段 | 含义 |
| --- | --- |
| config | 当前个体的初始配置 |
| root / heading / pose | 地面位置组、竖直朝向组、身体高度及形变组 |
| skin / mesh / outline | 身体卡通材质、身体网格、外扩反面描边网格 |
| eyes / eye / side | 两只眼睛数组、当前眼睛、左右符号 -1 或 1 |
| blushMaterial / cheek / mouth | 腮红材质、当前腮红网格、半圆微笑网格 |
| shadow / body | 独立地面阴影、圆形物理刚体 |
| previous.x / previous.y | 上一物理步 Matter 位置，渲染插值使用 |
| target | 行为目标世界位置，Vector2 的 y 对应 Three.z |
| turn / sleep / impact | 平滑朝向弧度、睡眠姿态混合权重 0～1、接触挤压强度 |
| petUntil / nextBlink / blinkUntil / nextWander | 碰触回应截止、下一次眨眼、眨眼截止、下次散步换目标的模拟秒数 |

## 行为与物理更新

| 变量 | 含义 |
| --- | --- |
| chooseActivity: cycle | 模拟时间对 42 秒取余，用于自动演示分段 |
| creature / index / activity | 当前个体、索引 0 或 1、当前行为名称 |
| partner / x / z | 对方个体、当前小球的世界坐标 |
| offset / restX | 点击目标旁的左右错位量、共同休息的左右目标位置 |
| leader / orbit | 当前追逐领跑者索引、领跑路径的角度 |
| dx / dz / distance | 到目标的两个轴差值、距离，世界单位 |
| pursuing / stopDistance / remaining | 是否玩耍、停止距离、扣除停止距离后的剩余路程 |
| speed / isPetted | 目标世界速度（每秒）、是否正在响应碰触；小雾速度乘 0.88 |
| resting / targetSleep | 是否到达休息位置、睡眠姿态目标权重 |
| inverseDistance | 距离倒数，用于计算归一化方向，零距离时为 0 |
| desiredX / desiredY | 目标 Matter 基准步速度，由世界每秒速度换算 |
| forceGain / forceX / forceY | 质量相关转向力度、两个轴施加的力 |
| desiredTurn / turnDifference | 目标朝向、包装到最短路径的角度差 |
| collisionStart: event / pair / involved | 碰撞事件、接触对、当前小球是否参与接触 |
| stepWorld: messages / beingPetted / message | 行为说明映射、是否有小球处于回应期、最终说明 |

## 动画与输入

| 变量 | 含义 |
| --- | --- |
| drawCreature: alpha / blendX / blendZ | 插值比例、插值后世界坐标 |
| velocity / moving | Matter 速度标量、0～1 步态活动权重 |
| motionScale / phase / gait | 减少动效系数、步态相位、步态正弦值 |
| breath / pet | 呼吸形变、碰触回应形变 |
| heightScale / widthScale | 竖向缩放、按 1/sqrt(heightScale) 得到的横向缩放 |
| hop / bodyHeight / lean | 视觉跳跃高度、身体中心高度、左右摆动弧度 |
| blink / beingPetted / openness | 是否眨眼、是否回应触摸、眼睛睁开程度 |
| pointerdown: event / bounds / hit | 指针事件、画布客户区尺寸、射线与地面是否相交 |
| touched / meshes | 是否命中小球、当前小球子网格的射线相交结果 |
| resize: width / height / aspect | 容器 CSS 像素尺寸与宽高比 |
| verticalSpan / horizontalSpan | 正交镜头上下、左右半跨度；窄屏自动扩大纵向范围以保留岛屿 |
| observer | ResizeObserver，监听容器尺寸变化 |
| webglcontextlost: event | 上下文丢失事件，暂停并提示刷新 |
| sketch / frameTime / ringScale | p5 实例、每帧限幅后秒数、点击圆环的扩散比例 |

## 代码逻辑审查范围

仅根据代码追踪：固定步更新与插值、Matter 到 Three 坐标映射、稳定圆形碰撞、身体与五官的父子结构、动作中断与睡眠权重连续变化、暂停及隐藏页面时间控制、指针目标限界、响应式镜头、按钮焦点状态、依赖失败和 WebGL 丢失提示。

已修正碰触提示被下一帧覆盖、触摸文案与眼睛动作不对应，以及两个小球移动速度完全相同的问题。此演示不实现地形导航、真实软体、垂直物理跳跃、关系学习或 LLM 决策。

按照 frontend-design-emyake 技能的验证规则，未运行浏览器、截图、编译或语法 smoke test；无法据此保证实际运行画面。依赖地址访问受当前工具网络限制，未完成下载连通性验证；HTML 包含备用 CDN，用户打开时仍需联网。
