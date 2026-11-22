# UCUG1505 生活分析变量

本页记录独立分析功能的项目变量。时间为模拟秒，D 为小球直径；导出时间是 ISO 时间戳。文件是工程说明，不是 design diary。

## analysis-rules.mjs

| 作用域 / 变量 | 含义 |
| --- | --- |
| ACTIVITY_NAMES / ACTION_NAMES / OUTPUT_NAMES / INPUT_NAMES | 12 类实际生活活动、6 类网络行动、5 个预测变化与 24 个输入的显示名称 |
| finite / nonnegative: value | 有限数值与非负数值判定，用于导入和计时边界 |
| activityOf: creature / action / mode | 当前居民、原行为状态与社会任务类型；将逐帧状态归到可阅读活动类别 |
| recordLife: creature / seconds / time | 被采样的居民、经过的物理步秒数与当前模拟时刻；无时间经过不计时 |
| record / brain.observation | 居民的生活记录；since 为开始记录时刻，total 为累计观察秒数，activities 为分类累计，objects 为对象相关累计，recent 为有界活动轨迹 |
| activity / object / previous | 本步生活类别、互动伙伴/经历对象/目标设施 ID、最近一段同类同对象轨迹；连续段合并，变化时新增 |
| recent item.activity / object / start / end / seconds | 一段活动的类别、目标 ID（可空）、开始/结束时刻与累计实际时间；最多 120 段 |
| validateSnapshot: data / clean / ids / resident / brain | 输入快照、经过 JSON 拷贝并验证的分析数据、已占用居民索引、遍历中的居民及大脑；不改变源数据 |
| key / value / minimum / memory / episode | 遍历心情字段或活动键、被检查的值、愉悦允许 -1 其余心情最低 0、对象记忆、保留经历 |
| observation / totalActivities / tolerance / item / objects / object | 导入的活动记录、活动秒数合计、相对 1e-6 的浮点容差、近期轨迹项、对象 ID 去重集合及当前对象 |
| clean.type / version / time / exportedAt / residents / objects | 快照类型标识、版本 1、模拟时刻、导出时刻、全体居民数据与对象目录；旧权重格式给出明确错误 |
| resident.index / name / color / energy / fatigue / mood / company / action / brain | 居民稳定索引、名字、模型颜色、能量、疲劳、四维心情、近处是否有同伴、当前行动、完整可序列化脑状态 |
| objectsFor: snapshot / resident / objects / id / object | 当前快照、被分析居民、可选对象列表、记忆对象 ID、目录候选；排除自己并补充目录中缺失的旧对象 |
| defaultAction: object | 根据对象类与建筑类型给试算选择一个初始动作；用户可更改，不宣称设施支持任意动作 |
| evaluateObject: resident / object / action / standard / memory | 被分析小球、具体对象、六类试算动作、是否统一状态、对象记忆；没有记忆时返回 null |
| body / input / prediction / score | 当前或统一身体状态、经原 inputVector 生成的输入、原 predict 得到的五项输出、原 learnedValue 得到的需求加权值 |
| evidence / self / matched / actual | 对象的保留经历、其中亲身经历、其中动作类别相同的亲身经历、五项实际目标均值（无匹配数据则 null） |
| _ / index / sum / episode | 平均计算中未使用标签、输出维度序号、累计目标值、遍历经历；绝不将观察/转述并入亲身均值 |
| habitRows: resident / observation / key / seconds / a / b | 居民记录、分类键、分类累计时间、排序比较项；返回 name、seconds、fraction，按累计时长降序 |
| inputSensitivity: resident / evaluation / name / index / low / high / minimum | 分析主体、当前试算、输入名称/序号、上下扰动输入、合法输入下界；仅测试前六个连续身体/心情输入 |
| before / after / span / change / value / output | 原网络在下上扰动的预测、实际扰动跨度、折算每 +0.1 输入的五维变化、预测值及输出序号；不训练网络 |

## analysis-bridge.js / world.js / cognition.mjs

