# 食物工坊：出货口终端修正版 v5

本版仅修出货口绿色围挡与陶土槽外侧端部的刺入式轮廓，调整实际局部几何和接合边，而非仅改着色。逐对象几何和变换校验确认：仅 Integrated green perimeter and terracotta dispatch wall 改变；盆、叶、垫、底座、槽床、缓坡、根与七个接口保持不变。未修改推车和4D食盆。

## 正式文件
- source/building_food_workshop_dispatch_v5.blend：干净空工坊，无灯光、相机、舞台和食物。
- models/building_food_workshop_dispatch_v5.glb：20个网格。
- models/building_food_workshop_dispatch_v5_display.glb：29个网格，含9个可独立移除展示果实。
- validation/workshop_validation.json：实际GLB重导入检查。
- validation/workshop_preserved_geometry_validation/workshop_validation.json：修改范围校验。
- validation/workshop_self_intersections_diagnosis.json、validation/workshop_coplanar_self_overlap.json、validation/workshop_exact_cross_intersections.json：世界空间求值后网格相交诊断。
- validation/workshop_export_manifest.json：源文件SHA256及展示果实来源。

## 验证与边界
D=1场景单位；实测外包8.420×6.930×3.580D。根位于原点，旋转为零，缩放为一。所有网格UV和有限坐标通过，未导出相机/灯光。

融合壳非共顶点三角面检查：非共面有长度交线0，共面投影重叠面积大于1e-8的面组0。此检查不等同于全场景无碰撞：槽床/围挡、槽床/坡、底座/坡保留内部埋接交线，详见诊断JSON。外侧及正面预览已检查端部轮廓；没有进行动态渲染闪烁、运行时物理、导航、自动生产或装卸验证。接口仍只是位置标记，Work_R不是已验证的小球站位。

## 展示果实
完整复用上一最终展示版的9颗已调整果实，位置未变。仍仅有两颗果与叶局部相交：Left fruit 1与Left broad leaf 4（100组三角相交）；Right fruit 3与Right broad leaf 2/4（10/159组）。这不是穿透深度或体积。其余果实与结构无相交。空模型不含果实，可自行替换运行时食物。果实保留原0.87的Z压扁比，未重生成。

普通PBR材质，无烘焙光晕或阴影。原先尺寸/通道假设不作为本版验收条件。
