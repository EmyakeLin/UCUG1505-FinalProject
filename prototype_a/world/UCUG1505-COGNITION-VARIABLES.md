# UCUG1505 个体认知与社会变量

本文件记录 2026-11-09 认知/社会扩展新增的状态、参数、局部值和适配接口。世界坐标以小球直径 D 为单位；时间均为模拟秒，暂停不推进。原有变量见 `UCUG1505-WORLD-VARIABLES.md`。

## cognition.mjs

| 作用域与变量 | 含义 |
| --- | --- |
| BRAIN.version / inputs / hidden / outputs | 存档版本 1、24 个输入、20 个隐藏单元、5 个预测输出 |
| BRAIN.episodes / rate | 单个居民最多保留 160 段经历、反向传播基础学习率 0.028 |
| clamp: value / low / high | 有限区间裁剪的值及下上界，默认 -1～1 |
| random: seed / state / draw | 可重复初始化种子、线性同余状态、产生 0～1 值的函数 |
| brain.w1 / w2 | 含偏置的输入→隐藏 500 个权重、隐藏→输出 105 个权重，裁剪在 -4～4 |
| brain.known / relations / episodes | 个体认识的实例、对同伴的信任/亲近、有限经历集合 |
| brain.updates / frozen / practice / beliefs | 实际参数更新次数、冻结权重开关、各设施亲手练习次数、实验统计 |
| brain.lastThought / lastReplay | 当前生活想法、上次睡眠回放时刻 |
| identity: id / hash / character | 实例 ID、字符串散列值、当前字符；输出两维身份编码，不编码建筑用途 |
| inputVector: body / visible / action / id / actions / vector / name / value | 自身状态、八维近似视觉、基本行动类别、实例标识、六类行动名称、完整 24 维输入、比较名称与规范化数值 |
| body.energy / fatigue / mood / company / familiarity | 自身能量、疲劳、四维心情、是否近距有同伴、最多八次体验归一化的熟悉度 |
| forward: brain / input / hidden / output / row / column / offset / sum | 网络、输入、tanh 隐层与输出、神经元和输入序号、扁平权重行偏移、加权和 |
| train: target / weight / mask / loss / delta / error / hiddenDelta / rate | 五维实际结果、经历可信权重、允许监督的维度、平方误差、输出梯度项、预测误差、隐藏梯度、实际学习率 |
| discover: point / time / source / memory | 已观察到的位置、观察时刻、seen/invited/told 来源、实例记忆 |
| memory.visible / point / visits / observations / error / lastSeen / source | 近似视觉、记住的位置、亲身次数、间接次数、平滑误差、上次看到的时刻、首次来源 |
| uncertainty: memory | 通过访问/观察数量和既往误差估计不确定性；不把预测输出等同于置信度 |
| remember: episode / indirect / mask / trust / weight / error / stored / report / disagreement / relation | 新经历、是否间接、监督维度、对讲述者信任、训练权重、平均误差、深复制记录、先前转述、后续亲证分歧、更新的关系 |
| episode.place / input / target / source / time / action / teacher | 实例 ID、决策时输入、结果向量、自身/观察/转述、时间、行动类型、讲述/被观察者索引字符串 |
| episode.mask / weight / salience | 训练维度、可信权重、按惊讶和愉悦变化计算的回放抽样权重 |
| relation.trust / affinity | 同伴转述可靠性与交往亲近程度，0～1 |
| replay: draw / total / cursor / chosen | 抽样器、经历显著性总和、抽样游标、选中经历；保持原监督掩码 |
| learnedValue: outcome / needs / sum / value / index | 预测变化、基于当前身体/心情的需求权重、加权累积值、当前预测与序号 |
| snapshotBody.creature | 读取能量、负疲劳、愉悦、安心、亲近的角色；负疲劳使改善为正 |
| outcomeBetween: before / after / seconds / scale | 体验前后状态、经过时间、按 4～30 秒区间归一到 10 秒的结果缩放 |
| exportBrain / importBrain: data / brain / item | JSON 可序列化状态、恢复网络、待校验经历；检查版本/长度/有限值，恢复时取消冻结 |

