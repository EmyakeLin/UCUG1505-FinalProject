# 生活场景变量说明

2026-11-09 HUD 已改为顶部快捷操作、底部导航、单一详情侧栏，现行结构、变量与交互见 [UCUG1505-HUD-VARIABLES.md](UCUG1505-HUD-VARIABLES.md)，覆盖下方旧左右面板结构。

2026-11-09 扩大地图、按功能重排建筑与旧存档迁移的现行规则见 [UCUG1505-LAYOUT-VARIABLES.md](UCUG1505-LAYOUT-VARIABLES.md)，覆盖下方旧最小尺寸与初始坐标。

2026-11-09 个体神经学习、九项新设施、社会任务、研究议事及存档的新增/变化变量，见 [UCUG1505-COGNITION-VARIABLES.md](UCUG1505-COGNITION-VARIABLES.md)。该文档与 README 最新章节覆盖下面较早的固定规则、无存档和单实例描述。

## 建造与全窗口 HUD（2026-11-09）

本节覆盖此前单实例/固定尺寸说明。world.foodState 只作为初始工坊状态；进食库存属于 slot.foodSite.state.bowl。world.logistics 现在是多工坊的统一入口，不是唯一工坊实例。新增类型的菜单项不等于新增功能，必须同时提供模型与行为适配。

| 文件/作用域与变量 | 含义及单位 |
| --- | --- |
| viewportAspect / WORLD_WIDTH / WORLD_DEPTH | 初始窗口宽高比（最低 0.6）、世界宽至少 48D/深至少 32D；按 0.636 地面投影比例推导另一边，保证原始比例下世界铺满视野 |
| NX / NZ / resize.verticalPadding / horizontalPadding | 场地按 0.12D 向上取整格数；镜头纵半幅=深×0.318、横半幅=宽/2，窗口变化时取能容纳世界的跨度 |
| templates / buildings / buildingSerial | 未附加作物和车载物的已风格化模型模板、正式建筑记录集合、会话内实例 ID 自增序号 |
| sunCenters / sunOverlays / chargeSystems | 各阳光中心坐标、范围显示平面、各巨碑的独立充能效果控制器 |
| foodSites / foodControllers / toySlots / terrainBodies | 食盆库存记录、工坊控制器、所有拱门预约位、当前由地形烘焙生成的静态物理体 |
| rebuildTerrain: commit / addTerrainBody / body | 是否提交物理体；增添静态碰撞体函数、当前物理体；检查模式仅临时更新导航及高度 |
| cartGrid / cartPath.cell / width / depth | 缓存的车辆障碍格、车辆格边长 0.48D、该格网宽深；每次地形变化作废缓存 |
| cartPath: start / end / pointAtCart / index | 车辆起终点 D、格索引到中心坐标函数、当前格索引 |
| clearSegment: a / b / distance / steps / step / weight | 车辆线段起终点、长度 D、0.12D 分段数、分段序号与插值比例；每点检查 2.12D 转向包络 |
| nearest: point / column / row / ring / dx / dz / x / z | 车辆端点、所在格列行、最多两格近邻范围、偏移及候选列行；需要与端点直线可达 |
| cartPath: from / to / cells / route / smooth / anchor / last | 起终格、搜索格序列、世界路径、简化结果、简化锚点、当前最远可直达节点 |
| footprint: root / bounds | 建筑模型组与三维包围盒；返回 minX/maxX/minZ/maxZ 水平占地 D |
| modelParts: root / key / colliders / surfaces / mesh / name | 模型根、类型、结构碰撞网格、地板网格、遍历网格、祖先名称；排除描边壳 |
| buildingAnchors: draft / key / model / id / point / result | 待放记录、类型、主体模型、唯一 ID、主体坐标、实例交互位列表 |
| slot: kind / suffix / position / extra | 交互用途、实例内后缀、位置、供能口或拱门等附加字段 |
| buildingAnchors: name / center / offset / index / angle / entry / exit / side / port / normal / standing | 睡垫名称与中心、进食偏移、阳光休息序号及弧度、拱门入口出口、供能面及口中心/法线/站位 |
| createDraft: root / model / id / cart / mesh / materials / cloned / material | 预览根组、主体、唯一 ID、工坊附带车、遍历网格、原材质数组、独立克隆材质与当前材质；共享几何，不共享可变实例材质 |
| draft.key / id / root / model / cart / colliders / surfaces / anchors / box | 类型、实例标识、组合根、主体与车、碰撞/高度网格、独立交互位和保守占地 |
| positionDraft: point | 地面选点 D；主体使用世界坐标，附带车相对工坊偏移 (+2.42,+6)D；包围范围另含停车转向余量 |
| inspectDraft: thorough / box / bounds / top / x / z / projected | 是否深度检查、候选水平占地、世界边界、最高点 Y、角点 X/Z、投影后位置；防止高建筑出画 |
| inspectDraft: building / creature / point / space / controller / clearance / points / previous / swept | 既有建筑、居民及位置、保护区域、工坊和其车辆净空数据、需保留的点、上一途经点、当前路线保守矩形 |
| savedOccupied / savedBlocked / savedHeights / savedCartGrid / colliderCount / surfaceCount | 临时检查前的地形、导航、高度、车辆格缓存及网格列表长度；finally 无条件恢复 |
| corrected / slot / candidate / origin / reached / destinations / index | 修正后的新入口、当前入口及修正点、居民起点格、连通前驱表、所有待保持可达的位置及索引 |
| sites / serves / home / site / dx / dz | 加入候选食盆后的集合、配送可达判断、停车点、当前食盆、四个斜向卸货点的坐标偏移 D |
| commitDraft: material / overlay / point / site / mote / angle / path / effects | 提交实例材质、阳光范围平面、食盆位置和状态记录、食物展示网格及布局角、重算路线、充能效果控制器 |
| initialFoodSite / site.point / state / foodMeshes / slot.foodSite | 原食盆记录、盆中心、盆自己的库存、6 个食物展示网格、进食位所属盆引用；新盆库存 0 |
| sunAt / comfortAt: point / best / center | 查询位置、当前最强恢复或安心效果、遍历的阳光中心；重叠取最大而不叠加 |
| availableBowls: slot | 过滤实际库存至少 0.01 的进食位；替代对全局食盆变量的判断 |
| registerWorkshop: model / cart / slot / state / controller | 新工坊、附带推车、独立工作位、库存/生产状态、生成的物流控制器 |
| otherCartsClear: point / controller / clearance | 候选车位、其他控制器及其车位记录；忽略自身，其他车距需大于 4.3D |
| logistics: best / weights / creature / action / now / controller / total / sum / site | 多工坊权重最大值、候选权重、居民、任务名、模拟秒数、当前控制器、食物总量与累加器、食盆；委派时依次尝试可接任务的工坊 |
| setPaused: value | 写入暂停标志并清空累积步长、同步按钮文字与 aria-pressed；建造保存并恢复该状态 |
| construction.BUILDINGS / definition.key / name / note | 建筑目录、模型类型键、菜单名、简短提示；按钮从共同 template 生成 |
| createConstruction.api | 世界接口：camera/stage/canvas/pauseButton、暂停读写、生成/移动/检查/提交/撤销实例、事件公告 |
| panel / tools / status / confirm / cancel / catalog | 建造面板、操作区、反馈文字、确认/取消按钮、建筑目录容器 |
| pointer / ray / plane / hit | 归一化屏幕坐标、选点射线、Y=0 地面、交点 D |
| ghostMaterial / draft / selected / position / located / savedPause | 半透明预览材质、当前草稿、所选定义、选点、是否定位、进入建造前的暂停状态 |
| originals / buttons / mesh / material / button / key | 临时材质替换前的映射、目录按钮映射、当前网格及材质、当前按钮和类型键 |
| refresh.reason / select.alreadyBuilding / commit.built / name | 检查反馈、是否替换已有预览、待提交记录、公告建筑名；关闭/取消不会提交 |
| locate: event / bounds / arrows / dx / dz | 指针或按键事件、画布像素矩形、方向键偏移表、0.25D 微调量；选点后让画布获得键盘焦点 |
| toggle / owner / content / open | 通用 HUD 开关、所属面板、折叠内容、目标展开状态；aria 与 inert 同步，收起建造会取消草稿 |
| CSS --hud-inset / --hud-width / --panel-height | 悬浮边距 18px（窄屏 10px）、面板宽 310px（窄屏 235px）、内容最大高度 65dvh（窄屏 48dvh） |
| CSS --motion / --surface / --gap / --radius | 展开/按钮过渡 220ms（减少动态为 0）、乳白半透明表面、12px 间距、16px 面板圆角 |
| CSS --paper / --ink / --muted / --line / --accent | 继承原纸色、主字色、辅助字色、边线和绿色强调色；stage 不再有卡片边框 |
| build-rules.overlaps: a / b / gap | 两个水平矩形、额外间距 D；严格相交检查 |
| build-rules.inside: box / bounds / margin | 候选矩形、允许边界、内缩余量 D |
| floodGrid: blocked / width / height / origin / previous / queue / head / tail / index / column / neighbors / next | 数值障碍格、宽高、起点、前驱表、广度优先队列及读写端、当前格及列、邻格列表与候选；防止行边界绕回 |
| gridRoute: from / to / previous / route / cursor | 起终格、连通前驱表、路径序列和回溯游标；无路为 null，同格为空路线 |
| build-rules.test: assert / bounds / footprint / grid / width / height / row / route / previous / cell | 断言、场地与建筑测试矩形、测试格网及宽高、墙行号、绕路结果、前一步格与当前格 |
| build-rules.test: bowl / first / second / factory / value / anotherBowl | 共享盆、两工坊状态、当前工坊、写入盆的数值、另一个独立盆；验证卸货容量与转移守恒 |
| build.imports construction / build-rules | 新建造交互与空间纯规则的内嵌 data URL |

