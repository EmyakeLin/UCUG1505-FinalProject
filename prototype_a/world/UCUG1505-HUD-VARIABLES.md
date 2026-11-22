# HUD 重做：结构、变量与交互

2026-11-09。适用 `index.template.html`、`hud.css`、`hud.js` 及世界/建造/认知模块的 HUD 接口。覆盖旧文档中左右多面板、独立折叠动态面板、建造模块管理所有面板开合的设计。

## 界面职责

- 顶部：世界名称、游戏日与时刻、昼夜阶段；暂停和阳光范围保持直接可用。
- 左下：当前生活动态；其下是小球、建造、世界、认知四个导航入口，均有中文标签和统一线框 SVG。
- 右侧：一个稳定的详情外框，四种内容互斥。默认全收起，切换保留每页滚动位置；认知内容扩宽以容纳权重矩阵。
- 小球卡片：真实体色圆点、名字、行为、能量/精力数值和表条、心情。关系、想法、随身物品、补能细节单独展开；卡片持续更新原节点。昏迷、离世通过文字和表面状态区分。
- 建造：按能量与食物、居住与照护、玩耍与交往、学习与生产分组。选中后收起目录，独立放置托盘显示设施名称、当前定位反馈、确认/取消及键盘说明。
- 世界：环境、食物与餐饮、医疗与救援、存档、生命规则、重新开始。危险/死亡规则解释默认折叠，重开按钮与保存分区。
- 认知：保留独立分析页、导出快照、选球/选层、权重矩阵、单连接读数和完整权重下载；解读说明默认折叠。

地图、镜头、生命规则与存档结构不因本次 HUD 重做而变化。

## CSS 参数

| 参数 | 含义与单位 |
| --- | --- |
| --paper / --surface | 不透明奶油纸色与 HUD 半透明表面底色 |
| --ink / --muted | 主要文字与次级说明颜色 |
| --line / --accent / --accent-soft / --warning | 边界、主要操作、浅强调底色、重新开始提示颜色 |
| --control / --control-radius | 标准按钮最小高度 44px、控件圆角 12px；矩阵密集单元为独立 24/28px 规格并提供方向键导航 |
| --inset / --space | 屏幕边缘留白 20px（中窄屏 12/10px）；stack 内容间隔 12px |
| --panel-padding / --panel-radius | 侧栏内容留白 16px（窄屏14px）、外框圆角 28px |
| --drawer-width / --drawer-wide | 普通详情宽364px、认知宽680px；中屏340px，窄屏由可用宽度约束 |
| --drawer-top / --drawer-height | 侧栏距顶96px（窄屏148px、短屏72px）；最大高度=100dvh−顶部位置−底部预留 |
| --dock-height / --bottom-clearance | 底部导航高64px；侧栏/动态距底预留100px，按窄屏与短屏调整 |
| --motion / --feedback / --ease | 开合/尺寸过渡220ms、局部反馈130ms、共享缓动；减少动态偏好均改0ms |
| --shadow | HUD 表面轻阴影 |
| --screen-width | 100vw−两侧 inset，用于所有浮层最大宽度 |
| --resident-color | 每张卡片按实际小球颜色设置的 CSS 色值 |
| --event-room | 展开宽认知面板时动态条剩余横向空间=窗口宽−认知宽−3×边缘留白 |

`.surface` 统一表面；`.stack/.row/.button-grid` 负责内容排列；`.section-block` 分隔不同操作目的；`.card-details` 使用0fr/1fr实现解释区与卡片细节连续展开。主侧栏和建造托盘使用 transform/opacity/visibility 过渡，关闭时立即 inert，退出时继续绘制，快速反向操作由 CSS 接续当前状态。切换详情时保留外框，不重新播放外框入场。不同详情的内容高度由内容决定，最大高度约束下滚动。

## hud.js