## society-rules.mjs

| 作用域与变量 | 含义 |
| --- | --- |
| planFor: goal / facts | meal/repair/research 目标、个体已知前提；输出有限动作顺序 |
| facts.carryFood / carryPart / foodKnown / kitchenKnown | 已携带食物/零件、记得有食物的盆、熟悉厨房 |
| facts.processingKnown / partsKnown / repairKnown / researchKnown / cartKnown | 熟悉加工站、记得有现成零件、熟悉修理/研究设施、曾观察到推车磨损 |
| proposal: personal / scores / a / b | 自己的能量、疲劳、劳动、已知缺粮/误差；四类议题分数及排序项 |
| resolveCouncil: votes / counts / vote / ranked | 实际到场居民意见、计票、当前意见、排序结果；严格超过半数才通过 |
| updateBelief: belief / value / current / count / delta / mean | 旧统计、实际测量、默认统计、样本数、与旧均值偏差、新均值；m2 为 Welford 方差累积量 |
| welcomeReady: population / beds / food / elapsed | 当前人口<8、睡垫多于人口、盆中食物≥4、建成≥120 秒 |
| fetchIngredients: bowl / carry / amount | 源盆库存、个人随身资源、最多拿两份整数食物；实际扣盆 |
| cookMeal: kitchen / carry / amount | 厨房餐食库存、携带原料、可转入最多六份容量的数量 |
| processParts / collectPart: station / carry | 加工站原料/零件库存、个人随身物品；一份原料产两份零件，领取时转移一份 |

## society.js

