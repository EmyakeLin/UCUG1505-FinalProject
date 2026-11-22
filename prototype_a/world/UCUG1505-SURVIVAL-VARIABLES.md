# 生存本能、救援和寻路修复（2026-11-09）

## 规则与职责

基本生存不要求访问经验或神经训练。能量/精力恢复、夜间寻找睡窝或安全阳光、缺粮后的生产/配送由先天规则优先处理。网络保留对具体场所的偏好，不再把未体验的基本设施权重清零。救援由独立调度器处理，完整路线必须留下体力余量，不能拿最后一点体力盲目冲过去。

医疗站主动维持能源包、蓝色急救包各一份备用库存（原容量仍各两份）。每份消耗一个真实原食物、到站制作三秒；救援现场使用三秒。没有患者时，有余力的居民会去备药，食盆至少有两份时才从中取一份用于日常备药；自己的携带原料也可使用。出现待救患者会中断低优先级备药，已领取的原料保留在居民身上，随后重新分配救援。无原料不生成药包，继续比较担架运输。

## rescue-rules.mjs

| 变量 / 作用域 | 意义 |
| --- | --- |
| RESCUE.minEnergy / maxFatigue | 最低应答能量 0.24、最高应答疲劳 0.78；之后仍检查完整任务预算 |
| stopEnergy / stopFatigue | 执行期间能量低于 0.12 或疲劳高于 0.92 时安全中止 |
| energyReserve / fatigueReserve | 任务预计结束后保留 0.08 能量、0.06 精力；预计开销额外乘 1.15 留余量 |
| creature / busy / eating / transporting | 候选居民、是否已有医疗任务、是否正在进食、是否正在推另一辆运输车 |
| danger | 当地危险系数；提前补给阈值为 0.28 + 0.05 × danger，疲劳阈值为 0.78 |
| routeBudget start / path / speed / energyRate / fatigueRate | 路径起点、路点、D/秒速度、各地点每秒净能量消耗和疲劳增长函数 |
| previous / point / length / steps / interval / index / weight / sample | 当前段起终点、段长、每约 1D 分段采样数、每次时间、序号、插值权重与取样坐标 |
| energy / fatigue / seconds / distance | 累计预算的能量、疲劳、模拟秒、路程 D；不预支途中可能增加的能量 |
| affordableRescue cost | 含往返或送达、制作、救治时间的总预算 |
| urgentOrder first / second | 患者排序，优先昏迷夜间累计时间较长者 |

## instinct-rules.mjs

`INNATE_ACTIONS` 包含 charge/eat/sleep/sun/work/delivery。`instinctIntent(creature, context)` 读取 danger、night、sheltered、food、population：先处理耗尽风险，再处理夜间暴露/疲劳，食盆食物少于 max(2, 0.75 × 清醒人数) 时补生产与配送；体力不足的候选先恢复。`preserveInnateWeight(action, weight, hasExperience)` 保留基本行为的未学习权重。它不改变配方、能耗和死亡条件。

## navigation.mjs

| 变量 / 作用域 | 意义 |
| --- | --- |
| occupied / blocked | 与 Matter 墙体共用的真实占据格、原导航膨胀格；建筑更新后原数组内容会更新 |
| width / height / cell / minX / minZ / radius | 栅格宽高、单格 D、世界原点、实际小球半径加 0.035D 余量 |
| dynamicBlocked | 食品推车等移动屏障的阻塞判断 |
| indexOf / pointAt | XZ 位置与格中心之间转换；出界返回 -1 |
| penetration point / column / row / padding / overlap | 测试点、中心格、扫描半径、球与附近实心格矩形的最大穿入量 |
| dx / dz / x / z / left / near / separation | 邻格偏移、格坐标、矩形最小 X/Z、点到矩形距离 |
| free point / index | 整个球体能否放到该点，不只判断中心格是否为空 |
| line first / second / escape / length / steps / step / weight / point | 连续路径段检查；escape 仅用于从原有贴边位置向外退出 |
| last / cleared / depth | 逃离时前一步穿入量、是否已离开实体、当前穿入量；退出不能穿得更深，也不能穿过墙 |
| candidates point / maxDistance / points / target | 在目标 1.2D 内查找合法落点，按偏移距离排序 |
| path start / end / origin / targets / prefix | 实际起点、请求目标、可走起点、候选终点、必须显式保留的起点脱困路点 |
| from / previous / queue / head / tail / targetIndices / reached / next | 广度优先搜索起点、前驱表、队列、队首尾、目标格集合、到达状态、邻格 |
| finish / route / cursor / smooth / anchor / position / furthest | 可达终点、回溯路线、回溯格、平滑路线、当前段起点、处理索引、最远可直达索引 |
| trackProgress creature / point / now / waypoint / distance / watch | 居民、当前坐标、模拟时刻、下一路点、剩余距离、进度监视状态 |
| navWatch.target / best / at | 当前路点身份、最小剩余距离、上次真正前进时刻；至少接近 0.04D 才算进展 |