物流模块的增量：

| 变量或字段 | 含义 |
| --- | --- |
| home / destination / deliveryAngle / foodSite / value | 工坊世界坐标加停靠偏移、当前卸货点、朝向盆的弧度、当前目标盆、写入目标盆的库存值；state.bowl 改为目标盆的 getter/setter |
| routeTo.points / route.points / waypoint | 按车体转向包络求出的途经点、剩余路径、当前移动点；用尽后进入最终转向 |
| selectBowl: requireSpace / candidates / site / offset / target / a / b | 是否过滤满盆、先按库存再按距离排序候选、当前盆、四种卸货偏移、尝试目的地、排序两盆 |
| weights.lowest / minimum / site | 各食盆最低库存、累积最小值、当前盆；决定补货需求 |
| tryJob.returning / creature.cartOwner | 空车是否需返回、当前配送员所属车体 ID；避免多个控制器接管同一居民 |
| step.nextPosition / clear | 行进方向前方 0.12D 的位置、同伴/其他车/结构共同允许移动的条件 |
| clearance.cart / home / position / destination / route | 该控制器的车模型、停车点、当前位置、任务目标与剩余路径；建造检查保留这些空间 |
| api.foodSites / cartPath / otherCartsClear / naturalLight | 全部食盆、车辆路径求解、其他车间距检查、动态读取当地自然光系数；不再引用唯一 layouts.bowl 或全局 foodMeshes |

已删除独立 workshopSunDistance 与固定 naturalLight 常量。每座工坊通过回调读取所在位置的最强阳光效果；新建阳光中心无需重置生产。原 cartClear 现在同时用于车辆导航、运行中前方净空和建造校验，旧的固定直线配送走廊已替换。

## 双人玩法变化（2026-11-09）

| 作用域与变量 | 含义 |
| --- | --- |
| play-rules.PLAY_NAMES | imitate/dance/chase 对应轮流蹦跳、摇摆合拍、转圈追逐的展示名称 |
| choosePlayStyle: arousal / previous / roomToRun / draw | 双方平均活跃度 0～1、此配对上次玩法、可否跑动、0～1 随机抽样值 |
| weights / candidates / name / weight / total / sum / cursor | 玩法权重、排除上次和不可用玩法后的候选、候选名及权重、总权重、求和累计值、抽样游标；追逐权重随活跃度增加 |
| world.playHistory / creature.playStyle | 按配对索引键保存上次玩法的 Map、个体当前或最后一次玩法；重开清空历史 |
| roomForChase: center / first / second / dx / dz / point / other | 会合中心、两位参与者、以 0.06D 步长扫描半径 1.35D 圆盘的坐标偏移、检查点、其他居民；导航已有身体半径膨胀，其他居民需距中心超过 2.3D |
| beginSocial: firstPosition / secondPosition / center / pairKey / a / b / arousal / variant | 双方位置、位置中点、排序后配对索引键、排序项、平均活跃度与所选玩法 |
| session.variant / center / pairKey / angle | 共享玩法、追逐中心、历史索引键、第一位成员初始极角（从 +Z 向 +X，弧度） |
| updatePlaySession: session / member / angle / target | 当前会话、当前成员、前瞻 0.3 秒且双方错开半圈的追逐角度、半径 0.9D 的目标点；角速度 0.85 弧度/秒 |
| updateCreature.facesPartner | 聊天或原地游戏时面向同伴；追逐时由移动方向控制朝向 |
| updateUI.playActivity / activity | 根据玩法构造的展示文字、当前状态卡活动说明 |
| drawCreature.dance / chase / turnPhase | 是否摇摆或追逐、摇摆的 4 秒周期或轮流蹦跳的 3.2 秒周期内进度 |
| danceJumpPhase / danceJump / playHeight / playing / playSquash | 同步跳起的归一化阶段、正弦高度因子、各玩法高度 D、心情与动效缩放后的高度、身体纵向形变；追逐不叠加游戏跳跃 |
| swayAmplitude / swayPhase / playSway | 摇摆幅度弧度、双人镜像相位、混合后的身体侧倾；摇摆幅度 0.26，蹦跳 0.12，追逐 0.035 |
| build.imports['play-rules'] | 离线内嵌玩法选择模块 data URL |
| play-rules.test: assert / previous / room / arousal / index / style / countChases / count | 数值断言、上次玩法、净空条件、活跃度、抽样序号、选择结果、统计追逐次数函数与计数；不执行场景 |