| 作用域 / 变量 | 含义 |
| --- | --- |
| ANALYSIS_HTML | 打包器嵌入的独立页面模板，保留一次 ANALYSIS_SEED 标记以注入具体快照 |
| createAnalysisBridge.api | 世界居民、建筑、目录、位置函数与模拟时刻函数，只读接口 |
| openButton / exportButton / notice | 世界的打开分析、导出生活快照按钮及操作反馈文本 |
| snapshot: residents / creature / point / company / other / nearby | 居民完整快照列表、当前居民、当前位置、2.4D 内是否有同伴、比较居民及其位置；与社会体验输入的邻近口径一致 |
| objects / record / definition / suffix | 具名建筑和居民目录、建筑实例、建造目录条目、初始标记或实例序号；同类型建筑可以单独选择 |
| page / data / seed / html | 新页面窗口、点击时采集的数据、转义小于号后的 JSON、注入快照后的完整离线 HTML；窗口被拦截时提供文件导入替代 |
| blob / url / link / error | 完整快照 JSON Blob、10 秒后回收的下载 URL、临时下载链接、打开/导出失败原因 |
| world.recordLife(creature,STEP,time) | 每次实际物理步在居民状态更新后采样；暂停和隐藏页面不推进物理步，因此不新增时间 |
| world.createAnalysisBridge | 场景与居民初始化完毕后绑定两个新按钮，不取代原纯权重导出 |
| cognition.actionClass: mode | 从 society.js 提取的原有六类动作映射，游戏与分析共用；网络尺寸、学习率和训练算法未改 |

## analysis-page.js

| 作用域 / 变量 | 含义 |
| --- | --- |
| byId: id | 页面 ID 查找函数 |
| residentList / targetSelect / actionSelect / contextSelect | 居民导航容器、具体对象、行动类别、当前/统一状态选择器 |
| sourceNames / experienceNames | 经历来源与实际行为名称字典；亲身/观察/转述分别标注 |
| snapshot / residentIndex / targetObjects / evaluation / importTicket | 当前验证后快照、所选居民索引、可选对象目录、当前预测与证据、异步文件读取序号（防旧读取覆盖新选择） |
| node: tag / text / className / element | 创建带文本与类名的节点；导入的数据只写 textContent，不作为 HTML 执行 |
| signed: value / percent: value / duration: seconds / timestamp: seconds | 有符号三位小数、百分比或未记录、易读时长与模拟时刻格式 |
| resident / selectedObject: item | 获取当前居民或对象的列表比较项 |
| status: message / error | 页首加载、导入或错误提示，错误不清空已载入的有效快照 |
| objectName: id / object | 为轨迹中的对象 ID 查找名字，找不到则保留 ID，不虚构身份 |
| renderOutcomes: container / values / fragment / name / index / item / value / fill / width / start | 五维预测/历史结果容器、数值、批量节点、标签/序号、克隆模板、当前值、条形填充、最大 50% 的半轴宽、零轴左右起点 |
| renderResidents: creature / button / swatch / validColor / color | 居民导航项与模型色块，颜色只允许合法 24 位整数；选择后刷新相应分析内容 |
| renderResident: creature / brain / button / partner / stats / label / value / item | 所选居民、大脑、导航按钮、现有恋人、身体/更新/经历统计、统计标签/值/节点 |
| rows / observation / row / head / track / fill / short | 时长占比结果、观察记录、单项类别、类别与数值行、背景轨道、填充、观察不足 60 秒的提示条件 |
| previousTarget / preferred / kind / group / object / known / option | 保留的对象选择、有效的优先对象、建筑/居民分组、分组节点、目录对象、是否有认知记忆、选项节点 |
| familiar / memory / seconds / detail | 亲身次数排序后的前六个熟悉对象、累计记忆、对象相关时间（含前往）及显示摘要 |
| recent / entry / target / label | 当前最多 120 段活动轨迹、每段节点、对象名称后缀、活动名称；最新在前 |
| chooseTarget.object | 对象变更时重设合理的初始试算动作，再更新预测 |
| renderRelations: creature / object / box / other / relation / reverse / mutual / shared / dates | 分析主体/对象、关系区域、目标居民、正反关系、是否互为恋人、有效互动与约会秒数；不把关系字段当作网络输出 |
| renderTarget: creature / object / standard / message / qualified / positive / negative / expectation / headline / source | 试算对象与状态选择、空状态、至少三次亲身经历条件、需求加权值 ±0.12 的描述阈值、预期文案与依据；0 次亲身经历加初步猜测标记 |
| episode / entry / action / targets / name / index | 对象经历行、实际动作和五维目标文本；间接经历前两维写未观察 |
| renderSensitivity: container / table / head / header / label / body / item / row / value | 局部敏感性表及六输入、五输出单元格，未知对象只显示缺少数据 |
| renderWeights: brain / first / values / hidden / columns / rows / label / rowIndex / source / column | 当前脑、是否第一层、权重数组、隐藏单元标签、列和行定义、当前标签与索引；不将不同隐藏单元解释成人格 |
| table / head / header / body / row / value / cell / strength / lightness / hue | 权重表节点、当前完整数值、颜色饱和强度、HSL 亮度和蓝/橙色相；色域 ±0.5，不修改真实值 |
| load: data / label / clean / exists / item | 待读取数据、来源名称、验证后的快照、旧选择是否仍有效及比较居民；无效文件不替换原数据 |
| import handler: event / file / ticket / text / error / retained | 文件输入事件、选定文件、此次读取序号、JSON 文本、导入错误、是否提示已保留旧数据；文件上限 16MB |
| export handler: blob / url / link | 当前完整快照的重新导出，临时 URL 在 10 秒后释放 |
| seed / error | 页面内携带的初始快照或解析失败原因；独立空页面 seed 为 null |

