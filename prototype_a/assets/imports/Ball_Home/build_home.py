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

def kitchen(offset=(0,0,0)):
 col,root=group('Community_Kitchen',offset);z=.16
 root['asset_label']='公共厨房 / Community kitchen';root['counter_surface_above_base_D']=.45;root['counter_top_world_D']=.61;root['main_aisle_clear_D']=1.415;root['perimeter_D']='7.8 x 6.4';root['notes']='Low shared cooking and serving counters, visible cookware. Decorative cooking symbols only; no heat/fire or safety simulation.'
 roundrect('Kitchen_cream_plinth',7.8,6.4,.16,.7,(0,0,.08),'Cream')
 roundrect('Kitchen_rear_splash_wall',6.8,.23,.7,.1,(0,2.78,z+.35),'Sage',.055)
 # Rear returns stop early, leaving open rolling approaches.
 roundrect('Kitchen_left_rear_return',.23,1.55,.48,.1,(-3.35,2.12,z+.24),'Sage',.05)
 roundrect('Kitchen_right_rear_return',.23,1.55,.48,.1,(3.35,2.12,z+.24),'Sage',.05)
 roundrect('Shared_low_cooking_counter',6.1,1.12,.37,.25,(0,1.7,z+.185),'Terracotta',.045)
 roundrect('Cooking_counter_cream_top',6.23,1.23,.08,.28,(0,1.7,z+.41),'LightCream',.028)
 # Several soft inset seam details distinguish cooking furniture from planters.
 # Smooth low counter face; no tiny overlapping relief geometry.
 # Main communal cauldron, no flame or danger representation.
 cyl('Round_cooker_sage_base',.78,.12,(.05,1.7,.66),'DarkSage')
 cyl('Round_cooker_cream_inset',.65,.04,(.05,1.7,.74),'Stone')
 hollow_bowl('Shared_round_soup_pot',.69,.50,(.05,1.7,.74),'Terracotta',.085)
 torus('Pot_rim',.657,.045,(.05,1.7,1.243),'LightCream')
 cyl('Visible_soup',.595,.022,(.05,1.7,1.155),'Gold',.006)
 for i,(dx,dy) in enumerate([(-.22,.16),(.2,.17),(.07,-.25),(-.30,-.14)]):
  ball('Soup_garnish_'+str(i),(.05+dx,1.7+dy,1.18),(.10,.07,.028),'Green')
 for s in [-1,1]:
  tube('Pot_loop_handle',[(.05+s*(.64+.17*sin(pi*i/16)),1.7-.18+.36*i/16,1.09) for i in range(17)],.06,'DarkSage')
 tube('Communal_ladle_handle',[(.18,1.83,1.18),(.38,2.06,1.47),(.56,2.27,1.63)],.045,'Wood')
 hollow_bowl('Ladle_bowl',.14,.075,(.13,1.78,1.12),'Wood',.025)
 # A second lidded pot is intentionally cookware, rather than foliage.
 cyl('Small_warming_pad',.46,.07,(1.85,1.72,.625),'DarkSage')
 hollow_bowl('Small_round_pot',.43,.32,(1.85,1.72,.66),'Sage')
 ball('Domed_pot_lid',(1.85,1.72,.98),(.45,.45,.10),'LightCream')
 ball('Pot_lid_knob',(1.85,1.72,1.105),(.09,.09,.07),'DarkSage')
 for s in [-1,1]:roundrect('Small_pot_handle',.18,.15,.08,.05,(1.85+s*.46,1.72,.88),'DarkSage',.025)
 # Low prep trough on the left with recognizable cut ingredients.
 tray('Low_ingredient_trough',1.47,.77,.14,(-1.94,1.70,.62),'Sage')
 for i in range(3):
  o=ball('Carrot_piece',(-2.28+i*.28,1.62,.81),(.105,.23,.075),'Peach');o.rotation_euler.z=.25
  roundrect('Carrot_stem',.055,.12,.045,.02,(-2.28+i*.28,1.85,.835),'Green',.01)
 for i in range(3):
  roundrect('Prep_diced_food',.13,.15,.12,.03,(-2.28+i*.24,1.94,.81),'LightCream',.02)
 # Serving counter is low enough for a one-diameter ball, with broad side access.
 roundrect('Serving_island_base',2.72,.84,.25,.24,(0,-.82,z+.125),'Sage',.04)
 roundrect('Serving_island_top',2.86,.98,.07,.27,(0,-.82,z+.285),'LightCream',.025)
 for i,x in enumerate([-.85,0,.85]):
  hollow_bowl('Served_bowl_'+str(i),.29,.16,(x,-.82,.48),'Terracotta',.042)
  cyl('Bowl_food_'+str(i),.23,.02,(x,-.82,.595),'Gold',.008)
 # Side stacks of dishes are deliberate open shelves with no tall cabinetry.
 cyl('Dish_stack_stand',.36,.24,(3.1,-.18,z+.12),'Terracotta')
 for i in range(3):hollow_bowl('Stacked_ceramic_bowl_'+str(i),.2625,.14,(3.1,-.18,.39+i*.075),'LightCream',.045)
 # Simple open-air arch at the back frames the pot while keeping the top-down view open.
 tube('Kitchen_rear_open_frame',[(-1.2,2.68,.35),(-1.2,2.68,1.25)]+[(-1.2*cos(pi*i/32),2.68,1.25+.85*sin(pi*i/32)) for i in range(33)]+[(1.2,2.68,.35)],.09,'Sage')
 # Small oval medallion uses spoon and bowl geometry, not text or human signage.
 ball('Kitchen_icon_disc',(-2.46,2.62,1.04),(.36,.055,.36),'LightCream')
 tube('Kitchen_icon_spoon_handle',[(-2.46,2.545,.84),(-2.46,2.545,1.12)],.026,'Terracotta')
 ball('Kitchen_icon_spoon_head',(-2.46,2.545,1.20),(.07,.027,.11),'Terracotta')
 return col,root

