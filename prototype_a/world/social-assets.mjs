// Local X/Z points in exported GLB coordinates, D=1; no extra Blender rotation.
export const SOCIAL_ASSETS={
 learning_room:{name:'学习室',note:'分享发现与经验',points:[[-2.67,1.3],[-1.25,2.72],[1.25,2.72],[2.67,1.3]],surface:/foundation|floor|ramp|perch|reading_pad/i,solid:/wall|return|bookcase|shelf|end_post|reading_table/i},
 community_plaza:{name:'社区广场',note:'相聚与互相招呼',points:[[-1.2,1.4],[1.2,1.4],[-1.4,-.5],[1.4,-.5]],surface:/foundation|surface|paving|ramp|inlay/i,solid:/plinth|landmark|planting_pod/i},
 public_forum:{name:'公共议事坪',note:'听听彼此的意见',points:[[-1.8,-1.4],[0,-2.3],[1.8,-1.4],[0,1.2]],surface:/foundation|floor|ramp|tier|disc|perch/i,solid:/$a/},
 community_kitchen:{name:'公共厨房',note:'准备与分享餐食',points:[[0,-.35],[-.9,2.1],[.9,2.1]],surface:/Kitchen_cream_plinth/i,solid:/counter|Serving_island|trough|cooker|stand|wall|return/i},
 welcome_station:{name:'伙伴迎接站',note:'迎接新来的伙伴',points:[[0,0],[-.8,1.25],[.8,1.25]],surface:/plinth|path|greeting_platform/i,solid:/soft_foot|arc_seat|low_welcome_arc|basket_(base|front|back|left|right)/i},
 repair_workshop:{name:'修理工坊',note:'准备零件与检修',points:[[0,-.2],[1.76,.38]],surface:/Foundation|Ramp|Apron|Landing|InspectionPad/i,solid:/Wall|Guide|BackStop|Workbench|Cubby|FloorPartsTray|WheelRack/i},
 quiet_garden:{name:'安静花园',note:'留一点自己的空间',points:[[1.95,2.06],[0,-1.15],[2.3,-.1]],surface:/Foundation|QuietInset|Flush_PathStone/i,solid:/CrescentBed|Border|LowBack|SoftStone/i},
 material_processing:{name:'材料加工站',note:'让原料成为零件',points:[[2.7,2.25],[.7,1.3]],surface:/foundation|floor|entrance|inlaid/i,solid:/wall|return|pedestal|Hopper|Conveyor.*frame|Press.*leg|Reservoir|Output.*(foot|rim)/i},
 energy_research:{name:'能源研究台',note:'比较、尝试与发现',points:[[-.9,2.4],[.8,.7]],surface:/foundation|floor|entrance|flush_cable/i,solid:/wall|return|cabinet|Chamber.*(cradle|collar)|sampler.*(plinth|foot)|sample_tray/i}
};

export const MEDICAL_ASSET={name:'医疗救援站',note:'药包、救援车与恢复床',points:[[-1.05,-.5],[0,3.35],[0,-1.62],[0,.4]],surface:/Foundation|Broad_entry_ramp|Entry_path|Bed_.*(low_base|cushion)/,solid:/Rear_wall|Left_wall|Right_wall|Canopy_(post|foot)|Supply_(counter|top)|Bed_.*support/};

export const CIVIC_ASSETS={
 ball_home:{name:'小球之家',note:'八个睡窝与安静的夜晚',points:[[-2.75,2.7],[-2.75,.85],[-2.75,-1],[-2.75,-2.85],[2.75,2.7],[2.75,.85],[2.75,-1],[2.75,-2.85]],surface:/Home_foundation|Level_access_ramp|Quiet_central_rug|Nest_low_base|Soft_sleep_cushion/,solid:/Front_wall|Rear_shelter_wall|Side_wall|Wall_base_trim|Nest_outer_bolster/},
 ball_restaurant:{name:'团团餐厅',note:'送食材、上班做饭、堂食与外带',points:[[-3.6,-.45],[0,-3.05],[3.35,.25],[-2.25,3.55],[-2.25,.15],[2.25,3.55],[2.25,.15]],surface:/Foundation|Entry_gentle_ramp|Floor_cushion/,solid:/Back_wall|Rear_return|Canopy_post|Preparation_counter|Serving_counter|Takeaway_counter|Low_table|Cooker_base|Dish_return_stand/}
};