| 作用域与变量 | 含义 |
| --- | --- |
| durations / thoughts / defaults | 各社会活动时长、当前意图文案、首次试用设施的基本行为；不是网络标签输入 |
| actionClass.mode | 将具体动作映射到 try/rest/eat/social/work/observe 六类感觉运动动作 |
| api | 世界适配：居民、定位/寻路、预约、行动生命周期、时间步、推车/床位/食品、生成居民、样本测量、减少动态效果系数 |
| facilities / lastSense / lastCommunity / community | 本地建筑记录表、感知轮询时刻、劳动统计时刻、当前共同安排 |
| community.policy / until / round / lastDecision | food/rotation/learning/energy 或无安排、生效截止、议事次数、最近结论 |
| attach.creature / creature.brain / carry / plan / socialJob / experience | 当前居民、独立脑、随身食物和零件、计划、社会动作、进行中的体验 |
| creature.labour / nextSociety / nextShare / tour / speakingUntil | 累计劳动秒数、下次休闲候选时间、下次交流时刻、引导/跟随状态、发言气泡截止 |
| register: record / visible / slot / moving / mesh | 建筑实例、八维视觉特征、归属交互位、需动画的分件、遍历网格 |
| record.state.raw / parts / meals / arrivals / born / lastMeeting / experiments | 初始12份原料、成品零件、已做餐食、该站迁入人数、建造时刻、上次议事时刻、实验次数；不相关设施不使用这些字段 |
| record.visible / anchors / moving / model.userData.facilityId | 感知特征、独立交互点、机械/食物显示分件及原位置/角度、模型的实例标识 |
| known / perceive / sense: creature / record / position / point / memory / cart | 感知者、建筑、居民与建筑位置、个人记忆、可见推车；只在近距通路可见时更新现场库存/磨损 |
| memory.food / meals / parts / raw / cartWear / cartPoint / purpose | 上次实际看到的盆/厨房/零件/原料、推车磨损与位置、真实使用后理解的用途；这些不是神经网络的用途输入 |
| input: mode / company / body | 动作、近距同伴存在、自身状态特征；输出认知模块的输入向量 |
| begin: witnesses / episode.record / mode / before / start / used | 体验开始时可见见证者索引、体验对象、动作、身体快照、开始时间、是否真正到达并尝试 |
| endExperience: seconds / target / other / visibleTarget | 体验长度、实际状态变化、见证者、量化表情变化；观察必须开始和结束均可见 |
| cancel: partner | 中断导览时的另一方；解除互相引用、车维修锁与社会动作，个人携带物不丢失 |
| allows.urgent / value.slot | 是否允许紧急使用眼前设施、行为候选交互位；已知设施用网络预测改变排序 |
| visit: available / eligible / point / a / b | 未占用交互位、满足厨房岗位的位、所选点及距离排序项；厨房第0点烹饪，其余取餐 |
| familiar.key / factsFor | 从个人完成过的经历筛选某类型设施；生成规划前提 |
| followPlan: plan / mode / choices / record | 尚未过期计划、下一步、个人记忆允许的设施候选、尝试的设施；到达后再检查实际资源 |
| makePlan: facts / draw / goal / steps | 已知条件、选择抽样、目标与动作序列；优先使用已带资源和已知成品 |
| plan.goal / steps / expires | 做饭/维修/研究目标、尚未完成步骤、最长150秒的截止时刻 |
| tryDecide: candidates / memory / fresh / mode / motivation / sharingPriority / score / cursor / selected | 候选、个人记忆、未亲用标志、尝试动作、身体倾向、共同安排修正、网络/新奇/距离综合权重、抽样游标、被选设施 |
| arrive: practised / experience / pace | 是否生产型操作、当地亲手练习次数、时长倍率（最短为原75%）；到达才标记体验已发生 |
| finishJob: success / mode | 是否完成资源事务、完成动作；成功推进计划，失败放下计划 |
| invite: peer / other / a / b | 邀请对象、空闲候选和排序项；有距离、身体状态及接受概率限制，不拉走花园里的独处者 |
| share: teacher / learner / choices / episode / record / target | 讲述者、听者、讲述者真实完成过的经历、选中的经历/地点、仅可公开的情绪目标 |
| peersAt.record | 过滤真正到场且正在该设施活动的居民，不把路上的人算作参加者 |
| council: peers / longest / speaker / votes / memories / shortage / average / energyMemories / energyError / decision / names | 参与者、最晚到场者已停留时间、轮值发言者、个人意见、记忆集合、记得缺粮、预测误差、能源相关记忆/误差、多数结论、安排文案 |
| startTour: host / visitor / places / target / first / second | 引导者、新伙伴、引导者熟悉的食盆和睡窝、首目标、双方导览状态 |
| tour.partner / leader / places / index / next / expires / held | 对方、是否领路、介绍的地点、当前地点序号、追随更新时刻、最长50秒、等待跟上时暂存的路径 |
| tourStep: position / other / gap / place / path / divisor / target | 双方位置、距离、当前介绍处、后续路线、防零除距离、距领路者约1.1D的追随点；超过3D领路者等待 |
| stepCreature: job / record / elapsed / peers / partner / target / position / angle / difference | 当前任务、地点、时长、现场同伴、朝向对象/位置、朝向与角差 |
| job.record / mode / start / progress / invited / company / cart | 工作对象、操作、实际到达时间、预留进展字段、是否已邀请、是否有人共处、被维修的车控制器 |
| ready / point / visitor | 迁入条件、可用生成点、带独立认知的新居民；每站一次、总人数最多8 |
| state / amount / cart / separation / measurement / previous | 实际库存、转移数量、选中的维修控制器、实验距离1～4D、真实规则测量、实验前个人均值 |
| modulate: action / weight / kind / choices / learned / minimum / willingness / peers / preference / id | 原行为权重、目标类型、个人已知设施、预测效用、最少劳动量、轮班修正、认识的伙伴、社交预测修正和身份 |
| draw: now / motion / record / workers / active / item / name | 模拟时间、动效系数、设施、现场活动者、实际工作标志、分件和名称；无工作时复位分件 |
| summary: knowledge / experiences | 认识的实例/伙伴数量与保留的经历数量；展示当前想法，不展示内部权重 |
| save / restore: data / brains / resident / brain / creature / item / record / key | 纯社会存档、先校验的网络集合、居民记录与恢复对象、设施状态条目、字段名 |
| social: creature / partner / kind / record / relation | 双人游戏/聊天双方、类型、同伴感知记录、该居民自己的关系；同伴经历也用于预测 |