def arch(name,y,span,spring,mat):
 r=span/2
 pts=[(-r,y,.26),(-r,y,spring)]+[(-r*cos(pi*i/48),y,spring+r*sin(pi*i/48)) for i in range(49)]+[(r,y,.26)]
 return tube(name,pts,.115,mat)

def welcome(offset=(0,0,0)):
 col,root=group('New_Friend_Welcome_Station',offset)
 root['asset_label']='新伙伴迎接站 / New friend welcome station';root['entry_clear_D']=2.72;root['arch_inside_width_D']=3.05;root['perimeter_D']='7.4 x 6.4';root['notes']='Open arrival plaza, friendly double arches, low greeting platform and supplies. No text, humanoid icons, navigation or spawn logic.'
 roundrect('Welcome_cream_plinth',7.4,6.4,.16,.85,(0,0,.08),'Cream')
 # A shallow recessed-color arrival carpet reads as continuous, traversable space.
 roundrect('Arrival_sage_path',2.74,5.55,.018,.65,(0,-.15,.169),'Sage',.006)
 roundrect('Low_oval_greeting_platform',3.20,2.65,.12,1.23,(0,.58,.22),'LightCream',.035)
 # Gentle broad approach wedge, not a human stair.
 vs=[(-1.25,-1.65,.175),(1.25,-1.65,.175),(1.25,-.71,.28),(-1.25,-.71,.28),(-1.25,-1.65,.16),(1.25,-1.65,.16),(1.25,-.71,.16),(-1.25,-.71,.16)]
 fs=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
 me=bpy.data.meshes.new('RampMesh');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('Broad_gentle_arrival_ramp',me);COL.objects.link(o);finish(o,o.name,'LightCream',.025)
 arch('Front_friendly_sage_arch',.30,3.30,.82,'Sage')
 arch('Rear_friendly_peach_arch',1.25,3.30,.82,'Peach')
 for x in [-1.65,1.65]:
  for y in [.30,1.25]:cyl('Arch_soft_foot',.25,.17,(x,y,.245),'LightCream')
 # Curving low seats face inward like two open arms, and stay outside the main entry.
 curved_wall('Left_low_welcome_arc',(-1.2,.1),1.70,110,250,.43,.31,.16,'Sage')
 curved_wall('Left_cream_arc_seat',(-1.2,.1),1.70,110,250,.49,.065,.47,'LightCream')
 curved_wall('Right_low_welcome_arc',(1.2,.1),1.70,-70,70,.43,.31,.16,'Terracotta')
 curved_wall('Right_cream_arc_seat',(1.2,.1),1.70,-70,70,.49,.065,.47,'LightCream')
 # Baskets at the sides contain folded supplies, never people or facial markers.
 tray('Welcome_supply_basket',.95,.78,.32,(2.66,-1.72,.16),'Terracotta')
 for i in range(3):
  o=roundrect('Folded_welcome_blanket',.65,.44,.095,.09,(2.66,-1.72,.30+i*.075),'LightCream' if i%2==0 else 'Sage',.02);o.rotation_euler.z=.08*(i-1)
 tube('Supply_basket_left_handle',[(2.21,-1.94,.45),(2.15,-1.94,.66),(2.15,-1.52,.66),(2.21,-1.52,.45)],.035,'Wood')
 tube('Supply_basket_right_handle',[(3.11,-1.94,.45),(3.17,-1.94,.66),(3.17,-1.52,.66),(3.11,-1.52,.45)],.035,'Wood')
 tray('Second_small_welcome_basket',.83,.72,.29,(-2.56,-1.83,.16),'Sage')
 for i in range(3):
  ball('Welcome_supply_roll',(-2.79+i*.23,-1.80,.45),(.10,.23,.10),'LightCream' if i!=1 else 'Peach')
 # Two small leaf-like pennants are pure abstract forms, not humanoid symbols.
 tube('Welcome_ribbon_left',[(-.42,1.25,2.40),(-.35,1.25,2.14)],.027,'Cream')
 tube('Welcome_ribbon_right',[(.42,1.25,2.40),(.35,1.25,2.14)],.027,'Cream')
 ball('Welcome_hanging_token_left',(-.35,1.25,2.06),(.105,.04,.14),'LightCream')
 ball('Welcome_hanging_token_right',(.35,1.25,2.06),(.105,.04,.14),'Sage')
 return col,root

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

