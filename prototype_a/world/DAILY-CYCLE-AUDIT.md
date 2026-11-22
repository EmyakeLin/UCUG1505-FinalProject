# 基本生活循环检查 · 2026-11-10

结论：修复餐饮生产被缺粮指令反复打断后，六组受控双日检查全部通过。每组6只小球、2880模拟秒（2个游戏日）、固定随机种子1/7/42，正常食盆3份和空食盆两种开局。

## 找到并修复的问题

world.js 的 urgent 条件把所有 go-provision/provision 都视为可打断的普通活动。当食盆不足时，正在取原料、送原料或做饭的同一只小球，每隔约2秒又被缺粮生产指令中断，再重新决定。第一次整日审查出现餐厅有原料，却没有完成烹饪和堂食的情况。

现将 provisions.working 所表示的 fetch/supply/cook 纳入正在进行的补给工作。只有“缺粮再分配”不会打断这些工作，真正的低能量/疲劳避险与夜间找床仍按现有规则处理。未改变阳光强度、神经权重、饱腹参数或生产配方。

## 可重复结果

| 开局 | 种子 | 工厂产出食物 | 完成烹饪批次 | 餐厅供餐计数 | 个体白天在阳光4D内占比 | 吃饭且两晚入睡/醒来 | 昏迷次数 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 正常开局 | 1 | 56 | 15 | 10 | 23–38% | 6/6 | 0 |
| 正常开局 | 7 | 48 | 13 | 11 | 29–39% | 6/6 | 0 |
| 正常开局 | 42 | 56 | 15 | 11 | 21–37% | 6/6 | 0 |
| 空食盆 | 1 | 60 | 9 | 4 | 25–39% | 6/6 | 0 |
| 空食盆 | 7 | 60 | 15 | 10 | 18–38% | 6/6 | 0 |
| 空食盆 | 42 | 56 | 12 | 6 | 27–39% | 6/6 | 0 |

全部36个样本个体都有真实食物摄入，两晚均入睡且日出醒来；无提前唤醒、无睡眠能量损失或疲劳增加，醒来能量1、疲劳0。没有任何个体在阳光中心附近度过多数白天，范围占比18%–39%，包括路过中心的时间，不全是驻留时间。

## 方法与适用范围

- daily-cycle-audit.mjs 从当前 world.js 提取真正的 chooseGoal/chooseSlot、恢复、进食/生产决策、找床、arrive/finish、updateCreature/collapse 等函数，不复制一份理想化的日程表。
- 导入真正的 createFoodLogistics、createProvisions，以及营养、昼夜、心情、食物生产与物品规则。包含实际作物生长/收获、推车装卸与配送、餐厅备料/做饭/用餐、饱腹与能量消耗、床位预约和夜间锁定。
- 空间服务为直线路径与运动学刚体替身；设施使用简化的节点与当前初始布局附近的交互坐标。未创建 DOM、渲染器或浏览器，也未运行 Matter 碰撞引擎。不是实际网页端到端验收。
- 社会/网络偏好、恋爱与实际救援调度未在该场景启用；八张小球之家床位与六只初始居民参与，无新增居民。因而不保证所有玩家布局、多人避让、完整认知/医疗共同运行和严冬都同样无故障。
- 另运行 inspect-social-assets.mjs：九项社会设施、小球之家、餐厅和医疗站的真实GLB交互位静态可达，医疗站推车出入口与床位通道检查通过；这也不等同于动态避让测试。

## 复现

在项目根目录运行 node prototype_a/world/daily-cycle.test.mjs，以及追加 --empty 的版本。程序使用固定随机源（包括生产控制器内部随机选择），每组完成后将结果保存到 daily-cycle-normal.json 或 daily-cycle-empty.json。测试结束恢复原Math.random。记录包括个体活动累计秒数、进食带来的饱腹增量、睡眠/醒来次数、夜间资源变化、工厂与餐厅库存及关键事件。

## 检查代码变量

audit(seed,options) 包装随机源恢复；runAudit(seed,{empty,seconds}) 创建受控世界。randomState/random 为可重复随机序列；STEP=1/30为模拟秒步长；SCALE=100为世界D到运动学坐标比例。context 为真正决策函数使用的世界服务；names/extract/world 为从源代码选择模拟函数，未执行其余界面代码。load 将生产控制器的裸模块引用改为本地数据模块。

node/models/workshop/cart/site/workSlot/beds/bowls/foodSites/deliverySites 为最小设施与交互场景；positionOf/body/MATTER 为运动学接口；creatures 为6个真实状态结构，默认能量疲劳和初始心情来自当前开局。scene 使用 Three 数学节点树，不创建渲染器。society 为明示的中性偏好替身，medical/romance 为 null。

stats/st 为每球记录；ate 为实际进食带来的饱腹增加累计（不是食物份数）；sunSeconds/daySeconds/sunDayPercent 为白天阳光内时间及占比；slept/woke/nextBedSearch 追踪夜间进入和退出；nightInterrupted/badWake/nightEnergyLoss/nightFatigueGain 为整夜规则违反计数/量；coma 为昏迷进入次数。previousStock/harvested 统计工厂真实产出；beforeNutrition/locked/oldEnergy/oldFatigue/was 记录单步前状态。events 保存模拟时间和世界播报。result/results 为用例结果与批次，file 是输出JSON路径。