可走但隔墙不可达的目标直接失败，不换成墙另一侧的近点。原起点被挤进边缘时，路线包含真正的退出段，不能假装已在某个自由点。平滑后逐段保留整个球体净空。交互任务保存最终导航终点，避免任务检查原始不可走坐标。

## world.js 与控制器的接入字段

`navigation` 为统一导航器；`travelBudget` 用居民速度 ×0.8（推车 0.72D/秒）和沿途危险/阳光计算预算；`workBudget` 计算救治/制作期间的消耗。`seekRecovery` 的 force 表示为即将承担任务主动补足，nightShelter 表示只寻找睡眠/光源安全地点。`position / danger / tired / candidates / slot / refugePoints / center / radius / index / angle / point` 为恢复需求和真实地点候选；`chosen / best / checked / candidate / path / endpoint / cost / arrivalEnergy / arrivalFatigue / gain / energyTime / restTime / score` 为安全到达、恢复时长与选择比较量。找到可行方案后限制进一步昂贵的路径查询数量，首批不可行时继续搜索。

`recoveryTarget` 为阳光恢复目标能量（普通 0.82，为救援准备 0.94）；恢复期间继续计算原有消耗与阳光，不凭空增加能量。夜间可持续停在安全光源旁。睡眠能量下降到提前补给阈值便起床，避免等到只剩 20% 才出门。

`currentInstinct` 生成本能意图；`provideEssentialFood` 按工坊距离尝试配送和生产，夜间不安排无保护的工坊工作。`controllers / action / controller` 为候选工坊与岗位。`instinct / safeRoutine / urgent` 使可中断活动在需要时让位，正在进食、恢复、运输或救援不被反复重置。

`navFailures / navBestGoalDistance` 记录连续脱困失败与距最终目标的最好进展，避免横向绕开又回来就清零。`destination / detour / direction / angle / candidate / remaining / route` 为两侧脱困尝试及完整续接路线。连续三次无进展或路径不可达则释放任务、停下并短暂冷却；不无限顶墙。转角也提前减速，只在当前位置到下一段确实可通行时略过近处路点。

医疗新增 `dispatchStatus` 提示缺少站点、响应者或可完成路线；`plans / offer / mode / legs / extra / workSeconds / cost / leg / route / estimate / work / walkLeg` 构造实际可完成方案并比较预计时间。`origin / target / bed / vehicles / vehicle / pickup / berth / handle / plan` 为现场位置、空床与载具选择。`rescueNeedsRecovery` 请求先补足自身资源。`carrierState.preferred / selected` 保证拥有多种包时使用选定的那一种。

`stockOnly` 表示备药任务，没有被预约患者；其 patient 字段仅指向操作者以复用状态读取，取消不会释放其他患者。`prepareStock source / legs / cost / estimate / work / job` 表示真实原料、完整路径和制作预算。`emergency / offers / assignedCount / pending / helpers / type` 控制救援抢占与缺货补充。`api.eating / transporting / requestRecovery / travelBudget / workBudget` 分别提供当前任务保护和数值评估。备药任务完成时把包留在站内，不自动领走。

provisions 新增 `emergencyFood`：只吃已有随身食物或原料，使用实际的四秒进食过程，不先安排做饭。`eat-raw` 消耗 carry.food 的一份，沿用原食物效果。`go` 保存 creature.goal 作为任务终点。食品物流工作资格去掉 api.known 前提，`workPoint()` 供本能调度和夜间保护判断。

## 验证范围

rescue-navigation.test.mjs 为数值政策与栅格回归：非闲置/中等能量响应者、体力预算、零经历生存本能、绕墙、真实脱困路段、目标不可达和贴墙抖动。medical.test.mjs 导入实际医疗控制器，用确定性的世界服务和位置数据验证治疗、备药、无粮担架、终点修正和无人响应；只使用模型数学占位，不创建渲染器、界面、Matter 引擎或完整生态模拟。

测试中 fixture / residents / api / controller / now / messages / bowl / model / add 为隔离世界、居民列表、服务替身、真实医疗控制器、模拟时间、事件、食物来源、节点数学占位及其构造函数；tick / step / resident / target / point / distance / travel 推进任务时钟与确定性步行位置。helper / patient / preparedWorker / carrier / collapsed / snappedHelper / snappedPatient / sick 分别覆盖治疗、备药、搬运、目标修正与全员昏迷状态。
