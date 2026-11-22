import bpy, math, json, os
from mathutils import Vector
SCRIPT_DIR=os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(SCRIPT_DIR,'geometry_helpers.py')).read())
OUT=SCRIPT_DIR
init(); col,root=group('Ball_Restaurant')
root['asset_label']='团团餐厅 / Ball Restaurant';root['ball_diameter']=1.0
root['logic_status']='Static assets only; no cooking, eating, mood or energy logic implemented'
root['flow']='Receive ingredients > prepare > cook > serve > dine in or take away > return dishes'
roundrect('Foundation',11,9,.12,.9,(0,0,.06),'Cream')
# Open front with broad central rolling entrance; chamfered approach, no stair.
roundrect('Back_wall',10.2,.22,1.15,.10,(0,4.08,.695),'Sage')
for x in [-5,5]: roundrect('Rear_return',.22,2.6,.8,.10,(x,2.8,.52),'Sage')
# cook line top .63, rear staff lane 1.35D; front diners circulate independently.
roundrect('Preparation_counter',5.7,1.05,.42,.22,(-1.65,1.65,.33),'Terracotta')
roundrect('Preparation_worktop',5.82,1.16,.09,.24,(-1.65,1.65,.585),'LightCream')
tray('Ingredient_bin',1.25,.8,.19,(-3.6,1.65,.63),'Sage')
for i,(x,y) in enumerate([(-3.9,1.5),(-3.57,1.5),(-3.75,1.83),(-3.4,1.82)]):
 ball('Raw_food_'+str(i),(x,y,.91),(.14,.14,.14),'Peach' if i%2 else 'PaleGreen')
roundrect('Chopping_board',1.05,.75,.055,.13,(-2.1,1.65,.6575),'Wood')
for i in range(3): roundrect('Prepared_food_'+str(i),.14,.16,.11,.035,(-2.4+i*.25,1.65,.74),'Gold')
cyl('Cooker_base',.67,.10,(-.55,1.65,.68),'DarkSage')
hollow_bowl('Cooking_pot',.59,.37,(-.55,1.65,.73),'Terracotta',.07)
cyl('Soup_surface',.51,.02,(-.55,1.65,1.04),'Gold',.005)
for i in range(3):ball('Soup_garnish_'+str(i),(-.75+i*.17,1.68,1.065),(.05,.09,.018),'Green')
for s in [-1,1]:tube('Pot_handle_'+str(s),[(-.55+s*.54,1.50,.98),(-.55+s*.76,1.50,.98),(-.55+s*.76,1.80,.98),(-.55+s*.54,1.80,.98)],.04,'DarkSage')
# Serve at right end of kitchen.
roundrect('Serving_counter',1.5,1.05,.42,.22,(2.1,1.65,.33),'Sage')
roundrect('Serving_top',1.62,1.16,.09,.24,(2.1,1.65,.585),'LightCream')
for i,x in enumerate([1.7,2.4]):
 hollow_bowl('Ready_meal_bowl_'+str(i),.25,.15,(x,1.65,.63),'Terracotta',.04)
 cyl('Ready_meal_food_'+str(i),.19,.02,(x,1.65,.745),'Gold',.008)
# Separate takeaway kiosk, outside dining route.
roundrect('Takeaway_counter',1.25,2.4,.40,.25,(4.55,-.25,.32),'Terracotta')
roundrect('Takeaway_top',1.36,2.51,.08,.26,(4.55,-.25,.56),'LightCream')
for i,y in enumerate([-.85,-.1,.65]):
 roundrect('Takeaway_box_'+str(i),.70,.5,.20,.10,(4.55,y,.70),'Sage')
 roundrect('Takeaway_lid_'+str(i),.74,.54,.055,.11,(4.55,y,.8275),'LightCream')
 tube('Takeaway_handle_'+str(i),[(4.35,y,.86),(4.35,y,1.04),(4.75,y,1.04),(4.75,y,.86)],.022,'Wood')
