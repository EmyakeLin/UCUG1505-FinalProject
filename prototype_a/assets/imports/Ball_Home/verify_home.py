import bpy, json, math, os
p='/workspace/scratch/f128404f8422/model_work/phase3_home'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=p+'/ball_home.glb')
meshes=[o for o in bpy.data.objects if o.type=='MESH']
assert len([o for o in bpy.data.objects if o.name.startswith('Sleep_Spot_') and o.type=='EMPTY'])==8
assert all(all(math.isfinite(v) for v in co.co) for o in meshes for co in o.data.vertices)
assert all(len(o.data.materials)>0 for o in meshes)
print('VALID:',len(meshes),'meshes; 8 independent sleeping spots; finite coordinates; materials present')