追逐路径到达时保持 play 状态，由共享会话持续更新目标；结束或被需求打断时清空双方路线。空间不足时共享会话改为 dance 并更新双方动作和历史，但不延长原定结束时刻。同步舞蹈及追逐期间不新触发随机开心高跳。

## 主动休闲、即时相遇与开心动作（2026-11-09）

| 作用域与变量 | 含义 |
| --- | --- |
| companionshipRecovery: company | 有可接近同伴时额外降低疲劳 0.025/s，否则 0；与 play 状态无关 |
| evolveMood.context.fun | 独自玩拱门时为 true，增加愉悦/活跃，不提高亲近感 |
| actionWeights.play / sun / toy | 社交权重含不依赖孤独的基础值和开心分享；主动晒太阳与拱门玩耍的权重 |
| sunSpots / index / angle | 六个半径 3.2D 的阳光休息预约位、序号与环形角度 |
| toyEntry / toyExit / toySlot | 拱门中心线前后各 1.6D 的入口/出口、唯一玩具预约位 |
| creature.toyPasses | 剩余穿行段数，进入时为 2，到另一端后为 1，回到入口为 0 |
| creature.nextPursuit | 下一次更新同伴当前位置路线的模拟秒数，间隔 0.6 秒；到达临时路径末端可立即更新 |
| pursuitPath: creature / partner / start / other / distance / divisor / standOff / goal | 接近者、同伴、两者位置、距离及防零除长度、距同伴 0.9D 的路径终点退距、当前目标；进入 1.75D 时可返回空路线，等下一物理步直接启动互动 |
| inviteForPlay: creature / partner / firstRoute / secondRoute / member / route | 邀请者、愿意的候选、双方接近路线、写入行动的成员及路线；路径成立后再绑定双方 |
| beginSocial: first / second / kind / duration / session / creature / message | 两个成员、play/chat 类型、时长、共享会话、成员与公告；清空行走路径并停止速度 |
| playSession.kind / updatePlaySession.inReach | play 或 chat 会话类型、两者在 2.4D 内且之间可通行的持续互动条件 |
| updateCreature.company / chatting / resting / companyRecovery | 附近任意同伴且无遮挡、有效聊天、睡眠/发呆/晒太阳/聊天休息输入、陪伴疲劳恢复率 |
| updateCreature.canLeap / socialRun | 允许开心高跳的状态集合条件、接近同伴时 1.25 倍的移动速度系数 |
| creature.nextJoy / joyStart | 下次允许开心高跳的时刻、当前高跳起始时刻；初值负无穷表示没有跳跃 |
| drawCreature.joyTime / joyPhase / joyJump / joyCrouch / joyLanding | 跳跃已过秒数、升降阶段进度、最高 0.78D 的正弦高度、前 0.15 秒蓄力与末 0.2 秒落地压缩 |
| chatCanvas / chatInk / chatTexture / chatMaterial / x | 128×80 的代码绘制气泡画布、二维画笔、共享纹理、精灵材质、三个点的横坐标；不是外部生成图片 |
| creature.bubble / nextChat | 角色头上对话精灵、下一次可触发偶遇聊天的时刻 |
| collisionStart.first / second / available | 接触对中的两位居民、双方均空闲/体力允许/无玩伴/冷却结束的聊天条件；有 30% 概率开始 5 秒聊天 |
| drawCreature.chatting / speaking / chatNod / chatter | 有效聊天状态、每 0.9 秒轮流说话的角色、点头角度、嘴角说话起伏；bubble 仅在 speaking 时显示 |
| arrive.target | 玩具本次穿行的另一端；保持玩具预约直到往返结束并休息完 |
| mood-rules.test.content / soloToy / soloIdle | 不孤单状态与独自玩具/独处的对照向量 |

已删除固定 playSpots 集合点和 creature.invited 标志，邀请在决策时一次完成；接近期间 action=go-play 保持不变，近距判定负责转为 play。新增行动 go-sun/sun、go-toy/toy-cross/toy-rest、chat。模型导入默认对原网格开启投射/接收阴影，巨碑与阳光仍保留已有细分规则。

## 扩图与四居民（2026-11-09）

| 作用域与变量 | 含义 |
| --- | --- |
| WORLD_WIDTH / WORLD_DEPTH | 可活动场地宽 36D、深 24D，替代分散的 24×18 常量 |
| MIN_X / MIN_Z / MAX_X / MAX_Z | 从场地尺寸推导的边界 -18/-12/+18/+12 D；地面边框额外外伸 0.5D |
| NX / NZ | 从场地尺寸除 CELL 得到的 300×200 导航格数，CELL 仍为 0.12D |
| groundWidth / groundDepth | 37D×25D 地面展示及横向边界宽度 |
| resize: verticalPadding / horizontalPadding | 根据场地深度及建筑高度留余量的纵向跨度、宽度半值加 1.5D 的横向跨度，供固定镜头整图适配 |
| residents / resident | 四居民配置数组及当前项，含 name/color/x/z/energy/fatigue；名单文案和角色实例使用同一来源 |
| creature.playPartner / playRole | 唯一互相绑定的玩伴引用、当前配对中的先后角色 0/1（替代全局 index 作为动画节拍依据） |
| endPlayLink: creature / partner | 主动退出者及其原玩伴；仅清除对应关系、会话和对方的社交路线，不干扰另一对 |
| socialCandidates: creature / position / other / a / b / first / second | 邀请者、其位置、可邀请的其他居民、候选排序项及其坐标；排除已有玩伴、忙碌、低能量或高疲劳者，按距离排列 |
| updatePlaySession: first / second | 遍历各个互相绑定的配对，每对仅由较小 index 的成员处理，支持并行两对 |
| updateCreature: companion / company / other / nearby / companionPosition | 当前明确玩伴、附近任意其他居民存在的陪伴条件、邻居与位置、实际玩伴位置 |
| 避让 partner / other / separation / forward / yields | 遍历所有其他小球、位置、距离、前方投影与让行条件；较大编号向行走中的较小编号让行，所有行走者向停留者让行 |
| retreatAngle / retreat | 停滞后沿朝向侧面退让的角度与目标；只有成功加入侧移点才清空停滞计时 |
| 模板 residents | 居民说明段的 DOM id；正文由居民配置更新，无固定双人文案 |

