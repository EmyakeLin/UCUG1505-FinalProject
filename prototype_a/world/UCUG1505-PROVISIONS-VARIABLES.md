# 餐食、物品栏与通用载具变量

单位：D 为小球直径；时间为模拟秒；身体、精力、舒适度采用 0～1，愉悦采用 -1～1。精力在代码中以疲劳 fatigue 的反向值表示。模型原件和源包未改写。

## provisions-rules.mjs

| 名称 / 作用域 | 含义 |
| --- | --- |
| RAW_ENERGY | 1 个原食物恢复 0.24 能量，沿用原食盆的单位 |
| INVENTORY_CAPACITY | 4 格个人随身空间；每个原料或成品占一格 |
| ITEMS；type / name / model | 物品类型、中文名称、用户 GLB 在离线资源表中的键 |
| food / energy | 食物等价值 / 直接能量增量；医疗包采用直接能量，不能乘食物单位 |
| rest / joy / comfort | 精力恢复量、愉悦增量、舒适度增量 |
| RECIPES；cost / count / seconds | 配方的原料消耗、一次产出件数、实际在工作位制作的秒数 |
| creature / first / second / eater / cook | 接受状态变化、交换双方、食用者及制作者的居民对象 |
| inventory；items / held | 实物数组、正在抱着的数组索引；null 表示无指定握持物 |
| carry.food | 沿用原料携带字段，计入同一个四格空间；旧档超量原料不删除，消耗前不再拾取 |
| item；type / cook / origin | 实物类型、制作者居民索引、restaurant/kitchen/medical/legacy 来源；转交保留作者 |
| index / count | 实物在当前持有者数组中的下标 / 所需空间格数 |
| stock；raw / products | 配方输入仓库原料数与输出实物数组；厨房以个人原料构造临时仓库 |
| recipe / effect | 当前配方参数 / 当前物品效果定义 |
| relation / gain | 食用者对制作者的有向关系及本次增量；不能生成自我好感 |
| value / min / clamp | 待限制的数值、下限、封顶为 1 的限制函数 |
| validInventory(value) | 检查保存物品的类型、作者、来源、数量及握持索引；不运行界面 |

配方：便当 2→1，恢复 1.6 食物能量及 5% 精力；零食 2→2，每个恢复 0.5 食物能量及 5% 精力；简餐 1→1，堂食恢复 0.8 食物能量及 5% 精力。简餐打包仅改变同一件实物的类型，降低至 0.7 食物能量、2.5% 精力，不另生成一份饭。

暂定平衡参数：零食愉悦 +0.5；堂食愉悦 +0.45、舒适 +0.3；打包简餐愉悦 +0.12、舒适 +0.08；便当愉悦 +0.12、舒适 +0.06。别人吃餐厅制作的食物，制作者愉悦 +0.4；外带餐食的食用者好感/亲近 +0.12，堂食按用户“小幅”设为 +0.04。自己食用不产生自我关系。所有增益封顶。

## provisions.js

| 名称 / 作用域 | 含义 |
| --- | --- |
| api | 世界提供的路径、身体、模型、库存、预约、时钟、学习与事件接口 |
| places / jobs / visuals | 建筑实例到餐饮库存、居民到任务、居民到握持模型的映射 |
| record / restaurant / place | 建筑记录、是否为餐厅、该建筑的独立服务状态 |
| place.raw / products / recipe / served | 已送达原料、成品实物、轮换配方序号、完成的堂食次数 |
| deliverySite / site / destinations | 提供给工厂物流的实际原料接收点及共享接收点集合 |
| job.mode | fetch 领原料、supply 送原料、cook 做饭、dine 堂食、collect 取外带、eat-carried 吃随身物、share 转交 |
| job.place / target / slot | 当前建筑、世界 XZ 目标点、共用预约系统中的工作位或座位 |
| job.deadline / progress | 最迟结束时刻、实际到达后累计处理时间；路上不制作或进食 |
| job.recipe / source / product / itemIndex | 配方、实际食盆来源、预约成品引用、随身数组索引 |
| job.peer / nextTrack | 收礼人、下次更新其当前位置的模拟时刻；不追逐过时会合点 |
| mode / extra / role / filter | 新任务种类及附加状态、建筑工作位用途、候选建筑筛选函数 |
| creature.provisionTarget / provisionMode | 生活分析记录的建筑/同伴对象与精确活动类型 |
| creature.nextGift / nextProvision | 下次转交或接工作任务的最早时刻；分别冷却 35 秒、8 秒 |
| awake / distance / closest / station / seat | 清醒筛选、XZ 距离、按距离与个人学习偏好排序、用途对应工作位、空座位选择 |
| inventory / edible / shareIndex / peer | 个人物品栏、可食物索引、可分享物索引、满足接收条件的同伴 |
| bowls / source / count / amount | 候选食盆、实际来源、本次领取整数数量、本次入库数量 |
| cook / types / type / recipe / actual | 做饭工作位、轮换类型、当前类型、配方及原料不足时回退的简餐类型 |
| target / path / point / duration / slot | 追踪或任务目标、真实寻路结果、当前位置、到达后的处理时长、被预约位置 |
| index / item / stock / product | 实物位置、已拿出实物、厨房临时原料视图、真实制作的成品 |
| model source / mesh / root / center / visual / type | 提供的 GLB、克隆模型、握持父组、缩放后的包围盒中心、当前持有模型记录、决定使用哪个实物外观的类型 |
| place draw mesh | 用户模型的实际食材/餐碗/外带节点；显示数量由库存和真实用餐任务决定 |
| summary counts / contents / held / holdingRaw | 按类型计数、个人物品文字、指定握持物、正在抱原料的判断 |
| save / restore data / item / product | 独立库存和配方计数持久化；未完成任务释放，实际原料和物品保留 |