OUT='/workspace/scratch/f128404f8422/model_work/phase3_home'
init()
M['Blue']=material('Home_dusky_blue',(.31,.43,.49))
M['Lavender']=material('Home_muted_lavender',(.55,.47,.58))
col,root=group('Ball_Home')
root['purpose']='Static 8-bed home. Sleep/night/status effects are not implemented.'
root['capacity']=8;root['ball_diameter_D']=1
roundrect('Home_foundation',9.2,9.6,.12,.85,(0,0,.06),'Cream',.025)
roundrect('Rear_shelter_wall',8.5,.22,2,.1,(0,4.38,1.12),'LightCream',.05)
for x in [-4.14,4.14]:
 roundrect('Side_wall',.22,8.08,1.85,.1,(x,.23,1.045),'LightCream',.05)
 # Sage base trim intentionally touches wall
 roundrect('Wall_base_trim',.28,8.08,.18,.1,(x,.23,.21),'Sage',.03)
# Front walls flank a generous doorway
for x in [-2.93,2.93]:
 roundrect('Front_wall',2.63,.22,1.85,.1,(x,-3.92,1.045),'LightCream',.05)
# Gentle entrance ramp joins floor exactly.
vs=[(-1.5,-5.98,0),(1.5,-5.98,0),(1.5,-4.78,.12),(-1.5,-4.78,.12),(-1.5,-4.78,0),(1.5,-4.78,0)]
fs=[(0,1,2,3),(0,4,5,1),(0,3,4),(1,5,2),(4,3,2,5)]
me=bpy.data.meshes.new('Ramp_mesh');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('Level_access_ramp',me);COL.objects.link(o);finish(o,o.name,'Cream',0,False)
roundrect('Quiet_central_rug',2.5,7.8,.015,.65,(0,0,.1275),'Sage',.005)
# 8 separate soft sleeping spots, entrances face the central aisle.
home_col,home_root=COL,ROOT
beds=[]
for side in [-1,1]:
 for j,y in enumerate([-2.7,-.85,1,2.85]):
  x=side*2.75;n=len(beds)+1;c,r=group('Sleep_Spot_%02d'%n);beds.append(r)
  r['capacity']=1;r['sleep_anchor']=[x,y,.45];r['approach_anchor']=[side*1.45,y,.12]
  cyl('Nest_low_base',.77,.08,(x,y,.16),'Sage',.025)
  ball('Soft_sleep_cushion',(x,y,.28),(.73,.73,.16),'Peach' if n%2 else 'Lavender')
  # outer half support leaves inner half completely open
  curved_wall('Nest_outer_bolster',(x,y),.7,-90 if side==1 else 90,90 if side==1 else 270,.12,.22,.31,'LightCream')
  ball('Small_pillow',(x+side*.35,y,.43),(.25,.43,.10),'LightCream')