## 世界、物流、资产和 HUD 增量

| 作用域与变量 | 含义 |
| --- | --- |
| world.society / SOCIAL_ASSETS / createSociety / importBrain | 社会控制器、九项静态适配表、创建函数、恢复前网络校验函数 |
| SAVE_KEY / savedWorld / data | localStorage 键、通过外层版本/地图尺寸检查的保存、解析/输出的 JSON |
| visibleFeatures: record / box / size / red / green / blue / light / count / mesh / material | 建筑及尺寸、颜色/发光累加与数量、遍历网格材质；输出八维可见近似特征 |
| modelParts.social / buildingAnchors.index / offset / slot.socialIndex | 新设施的结构筛选定义、交互点序号及局部X/Z、实例内岗位序号 |
| initialAnchors / definition / model / record | 初始建筑各自交互位集合、目录定义、模型与记录；复制数组，避免后续实例混入初始建筑 |
| creature.color / carriedFood / carriedPart / mote / side | 持久肤色、侧边两份食物显示、侧边零件、食物克隆和左右标志 |
| socialCandidates.preferenceA / preferenceB | 个体对候选同伴的亲近，影响同样可见候选之间的距离排序 |
| updateCreature.learnedEfficiency / mealInProgress / socialWorking | 已完成研究带来的最多8%基础消耗节约、去厨房或正在用餐的保护条件、社会劳动动作判定 |
| updateUI.socialActivity / activity / society-status | 当前动作的公共描述、实际状态卡文案、世界 HUD 最近议事结果 |
| drawCreature.socialSpeaking / gathering | 社会活动发言标志、广场确有同伴时的共同轻跳高度 |
| spawnResident: point / index / names / colors / creature / resident | 新居民生成点、序号、四个新增名字/颜色、实例、更新居民名单的遍历项 |
| saveLife: data / record / creature / site / controller | 完整快照、建筑、居民、食盆、物流控制器；保存完成的经历，不保存动作瞬间 |
| restoreLife: validPoint / point / resident / cart / key / index / item / draft / controller | 坐标验证、居民/物流记录、字段、居民索引、待恢复建筑、草稿与控制器；先检查版本/数值，再重建 |
| saveButton / loadButton / error | 保存/读取控制、读写失败；失败给出提示，不伪报成功 |
| food-logistics.wear / mechanic | 0～1推车磨损、排他维修者；每移动160D累积1，最多降低45%行驶速度 |
| api.known / controller.status.facility | 工人是否熟悉此工坊的查询、控制器所属设施ID |
| reserveRepair / releaseRepair / repair: creature / point | 申请/释放维修的居民、车后可站位；空闲车才能预约，每份零件降低0.65磨损 |
| controller.save / restore: data / key | 工坊生产、库存、磨损、车位与角度；恢复时取消原任务，保留已计入库存的货物 |
| social-assets: key / name / note / points / surface / solid | 九个模型键、菜单名/说明、导出坐标下的交互点、地面/碰撞网格名称正则 |
| construction.BUILDINGS.definition | 从新设施配置生成菜单；沿用同一个按钮模板和放置流程 |
| CSS .thought / --accent / --line | 以现有强调色和细分隔线显示认知信息，不新增图标体系 |

## 检查脚本

