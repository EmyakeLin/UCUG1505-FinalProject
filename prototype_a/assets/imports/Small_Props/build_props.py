import bpy, math, os, json
from mathutils import Vector
from math import sin, cos, pi
OUT='/workspace/scratch/f128404f8422/model_work/social_batch/services'
COL=None; ROOT=None; M={}

def material(name, color, rough=.62):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
 return m

def init():
 global M
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for c in list(bpy.data.collections):
  if c.name!='Collection' and not c.objects: bpy.data.collections.remove(c)
 M={k:material('SS_'+k,v) for k,v in {'Cream':(.76,.71,.59),'LightCream':(.9,.84,.69),'Sage':(.42,.49,.33),'DarkSage':(.23,.31,.23),'Terracotta':(.69,.37,.25),'Peach':(.82,.52,.37),'Gold':(.9,.65,.24),'Soup':(.7,.4,.1),'Wood':(.44,.27,.13),'Green':(.34,.46,.22),'PaleGreen':(.62,.69,.40),'Stone':(.53,.52,.42),'Backdrop':(.74,.72,.65),'ReferenceBall':(.89,.84,.72)}.items()}

def group(name, location=(0,0,0)):
 global COL,ROOT
 COL=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(COL)
 ROOT=bpy.data.objects.new(name+'_ROOT',None);COL.objects.link(ROOT);ROOT.location=location;ROOT['unit']='Ball diameter D = 1';ROOT['purpose']='Visual direction only. No game logic or interaction implementation.'
 return COL,ROOT

def finish(o,name,mat,bev=0,smooth=True):
 o.name=name
 for c in list(o.users_collection): c.objects.unlink(o)
 COL.objects.link(o);o.parent=ROOT
 if mat: o.data.materials.append(M[mat])
 if smooth and o.type=='MESH':
  for p in o.data.polygons:p.use_smooth=True
 if bev:
  b=o.modifiers.new('Soft molded edges','BEVEL');b.width=bev;b.segments=3
  n=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');n.keep_sharp=True
 if o.type=='MESH' and not o.data.uv_layers:
  uv=o.data.uv_layers.new(name='UVMap')
  for poly in o.data.polygons:
   for idx in poly.loop_indices:
    co=o.data.vertices[o.data.loops[idx].vertex_index].co
    ax=max(range(3),key=lambda i:abs(poly.normal[i]));uv.data[idx].uv=(co[(ax+1)%3]*.15+.5,co[(ax+2)%3]*.15+.5)
 return o

def roundrect(name,w,d,h,r,loc,mat,bevel=.035):
 r=min(r,w/2-.0001,d/2-.0001)
 xy=[]
 for cx,cy,a in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
  for i in range(9):
   t=math.radians(a+i*90/8);xy.append((cx+r*cos(t),cy+r*sin(t)))
 n=len(xy);vs=[(x,y,z) for z in [-h/2,h/2] for x,y in xy];fs=[tuple(reversed(range(n))),tuple(range(n,2*n))]
 fs += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 me=bpy.data.meshes.new(name+'Mesh');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);o.location=loc;COL.objects.link(o)
 return finish(o,name,mat,bevel)

def cyl(name,rad,depth,loc,mat,bevel=.025,vertices=64):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=rad,depth=depth,location=loc)
 return finish(bpy.context.object,name,mat,bevel)

def ball(name,loc,scale,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,radius=1,location=loc);o=bpy.context.object;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 return finish(o,name,mat)

def tube(name,pts,r,mat):
 cu=bpy.data.curves.new(name+'Curve','CURVE');cu.dimensions='3D';cu.resolution_u=2;cu.bevel_depth=r;cu.bevel_resolution=4;cu.use_fill_caps=True
 sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new(name,cu);COL.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False)
 return finish(o,name,mat)

def torus(name,major,minor,loc,mat,rot=(0,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=12,location=loc,major_radius=major,minor_radius=minor,rotation=rot)
 return finish(bpy.context.object,name,mat)

def hollow_bowl(name,rad,height,loc,mat,thickness=.065):
 # Lathed bowl with a continuous rim, inner surface and underside.
 profile=[(.02,.025),(rad*.48,.025),(rad*.79,height*.12),(rad*.94,height*.48),(rad,height*.90),(rad*.995,height), (rad-thickness,height+.006),(rad-thickness*1.1,height*.87),(rad*.79,height*.31),(rad*.49,thickness+.025),(.02,thickness+.025)]
 vs=[];N=64
 for rr,z in profile:
  vs.extend([(rr*cos(i*2*pi/N)+loc[0],rr*sin(i*2*pi/N)+loc[1],z+loc[2]) for i in range(N)])
 fs=[]
 for j in range(len(profile)-1):
  for i in range(N):a=j*N+i;b=j*N+(i+1)%N;fs.append((a,b,b+N,a+N))
 fs.append(tuple(reversed(range(N))));fs.append(tuple(range((len(profile)-1)*N,len(profile)*N)))
 me=bpy.data.meshes.new(name+'Mesh');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);COL.objects.link(o)
 return finish(o,name,mat)