| 变量 / 作用域 | 含义 |
| --- | --- |
| createHud.cancelBuilding | 从导航切走时取消当前建筑草稿的既有建造接口 |
| drawer / pages / title / subtitle / close | 唯一详情外框、滚动容器、标题、副标题、关闭按钮 |
| toggles / panels | 四个带 data-panel 的导航按钮、对应内容根节点 |
| scrollPositions | 按面板 ID 保存的内部滚动高度 px |
| buildToggle / tray | 建造导航、独立放置托盘；托盘初始化移除 hidden 后以可见类和 inert 管理 |
| active / placing / lastToggle | 当前详情面板 ID 或 null、是否存在待放置草稿、关闭时归还焦点的导航入口 |
| select.next / cancel / previous / shouldCancel | 目标面板、是否允许退出放置、切换前面板、是否需取消草稿并恢复原暂停状态 |
| select.toggle / open / panel / button | 正在更新的导航、开合判断、内容节点、查找对应导航的迭代项 |
| placement.activePlacement / name / focusInTray | 建造接口传入的放置状态、设施名称、收起托盘前焦点是否在其中 |
| event / button / details / open | 事件对象、细节展开按钮、其 aria-controls 对应容器、目标展开状态 |

`select(null,false)` 用于选好设施后的目录收起，保留草稿。切换到小球/世界/认知会调用 cancelBuilding；重新打开建造目录可以更换设施。确认/取消后恢复建造前暂停状态；因按钮操作收起托盘时焦点归还建造入口。Esc 优先由建造模块取消草稿（preventDefault），没有草稿时由 HUD 收起详情。矩阵方向键仍在认知组件内部处理。

## HTML 数据、世界与其他模块

| 文件 / 参数 | 含义 |
| --- | --- |
| template data-panel / data-title / data-subtitle | 导航关联的内容根 ID，以及共用侧栏标题/副标题 |
| aria-controls / aria-expanded / inert | 导航、卡片和说明的关联、当前展开状态、关闭内容不可聚焦 |
| data-health / data-building | 卡片真实生命状态；建造入口是否处于放置阶段 |
| world.hud / construction | HUD 和建造控制器引用；初始化先建造、再 HUD、再认知查看器，确保开合监听先于认知刷新 |
| makeCreature.residentColor / detailsId | 真实小球整数颜色转成的六位十六进制色、按居民下标生成的详情区唯一 ID |
| updateUI.awakeCount / comaCount / deadCount | 按真实健康状态计算的三类居民数；不改变模拟状态 |
| resident-count / resident-health | 导航总数量、居民面板中的存活/昏迷/离世摘要 |
| energy-value / rest-value | 现有 energy 与 1−fatigue 对应的四舍五入百分数，与原 meter 同源 |
| winter-status / food-status / medical-status | 分别接 worldClimate、logistics/provisions 摘要、medical 摘要；替代旧版将全部信息拼进一段的做法 |
| construction.categories / category / name / keys | 分组目录数据、分组项、用户可读组名、所属设施类型列表 |
| construction.groups / section / heading / options / key | 设施类型到目录容器的映射、分组根节点、标题、选项网格、映射中的类型 |
| construction.api.onPlacement(active,name) | 草稿开始/结束时通知 HUD 的接口；建造模块不再绑定全局面板折叠事件或直接控制托盘隐藏 |
| brain-inspector.toggle | 现在绑定底部 brain-toggle；刷新仍依据 aria-expanded，旧右侧双面板互斥监听交由统一 HUD 取代 |
| build.imports.hud / HUD_STYLES | 打包时内嵌 HUD 模块和样式文本，单 HTML 离线运行，不请求外部字体或图标 |

## 本次代码逻辑评审

已按源码追踪初始收起、导航切换、保存与读取入口、卡片局部刷新、建造选中→定位→确认/取消、更换设施、建造中切走、Esc事件优先级、认知打开时刷新、滚动记忆、inert与焦点归还。导航图标规则见 UCUG1505-SVG-STYLE.md。

900px以下放置托盘移至导航上方，打开详情或放置时收起可能遮挡的动态条；600px以下侧栏使用可用屏宽、顶部两行控制、底部四等分导航；短屏压缩空白并限制内容高度。长中文说明允许换行，矩阵单独双向滚动。关闭内容不拦截世界点击。

遵循 frontend-design-emyake 技能：仅根据代码逻辑评审，不运行界面、不截图、不执行语法检查或 UI smoke test。离线打包是文件拼装操作，不作为实际交互或视觉验证；本次没有新增镜像实现的 UI 测试。