## analysis.template.html 与 build.mjs

| 样式变量 / 构建变量 | 含义 |
| --- | --- |
| --paper / --surface / --ink / --muted / --line / --green / --warm / --negative | 延续世界的浅纸色、面板、文字、辅助文字、边界、预测/强调、历史实际、负值颜色 |
| --gap / --radius / --motion | 常规 20px 组件间距、18px 面板圆角、180ms 属性过渡；小屏缩距，减少动态偏好关闭过渡 |
| --page-width / --sidebar | 页面最大 1240px、居民侧栏 220px（中屏 180px）；640px 以下改上下排列 |
| --bar-width / --bar-start / --resident-color | 各类条形长度、正负预测的起始位置、居民色块颜色，由所属组件赋值 |
| outcome-template | 五维预测和历史实际共用的完整条形组件，标签/精确文本/零轴/正负填充同源 |
| analysisImports / analysisHTML / analysisOutput | 独立页面只需 cognition 与 analysis-rules 的离线导入映射、嵌入模块后的文档、life-analysis.html 输出路径 |
| imports.analysis-document / analysis-bridge / analysis-rules | 世界内嵌的分析模板模块、按钮适配模块与纯规则模块；analysis-rules 的本地 cognition 导入在打包时转为同一导入映射名称 |
| escapeScript | HTML 内嵌代码的结束标签转义，世界与分析文档共用 |

## 纯数据检查

analysis-rules.test.mjs 的 makeResident/index、first/second、visible、place/friend、input、noTime、frozen、actual/standard、data/clean、bad/badTime/badIdentity 为合成居民、视觉输入、对象、计时前状态、只读前快照、试算结果及合法/非法导入样本。它们只用于数据规则验证，不作为页面里的演示居民或真实生活证据。


## 三期扩展

activityOf 读取 creature.provisionMode，将 dine/eat-carried 归入 food，share 归入 community，其他餐饮处理归入 work；recordLife 的对象优先取 provisionTarget，然后 medicalTarget / health.clinic。coma 单独累计，dead 停止生活计时。桥接快照增加 inventory 和 health、environment；mood 保留新增 comfort。快照仍只读，既有 24 输入、20 隐藏、5 输出网络不变。