本轮布局：monolith=(-12,-7)、sunlight=(-4,-6)、nest=(-12,5)、bowl=(-1,5.1)、arch=(10,7)、workshop=(8,-4.2)、cart=(10.42,1.8)。建筑尺寸、物流库存上限和阳光半径保持原值。

## 工坊与食物物流（2026-11-09）

| 作用域与变量 | 含义 |
| --- | --- |
| world: createFoodState / createFoodLogistics / foodState / logistics | 库存创建函数、物流控制器创建函数、唯一库存状态、物流控制器实例；初始化前为 null |
| layouts.workshop / cart / bowl / nest / sunlight / monolith / arch | 建筑世界 X/Z，当前值见本文件顶部“扩图与四居民” |
| navigationBlocked: index | 基础导航障碍加当前车身膨胀包络；供直线检查、自由点与路径搜索共享 |
| workAnchor / workSlot | 模型 Work_Pad 世界中心、唯一工坊预约位（kind=work） |
| makeMote: group / mesh / center | 食物展示容器、共享源模型的克隆、源包围盒中心；统一以球心定位，避免 Cargo 中心与模型底部原点混淆 |
| cartClear: point / radius / dx / dz / index | 推车中心、2.12D 车与推车者转向包络、采样偏移、结构占地索引；仅用于预留走廊静态净空检查 |
| workshopSunDistance / naturalLight | 工坊中心距阳光中心的 D 距离、0.6 环境自然光加阳光归一化增益的生长系数 |
| updateCreature: working | 正在工坊工作或拥有活动推车任务，使用移动消耗率；物流拥有者的位移由控制器处理 |
| drawCreature: pushedSpeed / workPulse | 用物理步位移计算推车者步态速度 D/s、工作时身体压垫起伏 |
| build.imports food-rules / food-logistics | 两个新模块的离线 data URL；files.workshop/cart/bowl 使用新包正式空 GLB |
| FOOD.bowlCapacity / cartCapacity / stockCapacity / batch | 食盆 6 份、推车 4 份、出货槽 8 份、每批收获 4 份 |
| FOOD.tendSeconds / growSeconds / harvestSeconds | 照料 5 秒、单位自然光下生长 18 秒、收获 4 秒 |
| foodState.bowl / stock / cargo | 食盆份数（进食时可为小数，初值 3）、出货槽整数库存、车上整数库存（含已扣库存的装车在途颗粒） |
| foodState.stage / work / growth | untended/growing/ripe 阶段、可接续劳动秒数、0～1 生长进度 |
| canWork / workFood: state / seconds / duration | 判断整批容纳能力、累计劳动的状态与步长、当前照料或收获所需秒数 |
| growFood: state / seconds / naturalLight / increment | 生长状态、步长、自然光系数、本步生长比例；未照料不能生长 |
| loadFood / unloadFood: state / space | 单颗装卸的唯一库存转移、食盆扣除已装货物后的完整份数余量；不超容量、不重复增加总量 |
| createFoodLogistics: api | 世界接入接口：scene/models/state/layouts/creatures/MATTER/engine/SCALE/STEP/workSlot，以及定位、导航、预约、完成任务、公告、创建食物、食盆网格和净空回调 |
| cart / node / anchor / model / name | 推车模型、按 GLTF 空格转下划线规则寻找节点、读取节点世界位置、所查模型与节点名 |
| home / destination / homeAngle / deliveryAngle | 工厂外与食盆外的车根节点停靠位置、各自最终朝向（弧度） |
| wheels / gate / pad / padHeight | 四个独立轮轴节点、Gate_Pivot、工作垫活动面及其原始 Y 值 |
| cargoNodes / cargoMeshes / cargo | Cargo_01～04 节点、其下独立食物容器、当前挂点 |
| cropPoints / crops / point | 四个培养区食物位置（工坊局部坐标）、生长展示网格、当前坐标组 |
| stockPoint / stockMeshes / mesh / index | 出货点世界位置（食物球心至少高 0.9D）、八个库存展示网格、当前网格、展示序号 |
| transfer / cartBody | 装卸在途食物网格、随车更新的 Matter 碰撞矩形（1.8×2.2D） |
| worker / mode / route / phase / wait | 唯一配送员、parked/waiting/docked/driving 模式、当前目标路线、转向/前进/末端转向阶段 0/1/2、因同伴阻挡累计等待秒数 |
| arrival / cooldown / gateOpen / rolling | 当前停靠类型 home/bowl/resume、暂缓接任务的截止秒数、门轴角度、车轮累积转角 |
| flight.kind / index / source / target / start / duration | load/unload、车内槽序号、世界起终点、开始时间、每颗 1.1 秒；卸货到达才提交入盆 |
| runningActions / ownerActive / pusher | 实际操作车的行动集合、是否正在操作、Pusher_Center 世界坐标读取函数 |
| pauseJob: previous / stillOnJob | 释放的配送员、是否仍处于配送行动（避免取消其已切换的补能任务）；货物与车位保留 |
| routeTo: target / angle / next | 目标位置、末端朝向、抵达 home 或 bowl 的类型 |
| attachWorker: position | 车后小球目标位置；设置物理位置、清除速度与残余施力，保持身体靠住推垫 |
| otherClear: position / creature / other | 车中心、其他角色及其位置；小于 2.65D 时暂停推进 |
| poseClear / distance / samples / index / point | 调用静态净空回调、两端距离、每 0.12D 的走廊采样数与当前点 |
| startTransfer: kind / time / source / target / index / foodIndex | 装卸类型、模拟时刻、食物起终点、车槽与盆中展示位置索引 |
| weights: creature / capable / need / willingness / production / needsDelivery / needsReturn / delivery | 工人、生理条件、缺粮比例、心情意愿、能否生产、需补货/还空车/可接配送条件；返回 work/delivery 权重 |
| tryJob: action / creature / time / target | 工作或配送候选、接手者、模拟时间、车后接手位置；工作位与车分别排他 |
| owns: creature | 是否由物流控制器推进该小球；世界仍更新能量、疲劳与心情 |
| blocks: point / dx / dz / cosine / sine / localX / localZ | 导航查询点、相对车位移、车朝向三角量、车局部平面坐标；膨胀宽半径 1.4D、长半径 1.57D |
| step: time / creature / position / near / message / valid / target | 固定模拟时间、工人位置与是否靠近工作位、完成公告、配送行动有效性、接手目标 |
| step: dx / dz / remaining / travelAngle / targetAngle / difference / clear / turn / speed / distance | 配送目标偏移与余程、行驶/当前目标角和角差、同伴避让条件、本步转角、满载 0.72D/s 或空载 1D/s、本步移动距离 |
| draw: time / wheel / index / growth / crop / working / progress | 模拟时间、轮子与展示序号、生长比例及网格、是否压垫、装卸插值；渲染不推进库存 |
| sync: open | 挡板目标角，卸货约 85°，其他状态为 0；按固定步平滑更新并同步车碰撞体 |
| summary: stages | 三种作物状态的中文名，与工坊/车/食盆库存一起用于状态说明 |
| food-rules.test: assert / state / total / initial / produced / index | 纯数值断言、库存状态、总量读取、初始总量、收获后总量、转移循环序号 |

