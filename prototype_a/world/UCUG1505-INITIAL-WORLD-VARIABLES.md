# 初始建筑与相互认识

2026-11-10。初始名单统一放在 initial-world.mjs 的 INITIAL_BUILDINGS 中。固定六设施仍对应现有世界核心适配器；额外设施由布局规划器安排，初始列表按实例 ID 与类型匹配，不把以后新建的同类建筑视为原有设施。

| 初始设施 | 实例 ID | 开局认识 |
| --- | --- | --- |
| 阳光中心 | initial-sunlight | 是 |
| 睡眠窝 | initial-nest | 是 |
| 食盆 | initial-bowl | 是 |
| 玩耍拱门 | initial-arch | 是 |
| 食物工厂 | initial-workshop | 是 |
| 小球之家 | built-1 | 是 |
| 医疗站 | built-2 | 是 |
| 团团餐厅 | built-3 | 是 |
| 供能巨碑 | initial-monolith | 否 |

认识包括已知位置、外观和用途；visits、observations、训练次数、经历、权重均不伪造。初始八种设施通过 initialFamiliar 标记获得原本需要访问经历的熟悉资格。日常生存本能保留；供能口的选择与紧急恢复现在同样检查是否已知巨碑，避免尚未发现便远程直奔巨碑。发现后可以按已有机制探索、学习和充能。

六只初始居民建立双向 friend-index 记忆和中性的关系（trust/affinity 各0.5），不预置恋爱、共同活动时间或虚构经历。index>=6 的后续居民不参加初始化。新设施和新同伴按既有机制认识。

| 变量 / 作用域 | 含义 |
| --- | --- |
| INITIAL_POPULATION / INITIAL_KNOWLEDGE_VERSION | 初始六人数量、初始认知版本1 |
| INITIAL_BUILDINGS.id / key / known / point | 稳定设施ID、模型类型、是否初始已知、固定布局世界坐标D；无point的设施由布局规划器安置 |
| familiarMemory(memory) | 有初始熟悉标记或已有真实访问记录时返回true；undefined或仅看见尚未访问返回false |
| seedInitialKnowledge.residents / buildings / positionOf / time | 居民、已注册设施、获取居民真实坐标的函数、当前模拟秒 |
| cohort / familiarBuildings | 下标0–5的初始居民；与初始已知名单ID和类型均匹配的设施 |
| resident / peer / record / definition / memory | 当前居民、其他初始同伴、实际设施、配置项、建立或保留的对象记忆 |
| memory.initialFamiliar / purpose / food | 初始熟悉资格、用途类型、食盆当前食物量；其余记忆由discover初始化，保留既有经历 |
| world.initialKnowledgeVersion / lifeRestored | 存档中的初始化版本、是否完整读取成功；在初始同伴补齐后且载入成功时执行一次 |
| CORE_LAYOUT / STARTER_BUILDINGS | 从统一列表派生固定模型位置与规划器附加设施列表；工厂停车点继续由工厂位置加偏移得到 |
| build.imports['initial-world'] | 内嵌配置与初始化模块，转换本地 cognition 模块引用；world-layout也转换相应依赖 |

旧存档仅补齐缺失初始认知，保留已经认识的巨碑、既有好感和训练结果，不擦除历史。后续保存包含 initialKnowledgeVersion，新存档加载不会反复初始化。旧存档 built-ID 若对应不同模型，不错误匹配为初始设施。若读取失败，不执行补种。

initial-world.test.mjs 中 residents/buildings 为纯数据场景，positionOf 为坐标替身，weights 为原权重副本，previous 为初始化后快照。检查八设施/五同伴的已知数量、双向关系、未知巨碑、后建建筑和新人排除、零伪造访问/训练、重复初始化不改变历史；同时回归布局与认知数值测试。没有运行浏览器或完整生态模拟。
