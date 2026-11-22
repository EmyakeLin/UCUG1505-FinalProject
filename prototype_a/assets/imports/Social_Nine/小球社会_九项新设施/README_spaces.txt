小球社会 · 已确认公共空间静态资产

比例：1 Blender / glTF 单位 = 小球直径 D。三项保持获确认的方向造型。

干净 .blend 源文件只含对应建筑集合、ROOT 与网格，保留圆角修改器供继续编辑。
GLB 仅导出建筑；排除黄色比例球、摄影机、灯光和背景。全部已清场后实际重导入 Blender 4.3.2 验证。

学习室：9.000 × 7.605 × 1.880 D（含入口缓坡）；92 个网格、1 个根对象。
  可编辑源：source/learning_room.blend
  静态模型：models/learning_room.glb

社区广场：10.000 × 10.505 × 2.150 D（含入口缓坡）；19 个网格、1 个根对象。
  可编辑源：source/community_plaza.blend
  静态模型：models/community_plaza.glb

公共议事坪：10.000 × 10.505 × 0.820 D（含入口缓坡）；15 个网格、1 个根对象。
  可编辑源：source/public_forum.blend
  静态模型：models/public_forum.glb

UV、材质、单位缩放、根层级与排除对象检查均通过。详细结果见 validation/spaces_approved_assets_summary.json。
这些是静态建筑模型，尚未实现碰撞、寻路、互动、学习、集会、议事或任何运行时社会行为。
预览PNG中的黄色临时比例球仅用于展示尺度，不是干净资产的一部分。
