# 扩大地图与布局迁移变量

2026-11-09。以下覆盖旧世界变量文档中的 48D × 32D 最小范围。D 仍为小球直径；未缩放模型、物理半径、速度、阳光半径或 HUD。固定正交镜头覆盖更大地面。16:9 新世界为约 72.36D × 64D；旧版同窗口约 48D × 42.45D，屏幕元素线性尺寸约为原来的 66%。

## 布局与持久化

初始六设施：巨碑 (-26,-22)、阳光中心 (-5,-1)、睡眠窝 (-17,10)、食盆 (5,6)、拱门 (-4,15)、工厂 (17,-8)，工厂小车 (19.42,-2)。新世界另放置已有的小球之家 (-17,-8)、医疗站 (0,-13)、餐厅 (18,15) 模型。没有新增或重做模型。坐标为 (x,z)，单位 D。

旧存档保留原设施数量和实例 ID，根据类别优先安置住宅、医疗、餐饮、阳光、食盆、工厂，再安排其他建筑；实际 GLB 占地加上工厂停车空间之后，每对建筑在至少一个轴向留 4.5D 净距。边界留白给通行和后续建造；不生成道路碰撞体。生活区采用相邻功能分组，巨碑位于左后方外围。设施很多时按容量增大地图。

迁移克隆数据，不修改原对象。首次读取旧布局时在 localStorage 的 `ucug1505-living-society-v1-before-layout-2` 保留原存档备份；用户保存生活之前主存档不覆盖。成功迁移保留小球生命状态、夜间昏迷计时、随身物品、神经权重、经历和建筑库存，只修正设施位置记忆；车辆携带库存回原所属建筑的新停车点，未完成行动仍按原加载规则重启。医疗床位按医疗站 ID 重新定位。普通居民迁到旧最近设施旁对应的相对位置，再查找附近无障碍落点。地图第二次加载保持已保存的位置与尺寸，不再次规划。失败暂停并显示原因，不删除原存档。

## world-layout.mjs

| 变量 / 作用域 | 意义 |
| --- | --- |
| LAYOUT_REVISION | 布局版本 2，与原生活存档 version=1 独立 |
| CORE_LAYOUT / LEGACY_LAYOUT | 当前六个固定设施与小车坐标；旧六设施坐标，用于计算迁移位移 |
| STARTER_BUILDINGS / id / key | 无存档时新增三设施及稳定 built-ID、模型类型 |
| ZONES | 各设施类型优先安置的世界坐标 D |
| LAYOUT_GAP | 完整占地之间轴向净距 4.5D，包含推车宽度余量 |
| PLACEMENT_ORDER | 有限区域优先分配给日常生活与救援设施的类型顺序 |
| worldDimensions: aspect / saved / migrating / count | 初始窗口宽高比、保存数据、是否旧布局迁移、额外设施数量 |
| capacitySpan | 每行按 19D 估算的容量跨度；ceil(sqrt(count+6))×19D |
| width / depth | 世界两轴跨度 D；最少宽 72D、深 64D，并考虑投影比例、旧存档扩大 1.5 倍、容量；上限各 256D。新版本存档直接复用其值 |
| translatedBox: box / point | 局部占地矩形和世界放置坐标；返回平移后的 minX/maxX/minZ/maxZ |
| separated: a / b / gap | 两个矩形与所需间隔 D，判断至少一个轴向分离 |
| planBuildings: records / footprints / reserved | 待安置记录、按模型类型索引的局部占地、六个固定建筑的已占地矩形 |
| occupied / planned | 已预留矩形列表、完整计划结果；函数不修改传入数据 |
| priority / index / ordered / a / b | 类型优先级函数、类型顺序下标、稳定排序后的记录列表与比较项 |
| record / local / preferred | 当前设施记录、局部实际占地、该类型优先坐标 |
| choice / best / score | 当前最优位置、最小平方距离、候选位置至优先坐标的平方距离 D² |
| x / z / point / box / other | 1D 网格候选位置、候选世界坐标、平移后的占地、已占用矩形 |
| migrateLayout: saved / planned / data / moves | 原数据、完成布局计划、可修改的深拷贝、设施 ID 到旧/新坐标的映射 |
| key / old / next / item | 类型、旧坐标、新坐标、待映射存档设施 |
| translate / point / move | 将点按所属设施位移平移的函数、原点、设施旧新坐标对 |
| resident / clinic / nearest / best | 当前居民、其床位所属站位移、距离原居民最近的设施位移、比较累积项 |
| cart / memory / id | 推车存档、已知设施记忆、该记忆所属设施 ID；cartPoint 更新为新停车点 |

## world.js 与打包

| 变量 / 作用域 | 意义 |
| --- | --- |
| mapSize / WORLD_WIDTH / WORLD_DEPTH / layouts | 布局模块计算的尺寸、世界宽深 D、固定设施表引用；镜头继续随 WORLD_* 覆盖地面 |
| saveLife.data.layoutRevision | 标记本次布局已迁移；仍保存完整 built 设施位置 |
| plannedAdditions: records / footprints / definition / model / box / point / local | 待安置设施、模型占地表、目录项、模板、模板世界包围盒、模板位置、扣除模板平移的局部包围盒 |
| plannedAdditions.reserved / record | 固定设施占地列表与记录；工厂延伸至 x+4.54、z+8.12，以包含停车位 |
| settleResidents: placed / creature / original / preferred | 已确认落点、当前小球、原位置、限制到世界边界内 2D 的搜索中心 |
| arrival / limit / radius / step / angle / point | 确定落点、最大搜索半径、0.6D 递增环半径、24 个方向的编号、弧度角和候选位置 |
| insideWorld / apart / other | 是否距世界边缘大于 1D、是否与已落位小球相隔 1.2D、比较的小球坐标 |
| relocating / planned / migrated / resident | 旧布局判断、规划结果、迁移副本、限制迁移坐标范围的居民项 |
| item / draft | 新世界默认设施计划记录、通过既有建造适配器提交的完整实例 |
| build.mjs imports['world-layout'] | 内嵌离线布局模块；仍从本地模型和依赖打包 |

## 数值与资产验证

`world-layout.test.mjs` 只处理实际 GLB accessor 包围盒、矩阵与数据：`files/key/file` 为资产映射；`bytes/data/node/primitive/accessor` 为 GLB 数据；`walk/index/parent/matrix/rotation/root/child` 为节点变换遍历；`box/x/y/z` 为变换后的几何角点。`footprints/reserved/planned/boxes/a/b` 为完整占地及配对净距检查。`aspect/size` 覆盖 16:9、4:3、21:9 和 0.6；`cell/width/height/blocked/grid/pointAt/index/point/reached` 为按 0.24D 栅格、以 2.12D 车身半径膨胀后的保守外围通道连通检查。`old/original/migrated/large/all` 为存档不变性、资源和学习状态保留、全部类型设施容量、重复加载稳定性用例。

这些检查不运行界面、浏览器、渲染器或物理模拟，不证明实际帧率或完整生态长期存活。
