# 昼夜、生命状态与救援变量

时间采用模拟秒；1 秒等于游戏内 1 分钟。身体量为 0～1，D 为小球直径。

## winter-rules.mjs

| 名称 | 含义 |
| --- | --- |
| WINTER.daySeconds / daysToWinter / startHour | 一天 1440 秒，14400 秒（4 小时运行时间）后到严冬，开始时刻为正午 |
| transitionHours / deathNightSeconds | 晨昏各 3 游戏小时（180 秒）；昏迷累计 1080 秒夜间时间后死亡 |
| safeRadius / monolithRadius / monolithFatigue | 阳光保护半径 4D、巨碑边缘外疲劳影响 2D、深夜额外疲劳 0.018/秒 |
| clinicEnergy / clinicRest | 床位能量恢复 0.009/秒（静止消耗 300%）、疲劳恢复 0.028/秒 |
| time / elapsed / winter / daylight / hour | 季节经过时间、非负时间、严冬进程、当前白昼长度、一天内小时 |
| sunrise / sunset / half / progress | 名义日出日落时刻、过渡半宽、过渡进行比例 |
| phase / darkness / danger / fullNight / isNight / day / nightHours | 阶段名称、画面夜色权重、危险系数、是否彻底入夜、是否处于名义夜间、日期、夜长 |
| localDanger climate / sheltered | 气候样本、是否受到太阳保护；保护仅把危险系数减半 |
| health；state / cause / nightSeconds | awake/coma/dead，耗尽原因 energy/rest/both，累计昏迷夜间秒数 |
| clinic / bed / carried / fellAt / diedAt | 所在医疗站、床号、正在被搬运标记、倒下时刻、死亡时刻 |
| kit / supply | 早期接入字段；现在迁移到个人实物栏和 carry.food，不重复持有 |
| creature / energy / fatigue / seconds / deathAllowed | 居民、能量、疲劳、经过时间、允许执行死亡开关 |
| kits / carrier / type | 医疗站两类药包库存、带原料/药包的居民视图、energy/rest 类型 |

黄昏危险 0→2，完全入夜为 3，黎明 2→0。死亡累计包含名义夜间内的晨昏各半段；白天暂停而不重置。关闭死亡保留计时，重新开启按已有累计量判断；已死亡者不会复活。

## medical.js

| 名称 / 作用域 | 含义 |
| --- | --- |
| api / clinics / jobs / claimed / lastDispatch | 世界接口、医疗站映射、救援者任务、患者预约锁、上次派遣时刻 |
| carrierState inventory / health | 把个人物品栏与原料携带量映射到准备/领取医疗包的兼容视图 |
| position creature / point / lift | 同步 Matter、插值参考位置及模型离地高度；XZ 和高度单位为 D |
| record / point / original / root / pivot | 用户医疗站、实例位置、站内原小车、独立担架模型、移动父组 |
| clinic home / entry / supply / kits / beds / busy | 停靠点、中央入口、取用品站位、真实库存、两个床位患者索引、本站救援者 |
| wheels / stock / type / index / name / mesh / angle | 车轮记录、模型库存节点、类别、序号、节点名、网格、原始转角 |
| bedPoints / box / center / height | 从床垫模型包围盒读取的真实床位中心及表面高度 |
| sun / light / hold / carrier | 复用的微型阳光中心、局部光源、通用货舱、担架载具接口 |
| job worker / patient / clinic / vehicle / type | 施救者、患者、目标站、实际借用载具、所需医疗包类别 |
| phase / target / elapsed / deadline | 任务阶段、目标、阶段累计时间、超时期限 |
| bed / pickup / berth / loaded / route / food | 预占床号、接人停车点、送达停车点、是否载人、真实路径、原料食盆 |
| patientStart / unloadStart / started / wait | 上车起点、车外转床起点、制作开始时刻、受阻等待秒数 |
| worker.medicalTarget / health.noticedComa | 分析用救援对象、远距离感知到的昏迷居民索引 |
| start / home / exit / route / phase | 路线起点、停靠点、先驶离取物台的出口、路径数组、路线目的 |
| origin / patient / radius / offset / angle / target | 接人站位搜索基准、患者、车体导航半径、搜索环半径、环角度、候选点 |
| state / type / bed / vehicles / vehicle / cartPoint | 医疗包与原料视图、按昏迷原因选包、空床号、空闲载具候选、实际借用车、牵引者站位 |
| now / patientState / target / remaining / travel | 当前模拟时刻、患者生命状态、下一路点、剩余距离、本步行驶距离 |
| candidate / reversing / heading / pull / clear | 本步候选位置、回停靠位倒车标记、车头方向、牵引者位置、综合净空条件 |
| blend / cart / bed / target / drop / recovery | 上下车插值、载具位置、床位、插值目标、中断安全放下点、昏迷能量恢复速率 |
| patients / helpers / assigned / nearby / other | 按夜间昏迷时间排序的患者、足够健康的候选救援者、派遣完成标记、感知对象、其他居民 |
| save data / item / key | 每站库存与担架位置；在途任务不恢复，真实资源和患者保存后重新安排 |
| summary list / sum / value | 医疗站集合及药包/空床累计文本所用的归约量 |