新增行动：go-work/work、go-cart/cart、load/deliver/unload/return-cart。原 world 全局 food 已删除，所有实际库存读取统一使用 foodState.bowl；食盆自动增长逻辑已移除。

## 食物愉悦、阳光安心与双人游戏（2026-11-08）

| 作用域与变量 | 含义 |
| --- | --- |
| sunlightComfort: distance / radius | 到阳光中心的水平距离 D、内圈半径 r；返回 max(0,1-distance/(2r))，作为安心权重 |
| enjoyFood: mood / amount | 角色心情、实际消耗库存份数；每份额外增加 0.28 愉悦，上限 1 |
| evolveMood.context.sunComfort | 阳光安心权重 0～1，默认 0；安心目标增加该值的 0.45 倍 |
| updateCreature: sunComfort | 当前角色按 sunDistance 与 SUNLIGHT_FIELD.radius 得到的安心权重 |
| creature.playSession / playBlend / playElapsed | 共享双人游戏会话引用、动画连续混合权重 0～1、最近有效游戏的已进行秒数（退出时保留供动作淡出） |
| updatePlaySession: first / second / firstPosition / secondPosition / distance | 两个角色、物理位置、双方水平距离 D |
| updatePlaySession: together / duration / session | 双方在玩、距离小于 2.4D 且可直线通行的条件；共同游戏时长 7～11 秒；共享 start/end 模拟时间对象 |
| updateCreature: playTarget / faceX / faceZ / faceAngle / turnDifference | 有效双人动画目标权重、朝同伴且略偏镜头的水平向量、目标角、平滑转向角差 |
| drawCreature: playTime / turnPhase | 共享已进行时间、按个体错开 1.6 秒的 3.2 秒循环相位 |
| drawCreature: jumpPhase / jump / crouch / landing | 起跳段归一化进度、正弦跳跃权重、蓄力压缩权重、落地压缩权重 |
| drawCreature: playMotion / playSquash / playSway / happyEyes | 混合权重与减少动态效果相乘、跳跃伸缩量、左右摇摆弧度、玩耍笑眼缩放 |
| drawCreature: playing | 双人游戏带来的垂直位移 D，最大 0.32D 乘心情与动效系数；取代独自 play 状态下的周期小跳 |
| updateUI: playActivity / activity | 当前为会合等待或共同模仿的文案、最终显示的行动文字 |
| mood-rules.test: fed / emptyBowl / nearSun / farFromSun | 实际吃到食物与空盆对照、阳光中心近远距离的安心对照 |

## 四维心情新增变量（2026-11-08）

| 作用域与变量 | 含义 |
| --- | --- |
| createMood / evolveMood / actionWeights / chooseMoodAction / acceptsCompany / moodDescription | 初始化心情、按情境演化、生成行动权重、加权抽样、判断邀请意愿、生成中文心情描述的纯规则函数 |
| creature.mood.pleasure / arousal / safety / connection | 愉悦 -1～1；活跃、安心、亲近感各 0～1；替代旧 social 标量 |
| creature.stress / lastStartle / mouth | 撞建筑后的惊扰 0～1、最近惊扰时间（秒）、可调整嘴角的网格；旧 invited 标志已删除 |
| build.imports['mood-rules'] | 离线内嵌心情规则模块地址 |
| mood-rules: clamp / value / min / max | 规则值限幅函数、待限制值、上下界（默认 0～1） |
| createMood: energy / fatigue | 初始能量和疲劳，推导初始愉悦与活跃，不随机分配永久人格 |
| evolveMood: mood / context / seconds | 可变心情向量、当前环境和行为输入、模拟秒数 |
| context.energy / fatigue / resting / nourished | 当前生理需求、是否睡眠或发呆、是否实际进食或充能 |
| context.company / playing / exploring / stress | 2.4D 内是否有同伴、双方是否在一起玩、是否探索、衰减中的碰撞惊扰 |
| evolveMood: hunger / comfort / targets / times | 饥饿压力、是否获得休息或营养、各维情境目标、各维指数变化时间常数（秒） |
| evolveMood: key / blend / minimum | 当前维度、1-exp(-seconds/times[key]) 的更新比例、该维最低值 |
| actionWeights: mood / energy / fatigue / hunger / loneliness / unease | 向量、生理输入、能量缺口、亲近感缺口、安心感缺口 |
| weights.charge / eat / sleep / play / wander / idle | 六类行为倾向；零表示该候选不参与抽样 |
| chooseMoodAction: weights / draw / entries / total / cursor / action / weight / sum | 权重集合、0～1 随机输入、正且有限的候选、权重平方总和、抽样游标、候选行为与权重、累加器 |
| acceptsCompany: mood / energy / fatigue / draw / willingness | 被邀请者状态、随机输入、接受概率；急需补能、很累或很不安时拒绝 |
| moodDescription: mood | 当前向量，以有优先级的阈值输出可读心情；不反向修改数值 |
| decide: weights / action / attempt / options | 心情权重、抽中的行为、失败后重选次数、急需补能时的设施集合 |
| decide: position / radius / search / angle / distance / goal | 散步起点、按安心与活跃计算的探索半径 D、寻点次数、随机方向、距离 D、可达候选点 |
| updateCreature: companion / companionPosition / company / playingTogether | 同伴对象及位置、是否在 2.4D 内、双方是否实际一起玩 |
| updateCreature: resting / nourished / moodContext / fatigueRate | 心情输入状态、输入对象、疲劳变化率；发呆 -0.004/s，其余延续消耗 |
| updateCreature: exhausted / willing / moodSpeed / baseSpeed | 是否过度疲劳需中断休闲、是否愿意接受邀请、心情速度倍率、每只小球的实际基准速度 D/s |
| collisionStart: moving | 碰撞时 Matter 速度是否超过 0.45；与 3 秒冷却共同限制惊扰事件 |
| drawCreature: rhythm / playfulness / alertness | 由活跃推导的步态频率、活跃及愉悦推导的玩耍振幅、睁眼比例；嘴角使用 pleasure 连续形变 |
| 模板 .mood | 角色卡中的心情描述节点，随现有状态卡刷新周期更新 |
| mood-rules.test: assert / calm / lonely / uneasy / context / alone / together | 断言库、三种对照向量、情境输入、独处与共同玩耍对照 |
| mood-rules.test: oneStep / manySteps / step / key / frozen | 时间步长对照向量、迭代序号、维度键、暂停不变性对照 |
| mood-rules.test: stress / energy / fatigue / mood / value | 极端输入组合与输出边界检查 |