# Dining at front; 2 tables, 4 approach cushions, central aisle 1.7 D.
for j,x in enumerate([-2.25,2.25]):
 cyl('Table_pedestal_'+str(j),.45,.32,(x,-1.85,.28),'Sage')
 cyl('Low_table_'+str(j),1.03,.10,(x,-1.85,.49),'LightCream')
 for k,dx in enumerate([-.37,.37]):
  hollow_bowl('Dining_bowl_%d_%d'%(j,k),.23,.14,(x+dx,-1.85,.54),'Terracotta',.035)
  cyl('Dining_food_%d_%d'%(j,k),.175,.015,(x+dx,-1.85,.645),'Gold',.005)
 for k,y in enumerate([-3.55,-.15]):
  cyl('Floor_cushion_%d_%d'%(j,k),.62,.10,(x,y,.17),'Peach' if j==0 else 'PaleGreen')
# Raw receiving counter behind left line, accessible from side.
tray('Raw_delivery_tray',1.1,1.0,.22,(-4.2,3.25,.12),'Sage')
# Rear canopy high enough to mark restaurant without covering readable dining area.
for x in [-4.6,3.0]:
 cyl('Canopy_post',.10,2.45,(x,3.8,1.345),'DarkSage')
roundrect('Canopy_sage_roof',8.1,1.4,.16,.60,(-.8,3.4,2.62),'Sage',.05)
roundrect('Canopy_cream_band',8.15,.19,.22,.08,(-.8,2.70,2.55),'LightCream')
# Bowl emblem on canopy frontage, open icon without text.
ball('Restaurant_sign_disc',(-.8,2.57,2.72),(.48,.07,.48),'LightCream')
tube('Sign_bowl',[(-1.08,2.48,2.75),(-1.02,2.48,2.56),(-.8,2.48,2.51),(-.58,2.48,2.56),(-.52,2.48,2.75)],.035,'Terracotta')
for x in [-.92,-.68]: tube('Sign_steam',[(x,2.48,2.83),(x-.03,2.48,2.93),(x,2.48,3.03)],.022,'Sage')
# Tray return at front left, kept outside main approach.
roundrect('Dish_return_stand',.95,.8,.28,.18,(-4.48,-2.2,.26),'Sage')
tray('Dish_return_tray',1.0,.85,.14,(-4.48,-2.2,.40),'LightCream')
root['counter_top_D']=.63;root['main_entrance_clear_D']=2.44;root['staff_lane_clear_D']=1.74
# Broad shallow ramp across the main entrance, no upward lip.
vs=[(-1.22,-5.15,0),(1.22,-5.15,0),(1.22,-4.5,.12),(-1.22,-4.5,.12),(-1.22,-4.5,0),(1.22,-4.5,0)]
fs=[(0,1,2,3),(0,4,5,1),(0,3,4),(1,5,2),(3,2,5,4)]
me=bpy.data.meshes.new('EntryRampMesh');me.from_pydata(vs,[],fs);me.update()
o=bpy.data.objects.new('Entry_gentle_ramp',me);col.objects.link(o);finish(o,o.name,'Cream',0,smooth=False)
# Export only asset meshes and root, then presentation.
bpy.context.view_layer.update()
report=metrics(col)
report['static_only']=True
report['notes']='Structural surface contacts and joined cookware are intentional; no exhaustive physics collision verification.'
bpy.ops.object.select_all(action='DESELECT')
for o in col.all_objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=OUT+'/ball_restaurant.glb',export_format='GLB',use_selection=True,export_apply=True)
env((0,0,.8));bpy.context.scene.camera.data.ortho_scale=15.5
bpy.context.scene.render.resolution_x=1400;bpy.context.scene.render.resolution_y=1200;bpy.context.scene.cycles.samples=32
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/ball_restaurant.blend')
bpy.context.scene.render.filepath=OUT+'/restaurant_preview.png';bpy.ops.render.render(write_still=True)
with open(OUT+'/validation.json','w') as f:json.dump(report,f,ensure_ascii=False,indent=2)
print('REPORT',report)