四个堂食位与灶台、外带位分别预约；同一成品不会同时吸引多名客人预约。菜做好后才入库；没有在工作位的厨师，时间流逝不会自动产生成品。暂定厨师开工阈值为能量 >50%、疲劳 <55%；普通餐饮任务能量 <16% 或疲劳 >90% 时中止，正在用餐可继续。

## cargo-rules.mjs 与 food-logistics.js 的扩展

| 名称 / 作用域 | 含义 |
| --- | --- |
| hold；capacity / entries | 通用载具货舱容量与占用记录；工厂推车四格，整只小球占四格 |
| entry；id / payload / units | 唯一货物标识、任意承载数据、占用空间格数；容器不限定货物种类 |
| first / second / id / entry | 转运双方的货舱、目标标识、被转运记录；目标装不下时原物留在原车 |
| cargoSerial / initialCargo | 新原料记录编号、从原有 cargo 数量迁移的原料数 |
| state.cargo getter/setter | 旧食品配送接口到通用货舱内 raw 实物数量的兼容视图 |
| rescueOwner / hasOtherCargo | 当前外借任务所有者、非原食物货物的存在判断；阻止同时配送/维修/救援 |
| carrier pivot / home / radius / height / pullDistance | 载具模型、停靠点、导航净空半径、患者相对承托高度、牵引者站位距离，单位 D |
| carrier available / reserve / release / load / unload / sync / roll | 空闲检测、借用锁、归还锁、通用装卸、同步 Matter 车体、轮子滚动接口 |
| payload.kind / item / resident / modelKey | 常见物品、居民索引及模型键；未来物件可提供任意 payload 和明确的模型键 |
| cargoViews / view / source / key / index / mesh / box / center | 已装非原食物模型、对应父组、来源模板、模型键、舱位序号、克隆网格、包围盒、居中参考 |
| destinations / foodSite.restaurant / capacity | 食盆与餐厅接收点、送达餐厅标记、该接收点容量；直接搬运可填至餐厅 8 份，原配送车使用已有 6 份补给阈值 |
| save hold / restore entries | 保存非居民实物承载记录；运输中的患者位置和生命状态由居民存档保存，读档安全放到车旁后重新安排救援 |

本版已接入自动原食物配送与昏迷居民救援。餐盒和医疗包已有通用装载、外观及持久化接口，但尚无专门的自动批量餐盒/医疗包运输订单；居民会自己携带这些物品。通用容器不表示任何大小的建筑都能装上车，新增物体需定义空间占用和可用模型。

## 世界、分析与心情扩展

`provisions` 是餐饮控制器；`deliverySites` 是餐厅物流入口集合；`CIVIC_ASSETS` 是餐厅与小球之家的节点规则及交互坐标。`service` 区分 supply/cook/takeaway/seat，睡窝使用原 sleep 槽位。`inventoryLine` 是居民卡片中稳定更新的物品栏文本。`restedUntil` 为完整睡眠后的效果到期时刻：暂定 48 秒、正向疲劳增长乘 0.8。

`mood.comfort` 为舒适度；`target` 是受休息、进食、疲劳、压力影响的舒适目标；`blend` 是 30 秒时间尺度的指数趋近权重；`discomfort` 为其补值，用于睡眠倾向。它不会更改既有 24→20→5 网络尺寸，原权重与经历保持兼容。餐饮设施选择使用现有神经预测偏好；新增生产/医疗操作是明确的任务规则。

`activityOf` 根据 provisionMode 将用餐、分享与工作分开记录。快照新增个人 inventory，保存物品来源和制作者；原来的独立分析页仍为只读时间快照。

纯数据测试变量：`close / actual / expected` 用于浮点比较；`resident / index` 创建隔离数值样本；`type / energy / rest / joy / comfort` 为逐物品效果断言；`stock / simple / packed / first / second / item / heldBefore` 检查配方、打包、转交和存档；`dying / before / full` 检查死亡禁止使用和上限；`cart / other` 检查载具空间、任意货物及装卸守恒。测试不运行界面或生态模拟。