行动持续时间：发呆 2～6 秒；散步目标最长追踪 8～20 秒；直接向同伴接近最多 40 秒，会合后共同玩 7～11 秒；聊天 5 秒；晒太阳 12～20 秒；拱门往返后休息 3 秒；充满后依恋停留 0.8～3.2 秒。已有 until 字段存储实际结束时间，具体游戏时长由双方心情计算。开始行动后不会每帧重抽候选。

## 接触充能新增变量（2026-11-08）

| 作用域与变量 | 含义 |
| --- | --- |
| createChargingEffects / chargingEffects | 导能槽与吸收粒子控制器的工厂函数及实例，分别在物理步与绘制阶段更新 |
| build.imports['charging-effects'] | 内嵌充能效果模块的 data URL |
| outletNormals / side / normal / standing | 四个局部面法线、当前方位、转换后的世界面法线、出口向外 0.78D 的导航站位；替代原先从建筑中心径向偏移 |
| slot.side / normal / port / occupant | 供能口方位、世界法线、实际出口网格中心、已到达的充能小球；释放预约时清空 occupant |
| 模型处理 materials / material | 巨碑网格的材质数组与遍历材质；标记稳定发光 |
| material.userData.steadyEmission / chargeControlled | 巨碑材质不参与周期脉动；导能槽/出口由充能控制器接管强度 |
| creature.bodyMesh | 小球身体网格，用于按自身肤色设置自发光；材质每只独立 |
| creature.chargePose / chargeGlow | 0～1 贴靠形变权重与充能自发光权重；在固定物理步连续趋近目标 |
| creature.chargeStarted / chargingReady | 到达充能口时间（秒）、靠近站位且等待超过 0.9 秒后实际供能的布尔值 |
| action='charge-rest' | 达到 0.93 能量后按心情再靠 0.8～3.2 秒的行为，期间不接收巨碑主动恢复，仍保留预约 |
| updateCreature: atPort / closeToPort / restingAtPort / leaning | 是否停在供能设施、离导航站位是否小于 0.28D、是否已充满停留、是否显示贴靠 |
| updateCreature: slot / poseTarget / glowTarget / glowSpeed | 被挤离时重新接近的设施、姿势与光强目标、发光趋近系数（开启 2.5/s、衰减 0.6/s） |
| creature.chargeNormal | 最近一次贴靠口的世界外法线；离开后保留以连续淡出贴靠位移 |
| updateCreature: view / tangent / faceDirection / targetTurn / difference | 固定镜头的水平朝向、选择朝镜头侧的沿面切线、两者加权得到的三分之四面朝向、目标角和最短转向差 |
| drawCreature: depth / emission / lean | 身体前后厚度缩放（等于 wide）、自身颜色的发光强度、向接口偏移 0.16D 后转换到 heading 局部坐标的位移；脸上抬 0.18 弧度 |
| charging-effects: THREE / FLOW / COLD | Three 模块、粒子参数集合、冷白淡青初始颜色 |
| FLOW.interval / travel / absorb | 发射间隔 0.22 秒、沿槽运动 1.65 秒、汇聚吸收 1.4 秒 |
| FLOW.count / radius | 每口固定 16 颗粒子的池容量、每颗半径 0.05D |
| createChargingEffects: scene / model / outlets / reduced / camera | 场景、已更新世界矩阵的 v08 巨碑、供能口列表、减少动态效果媒体查询、固定正交相机 |
| charging-effects: view / right | 朝镜头的三维单位向量、镜头画面右侧单位向量；用于将吸收段布置到身体可见面 |
| geometry / channels / target | 共用球形光粒几何、四个独立通道状态、用于读取小球世界中心的复用向量 |
| 通道创建 slot / normal / tangent / center | 供能设施、外法线、沿面向右的切线、巨碑地面中心世界位置 |
| route / points / across / outward / height / point | v08 槽中心折线三元组、转换后的世界路线、沿面偏移/离中心距离/高度（D）、当前世界点 |
| curve / segment / index | 由直线段构成的导能路径、当前线段、点或粒子序号 |
| materials / name / object / child / list / material | 当前口的槽与出口材质集合、模型节点名、对应节点、遍历子节点、材质数组、当前材质 |
| particles / mesh / born / owner | 固定粒子池、光粒网格、发射时刻（未发射为负无穷）、对应吸收小球 |
| channel.next / strength | 下次发射时刻、0～1 槽发光强度权重；没有使用时保持低亮 |
| step: time / step / channel / owner / active / strengthTarget / particle / item | 模拟时间、固定步长、当前通道、占用小球、是否实际供能、灯光目标、选中复用粒子、池搜索元素 |
| draw: time / channel / material / base / particle / age / alive / owner | 模拟时间、通道、发光材质、源发光强度、粒子、出生后秒数、是否还在生命周期、吸收者 |
| draw: progress / outlet / warmBlend | 沿槽或吸收段进度、出口世界位置、吸收段后 35% 从冷光转为肤色的权重 |
| draw: sourceSide / sideSign / spread / shoulderOffset | 出口相对小球的画面左右投影、选择绕行侧的正负号、粒子横向分散量、轮廓外肩侧偏移（约 0.75～0.95D） |
| draw: departure / shoulder / surface / surfaceDistance | 三次贝塞尔出射控制点、镜头可见肩侧控制点、朝镜头身体表面的终点、表面点离球心距离（最后阶段由 0.54D 渐入至 0.41D） |
| draw: remaining / fade | 1 减吸收进度的贝塞尔权重、最后 30% 的缩小淡出权重；取代从出口立即线性淡出 |