| 文件与变量 | 含义 |
| --- | --- |
| cognition.test: assert / body / input / first / second / brain / trial / frozen / restored / invalid / observer / energyWeights / novice | 断言、自身条件、相同输入、独立同初值网络、试验索引、冻结快照、恢复/损坏样本、观察者及私有输出行、未观察对照 |
| belief / measurement / bowl / carry / kitchen / station | 测量统计和样本、资源转移的纯数据对象 |
| inspect-social-assets: fs / fileURLToPath / Matrix4 / Vector3 / Quaternion / PropertyBinding / SOCIAL_ASSETS / floodGrid | 文件读取、路径转换、纯几何数学/节点规范化、资产配置与静态连通函数；不创建渲染器 |
| cell / width / min / gridIndex / pointAt / x / z / column / row / index | 0.12D格、100×100局部网格、-6D左/近界、坐标转换与行列/索引 |
| key / definition / bytes / length / data / binary / occupied / blocked | 当前资产、适配、GLB字节、JSON块长度、解析内容、二进制偏移、投影占地与半径膨胀格 |
| accessor: item / view / offset / components / size / stride / element / component / position | glTF访问器、缓冲视图、字节偏移、分量数、分量字节、步长、读取元素/分量和位置 |
| triangle: a / b / c / area / left / right / near / far / u / v | 三角顶点、投影面积、栅格边界和重心坐标 |
| walk: parent / node / matrix / name / primitive / positions / indices / count / offset / vertices / corner / vertex / child / root | 节点父变换、当前节点及世界变换、规范名、图元、位置/索引访问器、三角遍历和递归节点 |
| dx / dz / connected / failures / found / radius / angle / grid | 障碍膨胀偏移、入口连通表、失败点、可达标志、最多0.36D搜索修正及索引 |

这些检查执行神经学习与数值/静态几何规则，不运行 UI、浏览器、完整物理世界或语法 smoke test。


## brain-inspector.js：只读权重观察（2026-11-09）

| 作用域与变量 | 含义 |
| --- | --- |
| INPUT_LABELS / OUTPUT_LABELS | 按 inputVector 顺序列出的 24 个输入名称及五个预测变化名称；宽高深等视觉输入为原有归一化值 |
| COLOR_LIMIT | 统一颜色饱和阈值 0.5，只影响呈现，不修改参数；所有居民使用同一尺度 |
| createBrainInspector: creatures | 世界持有的居民数组引用，迎接新居民后可自动追加下拉项 |
| panel / toggle | 认知面板与展开按钮；沿用 construction 的折叠和 inert 状态管理 |
| residentSelect / layerSelect | 居民索引选择器、w1/w2 层选择器 |
| matrix / summary / detail / range | 权重表容器、学习和经历计数、当前连接完整数值、本层参数数量与极值文本 |
| download / notice | JSON 下载按钮与用户操作反馈 |
| selected / cells / layout | 当前行优先扁平索引、稳定保留的格子按钮列表、当前层的 key/来源 columns/接收 rows 标签 |
| lastRefresh / lastBrain / lastLayer / lastUpdates | 上次读取的墙钟毫秒、网络引用、层标识、参数更新计数；限制 500ms 读取频率并避免无变化重画 |
| hiddenLabels / index / _ | 从 BRAIN.hidden 生成的隐藏单元名称、零基序号和未使用的 Array.from 元素参数 |
| current / describeLayer / first | 获取当前居民、按选择生成矩阵结构、是否输入到隐藏层 |
| connection: index / row / column | 扁平连接索引及其按列数拆分的接收行和来源列 |
| showDetail: creature / value / description | 当前居民、未截断权重数值、连接名称；String(value) 保留 JavaScript 数值可回读表示 |
| selectCell: index / focus / previous / cell | 新选择索引、是否移动键盘焦点、旧按钮和新按钮；表格始终仅一个 Tab 停靠点 |
| buildMatrix: table / caption / head / header / corner / body | 语义表格、阅读方向说明、表头区、表头行、左上角标签、表体 |
| buildMatrix: label / source / column / row / isBias | 行或列标签、来源标签、列号、行号、是否为最后一列偏置 |
| buildMatrix: line / heading / holder / button / cell / index | 当前接收行、行标题、单元格容器、权重按钮、列标题节点、行优先索引 |
| keydown: event / offsets / next | 键盘事件、四方向索引步长表、裁剪到合法范围的目标索引 |
| syncResidents: index / option | 待补充居民序号及其下拉项；不重建已有选项 |
| refresh: force / now / closed | 用户操作是否强制刷新、performance.now 墙钟毫秒、是否收起面板；收起时跳过周期更新 |
| refresh: creature / brain / changedLayer / changed | 当前居民与实际网络、层变化标记、是否应更新呈现；不拷贝参数回网络 |
| refresh: values / minimum / maximum | 当前层的实际数组引用、该层最小值与最大值 |
| refresh: value / index / strength / lightness / hue / color / description / cell | 当前参数与索引、0～1 饱和强度、HSL 亮度、蓝/橙色相、背景色、完整连接读数、现有格子；只更新属性/文字，保持焦点与滚动位置 |
| download: creature / brain / data / blob / url / link | 被导出的居民和网络、包含尺寸与标签的当时快照、JSON Blob、临时对象 URL、下载链接；10 秒后释放 URL |
| data.name / exportedAt / updates / architecture / activation / storage | 居民名、ISO 导出时间、实际学习次数、BRAIN 参数、tanh 函数名称、行优先且最后列为偏置的存储约定 |
| data.inputLabels / outputLabels / layers | 输入输出名称与 w1/w2 数据；每层含 rows、columns、weights，导出时复制两个数值数组 |
| buildToggle / bothOpen | 建造面板展开按钮和两个面板是否同时展开；自动关闭另一面板，也沿用关闭建造时取消草稿的逻辑 |
| parameterCount | 从 BRAIN 维度推导的含偏置参数总数，不在界面结构中写死网络尺寸 |
| world.brainInspector | 页面创建的观察组件实例，由绘制循环调用 refresh；暂停世界后仍可读取 |