def curved_wall(name,center,radius,start,end,width,height,z,mat):
 N=48;vs=[]
 for h in [z,z+height]:
  for r in [radius-width/2,radius+width/2]:
   for i in range(N+1):
    a=math.radians(start+(end-start)*i/N);vs.append((center[0]+r*cos(a),center[1]+r*sin(a),h))
 n=N+1;fs=[]
 for i in range(N):
  fs += [(i,i+1,n+i+1,n+i),(2*n+i,3*n+i,3*n+i+1,2*n+i+1),(i,2*n+i,2*n+i+1,i+1),(n+i,n+i+1,3*n+i+1,3*n+i)]
 fs += [(0,n,3*n,2*n),(N,2*n+N,3*n+N,n+N)]
 me=bpy.data.meshes.new(name+'Mesh');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);COL.objects.link(o)
 return finish(o,name,mat,min(width*.23,.06))

def tray(name,w,d,h,loc,mat):
 x,y,z=loc
 roundrect(name+'_base',w,d,.07,.18,(x,y,z+.035),mat,.025)
 roundrect(name+'_back',w,.11,h,.05,(x,y+d/2-.055,z+h/2),mat,.035)
 roundrect(name+'_front',w,.11,h,.05,(x,y-d/2+.055,z+h/2),mat,.035)
 roundrect(name+'_left',.11,d-.12,h,.05,(x-w/2+.055,y,z+h/2),mat,.035)
 roundrect(name+'_right',.11,d-.12,h,.05,(x+w/2-.055,y,z+h/2),mat,.035)

def env(target=(0,0,.65),combined=False):
 global COL,ROOT
 group('PRESENTATION_ONLY')
 roundrect('Neutral_ground',200,200,.15,1,(0,0,-.14),'Backdrop',.01)
 world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.76,.78,.71,1);world.node_tree.nodes['Background'].inputs[1].default_value=.65
 def area(n,loc,power,size):
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=n;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
 area('Large_softbox',(-6,-9,13),1500,9);area('Warm_fill',(8,-2,8),650,8);area('Rim_softbox',(2,8,12),1000,8)
 bpy.ops.object.camera_add(location=Vector(target)+Vector((11,-15,12 if combined else 11)))
 cam=bpy.context.object;cam.name='Preview_camera';cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=19.4 if combined else 10.8;bpy.context.scene.camera=cam
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=False;scene.render.resolution_x=1600 if combined else 1200;scene.render.resolution_y=1050 if combined else 1100;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
 scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.render.threads_mode='FIXED';scene.render.threads=4

def preview_ball(loc):
 global COL,ROOT
 group('PREVIEW_ONLY_SCALE_REFERENCE')
 o=ball('TEMPORARY_FACELESS_BALL_D1',loc,(.5,.5,.5),'ReferenceBall');o['preview_only']=True;return o

def metrics(col):
 bpy.context.view_layer.update();pts=[]
 for o in col.all_objects:
  if o.type=='MESH':pts += [o.matrix_world@Vector(v) for v in o.bound_box]
 mi=[min(p[i] for p in pts) for i in range(3)];ma=[max(p[i] for p in pts) for i in range(3)]
 return {'bounds_min':[round(x,3) for x in mi],'bounds_max':[round(x,3) for x in ma],'dimensions_D':[round(ma[i]-mi[i],3) for i in range(3)],'mesh_objects':sum(o.type=='MESH' for o in col.all_objects),'all_meshes_have_UV':all(bool(o.data.uv_layers) for o in col.all_objects if o.type=='MESH'),'all_meshes_have_material':all(bool(o.data.materials) for o in col.all_objects if o.type=='MESH')}

OUT=os.path.dirname(os.path.abspath(__file__))
init()
M['Blue']=material('Care_blue',(.33,.58,.63));M['Teal']=material('Deep_teal',(.16,.34,.35))
roots=[]; collections=[]
def new(name):
 c,r=group(name);roots.append(r);collections.append(c);r['origin']='Ground center; D=1 ball diameter';return r