原发光动画的 pulse 仍用于阳光中心等非巨碑材质；巨碑固定取 1，供能槽及出口跳过该循环，由充能控制器接管。

本表记录项目自有代码，第三方 vendor 源码的内部变量由各库维护。D 是模型场景单位，时间除明确标为毫秒外均为模拟秒。行为参数是本版初值，未作为长期平衡结果。

## 页面和打包

| 作用域与变量 | 含义 |
| --- | --- |
| CSS --paper / --ink / --muted / --line / --accent | 页面、主要文本、次级文本、边界与焦点颜色 |
| CSS --gap / --radius | 布局间距 12px、场景圆角 16px |
| 模板错误处理 box | 显示加载或运行故障的遮罩节点 |
| build: fs / path / fileURLToPath | Node 文件系统、路径及模块 URL 转路径能力 |
| folder / read / name | 打包脚本所在目录、读取文本函数、相对文件名参数 |
| moduleURL / source | 生成 data URL 的函数、待编码模块文本 |
| imports / files / models | 模块名到内嵌 URL、模型键到文件名、模型键到 base64 数据 |
| key / name | 资源遍历中的模型键及文件名 |
| escapeScript / libraries / licenses | script 结束标记转义、经典库内嵌片段、许可证集合 |
| html / output | 替换后的完整 HTML、最终文件路径 |

## 场景主变量

| 变量 | 含义 |
| --- | --- |
| THREE / GLTFLoader / MATTER | Three 模块、GLB 解析器类、Matter 全局库引用 |
| SCALE / STEP / CELL | Matter 每 D 为 100 单位、1/60 秒步长、0.12D 栅格边长 |
| MIN_X / MIN_Z / NX / NZ | 栅格原点 (-18,-12) 与 300×200 尺寸 |
| RADIUS | 小球地面碰撞半径 0.46D |
| stage / loading / eventText | 画布容器、加载遮罩、行为事件提示 |
| pauseButton / restartButton / reduced | 暂停按钮、重开按钮、减少动效媒体查询 |
| renderer / scene / camera / sunlight / ramp / ground | 渲染器、场景、正交镜头、方向光、明暗分级贴图、地面 |
| engine | 无重力的二维 Matter 世界 |
| occupied / blocked / heights | 原始结构占地、膨胀后的导航障碍、地面及睡垫顶面高度 |
| layouts / layout | 建筑的世界摆放坐标表、当前建筑布局 |
| models / modelData / loader | 已解析模型、内嵌模型数据表、GLTFLoader 实例 |
| colliderMeshes / surfaceMeshes / emitters | 阻挡通行的网格、可站立表面网格、发光材质集合 |
| outlineMaterial | 外扩反面网格的深色材质 |
| time / accumulator / paused | 模拟时间、未推进时间、暂停状态 |
| foodState.bowl / uiTimer / noticeUntil | 食盆实际库存 0～6、界面更新计时、事件文案保留截止时间 |
| creatures / reservations / foodMeshes | 四个角色、位置预约 Map、六个可显隐的食物网格 |
| sphereGeometry / eyeGeometry / eyeMaterial | 共用身体与五官几何、眼睛材质 |
| labels | 行为状态到中文说明的映射 |

## 模型与栅格函数

| 作用域与变量 | 含义 |
| --- | --- |
| gridIndex: x / z / ix / iz | 世界坐标及对应整数格坐标，越界返回 -1 |
| pointAt: index | 栅格索引，转换为格中心世界位置 |
| ancestorName: object / names | 当前节点、向父级累积的节点名称，用于分类 |
| addOutline: mesh / outline | 原网格、共享几何的外扩反面子网格 |
| toonMaterial: material / luminous / converted | 原始材质、有无发光、保留颜色贴图后的卡通材质 |
| converted.userData.baseEmission | GLB 原材质发光强度，动画按比例调节而非统一覆盖 |
| outlineMonolith: mesh / bounds / size / center / silhouette | 壳体、局部包围盒、尺寸、中心和不带凹槽的外轮廓网格 |
| 模型遍历 structural | 是否为巨碑外壳或框架，决定真实投影和接收阴影 |
| 发光动画 material / pulse | 当前发光材质及 0.8～1.0 倍的强度变化系数 |
| 模型遍历 key / base64 / bytes / character / gltf / meshes / mesh / name | 模型键、编码、解码字节、单字符、解析结果、网格列表、当前网格、祖先名称 |
| rasterTriangle: a / b / c / area | 三个世界顶点、投影有向面积 |
| left / right / near / far | 三角形或表面的栅格边界 |
| ix / iz / x / z / u / v | 栅格坐标、格中心世界坐标、三角形内测试的重心权重 |
| 三角形遍历 positions / indices / count / vertices / offset / corner / index | 顶点属性、索引、索引数量、三个复用向量、三角形起始索引、角点序号、实际顶点编号 |
| activeRuns / rectangles / nextRuns | 前一行持续条带、完成的矩形、当前行条带 |
| row / column / first / key / rect | 栅格行列、条带起列、条带匹配键、合并矩形 |
| rect.end / row / rows | 矩形终列、起行、高度格数 |
| width / depth / x / z | 合并碰撞矩形的 D 尺寸和中心 |
| padding / dx / dz / index | 障碍膨胀搜索范围、邻域偏移、原始障碍索引 |
| wall | 四个世界边界的中心及宽深元组 |
| downRay / bounds / point / hits | 向下采样射线、网格包围盒、格中心、交点列表 |
| floorHeight / freePoint: x / z / point / index | 采样位置、点对象、栅格索引 |
| nearestFree: point / radius / angle / candidate | 原始点、搜索距离、采样角、候选可通行点 |
| clearLine: a / b / distance / steps / step / weight / index | 线段端点、长度、采样数、当前采样、插值权重、格索引 |

## 寻路与设施

| 变量 | 含义 |
| --- | --- |
| findPath: start / end / origin / finish | 起终位置及最近可通行位置 |
| from / to / previous / queue / head / tail | 起终格编号、搜索前驱表、搜索队列及读写位置 |
| index / column / next | 当前格、列、相邻格编号 |
| route / cursor / smooth / anchor / position / furthest | 回溯路径、回溯游标、简化路径、直线检测起点、路径序号、最远可直接到达点 |
| meshCenter: key / name / found / object | 模型键、目标节点名、找到的节点、遍历节点 |
| beds / bowls / outlets / slots / playSpots | 两个睡垫、两个进食点、四个供能点、总交互点、玩耍候选地 |
| slot.id / kind / point | 预约键、设施用途、交互世界坐标 |
| center / dx / dz / length / side | 实际网格中心、离巨碑中心偏移、偏移长度、供能口方位 |
| original / candidate | 原始交互坐标、通过净空校正的坐标 |
| 食物遍历 index / mote / angle | 颗粒序号、模型克隆、食盆内布局角 |