## world.js：新伙伴补足

| 变量 | 含义 |
| --- | --- |
| welcomeInitialCompanions.desiredPopulation | 开局及旧档迁移时的最低目标居民数 6；原有迎接上限 8 不变 |
| preferred / arrival | 第五/六居民的优先位置 (-5,1)/(1,-2)，以及搜索成功后的世界坐标；单位 D |
| searchRadius / radius / step / angle | 最大地图边长、从 0 以 0.8D 递增的搜索环、24 个采样方向的序号、每方向相隔 π/12 弧度 |
| point / inBounds / separated / awayFromCarts | 候选位置、离边缘至少 1D、离其他居民超过 1.2D、离所有推车中心超过 3D；同时检查原有导航净空 |
| other / controller / cart | 距离比较中的其他居民、物流控制器与当前推车坐标 |
| creature | 通过既有 spawnResident 新建的居民；独立 attach 网络并设置地面高度，旧居民记忆不重置 |

## index.template.html：观察组件样式

| 变量或组件尺寸 | 含义 |
| --- | --- |
| --brain-width / --brain-available | 展开观察面板目标宽 700px、扣除两侧 HUD 边距后的最大宽；小屏保留横向表格滚动 |
| --brain-height | 视口动态高度减 160px，为两项折叠标题和间距预留空间；右 HUD 自身也有视口高度限制 |
| --motion / --accent / --line / --ink / --muted / --hud-inset | 复用原 HUD 动画、颜色、边界、文字与屏幕边距；减少动态偏好继续把动画时长设为 0 |
| brain-controls / weight-cell / brain-matrix / brain-detail | 选择器最小宽 150px、格子 24×24px、矩阵最高 38dvh 并独立滚动、选中读数至少 3.2 行高；格子正负字符与颜色并行表达 |


## romance-rules.mjs：双向关系规则