# Golden energy case with pulse badge and grasp loop.
new('Energy_Rescue_Kit')
roundrect('Energy_case',.88,.62,.38,.15,(0,0,.19),'Gold',.035)
roundrect('Energy_lid',.92,.66,.075,.16,(0,0,.4175),'LightCream',.02)
tube('Energy_handle',[(-.22,0,.455),(-.22,0,.61),(.22,0,.61),(.22,0,.455)],.035,'DarkSage')
roundrect('Energy_front_badge',.42,.025,.22,.06,(0,-.325,.23),'LightCream',.008)
tube('Energy_pulse',[(-.16,-.344,.23),(-.07,-.344,.23),(-.025,-.344,.3),(.025,-.344,.16),(.075,-.344,.23),(.16,-.344,.23)],.018,'Teal')
for x in [-.30,.30]:roundrect('Energy_latch',.09,.035,.12,.025,(x,-.345,.39),'DarkSage',.01)
# Rest care pack: folded blanket with pillow, carry straps and moon token.
new('Rest_Care_Kit')
for i in range(3):roundrect('Blanket_fold_'+str(i),.92,.58,.095,.13,(0,0,.0475+i*.083),'Blue',.025)
for x in [-.29,.29]:roundrect('Blanket_wrap_strap',.09,.605,.295,.03,(x,0,.1475),'LightCream',.012)
ball('Care_soft_pillow',(0,.02,.36),(.29,.21,.095),'LightCream')
tube('Care_handle',[(-.20,.16,.31),(-.20,.16,.54),(.20,.16,.54),(.20,.16,.31)],.026,'DarkSage')
ball('Care_badge',(0,-.314,.15),(.115,.018,.10),'Teal')
ball('Care_badge_star',(0,-.335,.16),(.038,.012,.038),'Gold')
# Stretcher trolley, wheels on ground. Main bed width fits one ball.
new('Stretcher_Trolley')
roundrect('Cart_chassis',1.48,1.65,.12,.27,(0,0,.33),'DarkSage',.03)
for x in [-.64,.64]:
 for y in [-.57,.57]:
  o=cyl('Wheel',.22,.16,(x,y,.22),'Teal',.025,32);o.rotation_euler.y=pi/2
  o=cyl('Wheel_hub',.085,.17,(x,y,.22),'LightCream',.015,24);o.rotation_euler.y=pi/2
roundrect('Stretcher_mattress',1.35,1.52,.18,.33,(0,0,.48),'Blue',.04)
for x in [-.65,.65]:tube('Stretcher_guard',[(x,-.58,.55),(x,-.58,.80),(x,.58,.80),(x,.58,.55)],.04,'LightCream')
roundrect('Stretcher_pillow',1.05,.34,.13,.14,(0,.47,.62),'LightCream',.03)
tube('Tow_bar',[(0,-.77,.34),(0,-1.15,.44)],.055,'DarkSage')
torus('Tow_ring',.20,.045,(0,-1.33,.44),'Gold')
# Sealed bento box, contrasting lid, reusable band, spoon graphic.
new('Takeaway_Meal_Pack')
roundrect('Meal_box',.96,.74,.27,.20,(0,0,.135),'Terracotta',.035)
roundrect('Meal_lid',1.00,.78,.075,.21,(0,0,.3075),'LightCream',.02)
roundrect('Meal_band',.17,.80,.36,.035,(0,0,.18),'Sage',.015)
# raised bowl icon on top to distinguish meal from medicine
ball('Meal_bowl_icon',(-.27,-.02,.358),(.13,.10,.018),'Terracotta')
tube('Meal_spoon_icon',[(.22,-.16,.36),(.22,.10,.36)],.018,'Terracotta');ball('Spoon_head',(.22,.15,.36),(.038,.06,.016),'Terracotta')
roundrect('Meal_pull_tab',.13,.12,.04,.04,(.32,-.43,.30),'Sage',.012)
# Smaller soft-shaped snack container with bright contrasting seal and biscuit motif.
new('Takeaway_Snack_Pack')
roundrect('Snack_pouch',.57,.42,.48,.14,(0,0,.24),'Peach',.04)
roundrect('Snack_top_seal',.61,.11,.075,.045,(0,0,.5175),'Gold',.015)
roundrect('Snack_bottom_seam',.55,.40,.035,.12,(0,0,.025),'Terracotta',.01)
ball('Snack_cookie_badge',(0,-.228,.28),(.13,.02,.13),'LightCream')
for x,z in [(-.05,.31),(.045,.31),(0,.23)]:ball('Snack_cookie_dot',(x,-.252,z),(.018,.01,.018),'Terracotta')
# Save each asset at ground origin, then layout combined editable scene.
report={'D':1,'static_only':True,'assets':{}}
for c,r in zip(collections,roots):
 bpy.ops.object.select_all(action='DESELECT')
 for o in c.all_objects:o.select_set(True)
 bpy.context.view_layer.objects.active=r
 bpy.ops.export_scene.gltf(filepath=OUT+'/'+r.name.replace('_ROOT','')+'.glb',export_format='GLB',use_selection=True,export_apply=True)
 report['assets'][r.name]=metrics(c)
positions=[(-1.85,1,0),(-.45,1,0),(1.45,.55,0),(-1.55,-.70,0),(-.1,-.75,0)]
for r,p in zip(roots,positions):r.location=p
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/ball_world_small_props.blend')
with open(OUT+'/validation.json','w') as f:json.dump(report,f,indent=2)
env((0,0,.25));scene=bpy.context.scene;scene.camera.data.ortho_scale=6.2
scene.camera.location=(6,-9,9);scene.camera.rotation_euler=(Vector((0,0,.25))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.cycles.samples=32
scene.render.filepath=OUT+'/small_props_preview.png';bpy.ops.render.render(write_still=True)
print('DONE',report)