## 角色创建和状态

| 变量或字段 | 含义 |
| --- | --- |
| makeCreature: name / color / x / z / energy / fatigue / index | 名称、肤色、初始位置、初始能量与疲劳、个体序号 |
| root / heading / pose | 位置组、朝向组、身体形变组 |
| mesh / outline / eyes / eye / side / blush / cheek / mouth | 身体、轮廓、眼睛组、当前眼睛、左右标志、腮红材质与网格、微笑网格 |
| shadow / body / card | 地面阴影、物理圆形、对应状态卡 |
| previous / lastPoint | 上一物理步位置、进展检测的上次位置 |
| energy / fatigue | 0～1 能量和疲劳；旧 social 已由 mood.connection 替代 |
| action / slot / path / goal | 行为、预约位置、剩余路线、最终目标 |
| until / decision / stuck | 行为等待截止、下次允许决策时间、停滞秒数 |
| turn / sleep / lift / impact / phase | 朝向弧度、睡眠混合权重、平台高度偏移、接触压缩、个体动画相位 |
| nextBlink / blinkUntil / speed | 下一次眨眼与结束时间、基准移动速度 D/s |

## 行为和动画函数

| 作用域与变量 | 含义 |
| --- | --- |
| positionOf / release / arrive / finish: creature | 当前角色；各函数读取位置、释放预约、到达切换、结束行动 |
| announce: message | 短暂显示的行为事件 |
| chooseGoal: creature / goal / action / slot / path | 角色、目的地、行走状态、可选预约点、搜索出的路径 |
| chooseSlot: options / position / available / a / b / slot | 候选设施、角色位置、可预约设施、距离排序项、尝试设施 |
| decide: options / partner / partnerAvailable / spot / attempt / goal | 补能候选、同伴、同伴空闲性、玩耍点、尝试计数、散步目标 |
| updateCreature: position / travelling / consumed / urgent | 位置、是否移动、吃掉的库存量、是否紧急缺能 |
| partner / available / goal | 同伴、能否接受邀请、相聚错位目的地 |
| desiredX / desiredZ / waypoint / dx / dz / distance | 期望世界速度、路径点、到路径点的偏移与距离 |
| final / speed / other / separation / forward | 是否最终节点、移动速度、同伴位置、距离、是否挡在前方的点积 |
| targetTurn / difference / gain | 目标朝向、最短转向差、质量相关施力系数 |
| progress / route / retreat / sleeping | 位移进展、重新计算的路线、避让退步点、睡眠目标权重 |
| collisionStart: event / pair | 碰撞事件与接触刚体对 |
| physicsStep: position / target | 更新后的世界位置、平台目标高度 |
| drawCreature: alpha / position / x / z | 插值权重、当前物理位置、显示坐标 |
| speed / motion / phase / gait / breath / playing | 运动权重、减少动效系数、步态相位、步态值、呼吸量、玩耍轻跳 |
| height / wide / hop / blink / openness | 身体纵横缩放、跳跃高度、是否眨眼、睁眼程度 |
| resize: width / height / aspect / vertical | 容器像素尺寸、宽高比、正交镜头纵向半跨度 |
| webglcontextlost: event | 上下文丢失事件，暂停模拟并显示故障提示 |
| p5: sketch / alpha / index | p5 实例、物理位置插值权重、颗粒或发光材质序号 |

## 阳光中心与能量规则

| 变量或字段 | 含义 |
| --- | --- |
| ENERGY_RATES.restDrain / moveDrain / monolithRestore | 每秒归一化能量：静止消耗 0.003、移动消耗 0.006、巨碑主动补给 0.085 |
| SUNLIGHT_FIELD.radius / outerMultiplier | 内圈 4D、外圈为内圈 3 倍 |
| SUNLIGHT_FIELD.maxFraction / minFraction | 峰值取巨碑恢复的 0.2；最低值取静止消耗的 0.2 |
| SUNLIGHT_MIN_RATE / SUNLIGHT_MAX_RATE / SUNLIGHT_OUTER_RADIUS | 推导出的最低 0.0006/s、最高 0.017/s、外半径 12D |
| sunlightRecovery: distance / closeness / rateRange | 水平距离 D、内圈线性靠近权重、最高最低速率差 |
| layouts.sunlight | 阳光中心世界坐标 (-4,-6)，仍保持原始模型尺度 |
| sunRangeButton / sunFieldMaterial / sunFieldOverlay | 范围按钮、透明范围着色材质、裁剪到场地的可选显示平面 |
| shader center / innerRadius / outerRadius | 能量中心水平坐标、内圈与外圈半径 |
| shader worldXZ / world / distanceToSun / weight / innerLine / outerLine / alpha | 世界地面坐标、变换后位置、水平距离、内圈色彩权重、内外边界线权重、最终透明度 |
| 模型处理 shell | 阳光中心的底座、瓣片或核心支座；决定是否投影与接收阴影 |
| creature.sunRate | 该小球此刻从阳光获得的额外恢复速率，能量/秒 |
| updateCreature: consumptionRate / sunDistance / passiveChange | 按行动选择的消耗速率、距阳光中心距离、本步阳光减消耗的净变化 |
| updateUI: sunPercent / sunMessage | 将阳光速率乘 100 后的每秒百分点文本、补给说明 |
| build.imports['energy-rules'] | 内嵌数值模块 data URL，不需要运行时网络 |
| energy-rules.test: assert / close / actual / expected / distance | Node 断言模块、近似相等比较函数、实值、期望值、单调性检查距离 |


## 三期生活与冬季扩展（2026-11-09）

餐厅、个人物品、制作者、通用载具、新增舒适度和显示字段见 [UCUG1505-PROVISIONS-VARIABLES.md](UCUG1505-PROVISIONS-VARIABLES.md)。季节、夜间危险、昏迷、死亡、医疗任务、床位和载具接口见 [UCUG1505-WINTER-VARIABLES.md](UCUG1505-WINTER-VARIABLES.md)。旧的厨房一次制作多份和统一 +0.28 能量逻辑已退出实际任务路径，由新配方模块管理。


## 生存与救援修复

最新先天优先级、医疗备用库存、完整路线预算、统一导航终点及卡住检测见 [UCUG1505-SURVIVAL-VARIABLES.md](UCUG1505-SURVIVAL-VARIABLES.md)。本轮覆盖此前“只招募闲逛、能量超过 55%”及“基本设施需要学习”的限制；原伤害和医疗效果不变。