COL,ROOT=home_col,home_root
# Moon-shaped amber welcome sign on front beam.
roundrect('Entrance_lintel',3.35,.25,.20,.09,(0,-3.92,2.12),'Sage',.04)
ball('Moon_sign_backplate',(0,-4.08,2.23),(.47,.08,.47),'LightCream')
# crescent outline as closed extruded 2D polygon, rather than intersecting spheres.
pts=[]
for i in range(33):
 a=math.radians(65+230*i/32);pts.append((.31*cos(a),.31*sin(a)))
for i in range(1,33):
 a=math.radians(-75-210*i/32);pts.append((.17+.26*cos(a),.26*sin(a)))
# stylized crescent can be represented by clean bevelled arc
pts3=[(.28*cos(math.radians(65+230*i/40)),-4.18,2.23+.28*sin(math.radians(65+230*i/40))) for i in range(41)]
tube('Golden_moon_arc',pts3,.075,'Gold')
# Warm protected lamps, mounted on back wall.
for x in [-1.1,1.1]:
 ball('Amber_wall_lamp',(x,4.20,1.55),(.16,.1,.22),'Gold')
# Barrel roof: distinct closed mesh shell, togglable as a complete group.
roofcol,roofroot=group('Removable_Roof');roofroot['purpose']='Hide this collection for unobstructed interior gameplay view.'
N=48;verts=[]
for y in [-4.25,4.65]:
 for offset in [0,.14]:
  for i in range(N+1):
   t=pi*i/N;verts.append((4.45*cos(t),y,1.97+(1.65+offset)*sin(t)+offset*.3))
n=N+1;faces=[]
for i in range(N):
 faces.extend([(i,i+1,2*n+i+1,2*n+i),(n+i,3*n+i,3*n+i+1,n+i+1),(i,n+i,n+i+1,i+1),(2*n+i,2*n+i+1,3*n+i+1,3*n+i)])
faces.extend([(0,2*n,3*n,n),(N,n+N,3*n+N,2*n+N)])
me=bpy.data.meshes.new('Roof_shell_mesh');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Sage_barrel_roof',me);COL.objects.link(o);finish(o,o.name,'Sage',.025)
for y in [-4.27,4.67]:
 tube('Cream_roof_edge',[(4.45*cos(pi*i/48),y,1.97+1.7*sin(pi*i/48)) for i in range(49)],.085,'LightCream')
# Clean asset export, without staging and faceless ball references.
assets=list(bpy.context.scene.objects)
bpy.ops.object.select_all(action='DESELECT')
for o in assets:o.select_set(True)
bpy.context.view_layer.objects.active=assets[0]
bpy.ops.export_scene.gltf(filepath=OUT+'/ball_home.glb',export_format='GLB',use_selection=True,export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/ball_home.blend')
report={'static_only':True,'capacity':8,'ball_diameter_D':1,'door_clear_width_D':3.23,'central_aisle_clear_D':3.96,'bed_spacing_D':1.85,'bed_diameter_D':1.54,'ramp_run_D':1.2,'ramp_rise_D':.12,'roof_collection':'Removable_Roof','mesh_count':sum(o.type=='MESH' for o in assets)}
with open(OUT+'/validation.json','w') as f:json.dump(report,f,indent=2)
env((0,-.3,1.1));scene=bpy.context.scene;scene.camera.data.ortho_scale=14.6
scene.render.resolution_x=1300;scene.render.resolution_y=1200;scene.cycles.samples=32
scene.render.filepath=OUT+'/home_exterior.png';bpy.ops.render.render(write_still=True)
# Exact same asset, roof removed only for the labeled interior preview.
for o in roofcol.objects:o.hide_render=True
scene.camera.location=Vector((11,-14,16));scene.camera.rotation_euler=(Vector((0,-.3,.4))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
preview_ball((-2.75,-.85,.87));preview_ball((2.75,1,.87));preview_ball((0,-2.6,.62))
scene.render.filepath=OUT+'/home_interior.png';bpy.ops.render.render(write_still=True)
print('HOME_DONE',report)