医疗包目前每份需要 1 个原食物、准备 3 秒、现场使用 3 秒。能源包增加 40% 能量，不补精力；蓝包增加 5% 能量、30% 精力。依照昏迷原因选包；双耗尽使用蓝包。达到有能量且有精力的条件才可药包唤醒。静养仍需能量和精力都回满才唤醒。

担架及工厂推车共享载具接口，任务先预约患者、床位与载具。较宽的工厂推车停在站外，由救援者沿入口通路把患者送到床边；模型移动采用受路径约束的运动与上/下车插值，非软体或刚体牵引绳模拟。救援者能量低于 20% 或疲劳高于 88% 时安全中止；任务中断不凭空退回已消耗的原料。

## 世界与显示变量

`winterStart` 是季节起点，旧档从读取时开始新季节；`climate` 是当前气候样本；`deathAllowed / deathToggle` 是死亡规则与页面复选框；`medicalGrid` 是担架半径的导航缓存。`danger / active / fatigueRate / companyRecovery` 用于本地危险、额外行动开销及原有同伴恢复；`hemisphere / daylight` 控制夜间色调和照明。

`healthLine / sunMessage / inventoryLine` 为居民卡片文字；`down / fall / baseColor / bodyOutline` 分别控制倒下、过渡、原体色及独立轮廓材质。死亡者六秒后隐藏身体，居民记录和他人的记忆保留。`reference / origin / reached / destinations / clearance / radius` 用于建造时保留生活及载具通路。

测试中的 `assert / creature / health / dusk / dawn / saved / kits / carrier` 为纯数值断言、独立居民样本、生命状态、晨昏样本、JSON 往返样本、物资及持有者样本，不运行页面。


## 生存与救援修复

最新先天优先级、医疗备用库存、完整路线预算、统一导航终点及卡住检测见 [UCUG1505-SURVIVAL-VARIABLES.md](UCUG1505-SURVIVAL-VARIABLES.md)。本轮覆盖此前“只招募闲逛、能量超过 55%”及“基本设施需要学习”的限制；原伤害和医疗效果不变。

## 2026-11-10：放慢游戏时钟与存档兼容

`secondsPerHour / WINTER.secondsPerHour` 为每个游戏小时对应的模拟秒数，现为60；daySeconds=24×60，deathNightSeconds=18×60。日期、时刻、季节、昏迷小时显示都使用统一换算。初始白天/黑夜各12分钟，严冬为6/18分钟。仍在正午开局，首个夜间约在开局6分钟后开始（逐渐缩短白昼会使其略微提前）；暂停不推进。动作、生产和每秒生理速率未调整。

`retimeWorld(saved)` 为旧钟速存档转换：`previousDay` 读取存档 `clockDaySeconds`，缺失视为旧288秒；`data` 是深拷贝；`ratio` 为新旧日长比；`origin` 为旧季节起点，缺失时按存档当前时刻。保留模拟总时间及全部任务/经历时间戳，只调整 winterStart，使季节累计时间扩大5倍，并将居民 `health.nightSeconds` 同比换算以保留已累计的游戏内小时。`resident` 是正在换算健康计时的居民。`winterStart` 允许为负数，这是日历偏移，不代表模拟倒退。

新保存增加 `clockDaySeconds` 标记，重载不重复转换；旧数据对象和浏览器中的原保存不会在读取时被修改。已死亡状态保持。数值回归覆盖一分钟/小时/日换算、晨昏边界、十日严冬、夜间死亡阈值、原日期时刻保留、任务时间不变以及重复转换稳定性。