| 作用域与变量 | 含义 |
| --- | --- |
| clamp: value | 将好感等标量限制到 0～1；游戏规则不代表现实心理模型 |
| romanceState: creature / brain.romance | 当前居民及随认知一起存档的关系状态，旧档按需补充 |
| romance.partner / nextInvite / since | 伴侣居民索引（null 为未配对，0 是有效索引）、最早再次接受/发起约会的模拟时刻、确认关系时刻 |
| feelings: creature / other / create / key / relation | 有向关系的主人、另一位居民、是否创建缺失字段、对方字符串索引、原 brain.relations 中同一关系对象 |
| relation.affection / sharedSeconds / dateSeconds | 0～1 好感（初始 0.18）、真实玩耍/聊天/约会的累计秒数、其中实际约会秒数；信任与亲近沿用原字段 |
| comfortable: creature | 能量 >0.38、疲劳 <0.72、安心 >0.4、愉悦 >-0.15 的居民才适合邀请/积累浪漫好感 |
| spendTime: first / second / seconds / kind / rate | 两位同处居民、实际经过的模拟秒数、date/play/chat/nearby 类型、每秒基础好感增量 0.012/0.009/0.009/0.0015 |
| spendTime: self / other / relation / personalGain | 逐方向更新的主体/对方/关系；个体增益为 0.75 加正向愉悦的 0.5 倍 |
| canDate: a / b / forward / back / available | 两方关系状态、有向关系、是否都单身或互为伴侣；发起方好感至少 0.34、回应方至少 0.28，双方真实互动至少 10 秒 |
| wantsDate: creature / draw / willingness | 被邀请者、0～1 随机样本、由安心/愉悦/疲劳形成的接受意愿；状态合适也允许拒绝 |
| confirmBond: first / second / time / a / b / ready / relation | 待确认双方、当前模拟时刻、双方关系状态、是否双向满足阈值、被检查的有向关系；好感 0.64、互动 35 秒、约会 8 秒、信任 0.4，且双方尚未配对 |

## romance.js：世界适配与表现

| 作用域与变量 | 含义 |
| --- | --- |
| createRomance: api | creatures、positionOf、clearLine、time、announce、motion 的世界接口；不读取未知建筑或重写网络 |
| canvas / ink / texture | 96×96 心形画布、2D 绘制上下文、共享 sRGB 纹理；使用统一填色与描边，未使用 Emoji 字符 |
| effects / lastNearby | 每居民的临时表现对象 Map、上次低频邻近采样模拟时刻；近处安静陪伴最多每秒采样一次 |
| effect: creature / material / heart / state | 当前居民、独立透明精灵材质、添加至身体 root 的心形精灵、临时 until/blend/wasDating 状态 |
| state.until / blend / wasDating | 额外心形显示截止时刻、随约会开始/结束平滑变化的 0～1 系数、上一物理步是否在约会；不进入存档 |
| score: first / second / preferred | 邀请候选排序的两居民和是否是自己的伴侣；排序为当前好感加伴侣优先量 2 |
| available / consider: first / second / now | 双向条件与邀请冷却检查、当前模拟时刻；拒绝后发起者等待 24 秒/回应者等待 12 秒，接受后双方等待 38 秒 |
| begin: first / second / session / established | 开始约会的双方、原有共享社交会话、是否互为恋人；恋人 50% 采用 duet，其余 snuggle |
| step: seconds / now / sampleNearby / nearbySeconds | 物理步秒数、当前模拟时刻、是否到邻近采样时刻、最多记入 1 秒的安静陪伴时间 |
| step: first / second / visual / dating / target | 循环中的两居民、当前表现对象、是否约会、平滑目标；每个无序居民对只更新一次 |
| step: together / active / a / b / distance / relaxed | 是否共享社交会话、是否同时 play/chat/date、双方坐标、D 距离、是否都在 idle/sun/toy-rest；必须 2.4D 内且视线畅通 |
| step: creature | 确认关系后逐个触发庆祝的居民，心形保留 7 秒，开心跳跃使用原 joyStart/nextJoy |
| draw: now / motion / creature / visual / partner / dating | 模拟时刻、减少动态偏好倍率、当前居民及表现、互动伙伴和当前约会状态 |
| draw: progress / pulse / visible / fade | 本次约会经过秒数、错开居民的 2.6 秒漂浮周期、是否显示心形、入场/结束淡出系数；结束淡出 0.7 秒 |
| draw: a / b / dx / dz / length / lean | 双方世界坐标、方向差、至少 0.01D 的长度、3 秒内渐进的最大 0.15D 身体倾靠；转成身体局部坐标，不移动碰撞体 |
| draw: duet / sway / eye | 是否同步摇摆、摇摆角度（弧度）、原眼睛网格；摇摆幅度 0.13/0.055，轻跳最高 0.09D，眯眼为原高度 0.55 倍 |
| summary: creature / state / partner / crush / crushPartner / reciprocal / other / a / b | 文案主体及关系、伴侣对象、当前最在意居民、对方伴侣、是否双向好感、筛选/排序中的居民；已配对关系不被写成等待确认 |

## world.js 与 society.js 的恋爱接入

| 变量 | 含义 |
| --- | --- |
| romance | 世界关系组件实例；物理步累积关系，绘制步更新动作，UI 步呈现关系 |
| creature.socialIntent | 追踪同伴阶段的意图 play/date；两方均为 date 才开始约会，结束配对时恢复 play |
| inviteForPlay.romantic / candidates / message | 是否邀请约会、可达空闲候选列表及邀请反馈；沿用双方相向追踪，不设置僵硬集合点 |
| session.kind / dateStyle / duration | 共享会话类型、snuggle/duet 表现、约会持续 14 秒；旧 play/chat 路径保留 |
| updatePlaySession.center / position / length / target / member / kind | 约会双方中心、当前居民位置、半距、靠近目标、遍历双方、抵达后的共同活动类型；间距 >1.14D 时向距中心 0.54D 的可达点靠近 |
| updateCreature.dating | 当前实际双向约会；计入休息，额外每秒愉悦 +0.018、安心 +0.008、亲近 +0.018，保留能量消耗与原有同伴精神恢复 |
| updateUI.dateActivity / .relationship | 当前贴贴或同步摇摆文案、状态卡新增关系文本；不用永久心形标记所有普通朋友 |
| society.actionClass(date) | 把约会体验映射为原有 social 输入类别；实际身体/心情变化经 endExperience 进入网络训练 |
| romance-rules.test: resident / index / first / second / third / restored / oneWay / uninterested / tired / nearbyA / nearbyB | 独立数据检查的居民工厂、索引与双向/第三人/存档恢复/单向/拒绝/疲劳/纯邻近样本；没有加载 UI 或世界模拟 |


## 独立分析扩展索引

新增活动观察、完整快照、对象预测与独立页面变量详见 UCUG1505-ANALYSIS-VARIABLES.md。cognition.actionClass 为游戏与分析共用的动作分类函数，沿用原 society.js 的映射；brain.observation 随既有完整认知存档保存。


## 三期餐饮任务归属

公共厨房制作/用餐由 provisions 控制器接管，社会控制器停止生成旧厨房计划。provisions 的建筑排序引用 society.value 的个人网络预测；餐食作者好感由真实食用触发的有向关系规则更新，不将其误称为网络自动生成配方。comfort 独立影响休息倾向，不改变既有网络尺寸。医疗/昏迷/死亡居民不会执行正常社会或恋爱任务。详情见三期物品与冬季变量文档。


## 生存与救援修复

最新先天优先级、医疗备用库存、完整路线预算、统一导航终点及卡住检测见 [UCUG1505-SURVIVAL-VARIABLES.md](UCUG1505-SURVIVAL-VARIABLES.md)。本轮覆盖此前“只招募闲逛、能量超过 55%”及“基本设施需要学习”的限制；原伤害和医疗效果不变。
