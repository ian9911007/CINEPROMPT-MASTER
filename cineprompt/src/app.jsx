const { useEffect, useMemo, useRef, useState } = React;

const library = window.CINEPROMPT_LIBRARY;
const compiler = window.CinePromptCompiler;
const storageMigration = window.CinePromptStorageMigration;
const exportApi = window.CinePromptExport;
const STORAGE_KEY = storageMigration.STORAGE_KEY;

const SINGLE_FIELDS = [
    ['capture_system', '攝影機', 'Camera'],
    ['capture_medium', '拍攝媒介', 'Disc'],
    ['primary_lens', '鏡頭', 'Focus'],
    ['field_of_view', '焦距', 'Scan'],
    ['aperture_depth_of_field', '光圈', 'Aperture'],
    ['shutter_speed', '快門', 'Timer'],
    ['focus_behavior', '焦點與焦平面', 'Crosshair'],
    ['iso_sensitivity', 'ISO 感光度', 'Gauge'],
    ['exposure_compensation', '曝光補償', 'Sun'],
    ['shot_size', '景別', 'Frame'],
    ['shot_purpose', '鏡頭用途', 'Clapperboard'],
    ['subject_arrangement', '主體配置', 'Users'],
    ['subject_orientation', '主體朝向', 'Compass'],
    ['camera_height', '機位高度', 'ArrowUpDown'],
    ['camera_pitch', '鏡頭俯仰', 'ArrowUpRight'],
    ['camera_roll', '鏡頭滾轉', 'RotateCw'],
    ['camera_position', '相機位置', 'MapPin'],
    ['camera_distance', '相機距離', 'Ruler'],
    ['projection', '投影方式', 'Orbit'],
    ['imaging_modality', '成像模態', 'Microscope'],
    ['white_balance', '白平衡與色溫', 'Thermometer'],
    ['color_response', '色彩反應', 'Palette'],
    ['film_sensor_character', '底片與感光元件特性', 'Film'],
    ['film_process', '底片沖印流程', 'FlaskConical'],
    ['aspect_ratio', '畫面比例', 'Monitor']
];

function multiCategories(groupId, fallback) {
    const configured = library.ui_category_groups && library.ui_category_groups[groupId];
    return (configured ? configured.categories : fallback).filter((category) => library.categories[category] && library.categories[category].selection_mode === 'multi');
}

const MULTI_GROUPS = [
    { id: 'lens_optics', label: '鏡頭特性與濾鏡', icon: 'Sparkles', categories: multiCategories('lens_optics', ['lens_character', 'optical_distortion', 'optical_filter']), limit: 3, tone: 'text-[#61f7f7]', border: 'border-cyan-500/25' },
    { id: 'photographic_technique', label: '攝影手法', icon: 'Wand2', categories: multiCategories('photographic_technique', ['photographic_technique', 'camera_movement']), limit: 4, tone: 'text-[#5e98f9]', border: 'border-sky-500/25' },
    { id: 'composition', label: '構圖', icon: 'LayoutGrid', categories: multiCategories('composition', ['composition']), limit: 4, tone: 'text-[#5e98f9]', border: 'border-indigo-500/25' },
    { id: 'lighting', label: '燈光', icon: 'Lightbulb', categories: multiCategories('lighting', ['lighting_pattern', 'light_direction', 'light_quality', 'exposure_character']), limit: 5, tone: 'text-[#5e98f9]', border: 'border-amber-500/25' },
    { id: 'color_grading', label: '色彩與調色', icon: 'Palette', categories: multiCategories('color_grading', ['color_grade']), limit: 3, tone: 'text-[#5e98f9]', border: 'border-rose-500/25' },
    { id: 'image_character_effects', label: '影像質感與效果', icon: 'Sliders', categories: multiCategories('image_character_effects', ['grain_noise', 'highlight_behavior', 'image_character', 'post_visual_effect', 'creative_preset']), limit: 4, tone: 'text-[#5e98f9]', border: 'border-violet-500/25' }
];

const PRIMARY_FIELDS = ['capture_system', 'primary_lens', 'field_of_view', 'aperture_depth_of_field', 'shutter_speed'];
const FRAMING_FIELDS = ['shot_size', 'shot_purpose', 'subject_arrangement', 'subject_orientation', 'camera_height', 'camera_pitch', 'camera_roll', 'camera_position', 'camera_distance'];
const ADVANCED_FIELD_GROUPS = [
    { label: '攝影機與感光', icon: 'Camera', categories: ['capture_medium', 'imaging_modality', 'film_sensor_character', 'iso_sensitivity', 'exposure_compensation'] },
    { label: '鏡頭與光學', icon: 'Focus', categories: ['projection', 'focus_behavior'] },
    { label: '色彩與調色', icon: 'Palette', categories: ['white_balance', 'color_response', 'film_process'] }
];

const byKey = new Map(library.items.map((item) => [item.key, item]));
const DEFAULT_STATE = storageMigration.DEFAULT_STATE;
const normalizeState = storageMigration.normalizeState;
const storageApi = storageMigration.forLibrary(library);
const loadInitialState = () => storageApi.loadInitialState(localStorage);
const loadInitialShots = () => storageApi.loadInitialShots(localStorage);

const CATEGORY_COPY = {
    capture_system: '拍攝系統', capture_medium: '拍攝媒介', primary_lens: '主要鏡頭',
    field_of_view: '視野與焦距', aperture_depth_of_field: '光圈與景深', shutter_speed: '快門與曝光時間',
    focus_behavior: '焦點與焦平面', iso_sensitivity: 'ISO 感光度', exposure_compensation: '曝光補償', shot_size: '景別',
    shot_purpose: '鏡頭用途', subject_arrangement: '主體配置', subject_orientation: '主體朝向', composition: '構圖',
    camera_height: '機位高度', camera_pitch: '鏡頭俯仰', camera_roll: '鏡頭滾轉',
    camera_position: '相機位置', camera_distance: '相機與主體距離', projection: '投影方式',
    camera_movement: '運鏡', photographic_technique: '攝影手法', lens_character: '鏡頭特性', optical_distortion: '光學變形',
    optical_filter: '光學濾鏡', imaging_modality: '成像模態', lighting_pattern: '佈光方式',
    light_direction: '光線方向', light_quality: '光質', exposure_character: '曝光特性',
    white_balance: '白平衡與色溫', color_response: '色彩反應', film_sensor_character: '底片與感光元件特性', film_process: '底片沖印流程',
    grain_noise: '顆粒與雜訊', highlight_behavior: '高光表現', color_grade: '調色',
    image_character: '影像特性', post_visual_effect: '後期與視覺效果', aspect_ratio: '畫面比例',
    creative_preset: '創意預設'
};

const CATEGORY_TONE = {
    capture_system: 'text-[#5e98f9]', capture_medium: 'text-[#5e98f9]', primary_lens: 'text-[#5e98f9]',
    field_of_view: 'text-[#5e98f9]', aperture_depth_of_field: 'text-[#5e98f9]', shutter_speed: 'text-[#5e98f9]',
    focus_behavior: 'text-[#5e98f9]', iso_sensitivity: 'text-[#5e98f9]', exposure_compensation: 'text-[#5e98f9]', shot_size: 'text-[#5e98f9]',
    shot_purpose: 'text-[#5e98f9]', subject_arrangement: 'text-[#5e98f9]', subject_orientation: 'text-[#5e98f9]',
    camera_height: 'text-[#5e98f9]', camera_pitch: 'text-[#5e98f9]', camera_roll: 'text-[#5e98f9]',
    camera_position: 'text-[#5e98f9]', camera_distance: 'text-[#5e98f9]', projection: 'text-[#5e98f9]',
    imaging_modality: 'text-[#5e98f9]', white_balance: 'text-[#5e98f9]', color_response: 'text-[#5e98f9]', film_sensor_character: 'text-[#5e98f9]',
    film_process: 'text-[#5e98f9]', color_grade: 'text-[#5e98f9]', aspect_ratio: 'text-[#5e98f9]'
};

const MODEL_COPY = {
    nano_banana_pro: { name: '🍌 Nano Banana', description: '以分區式攝影語意輸出，適合保留較完整的鏡頭、燈光與影像特性控制。' },
    image_2: { name: 'OpenAI Image 2.0', description: '以連貫自然語言輸出影像指示，避免加入模型專屬的指令語法。' },
    generic: { name: '通用', description: '以模型中立的攝影語意輸出，供未列出的影像模型使用。' }
};

const FORMAT_COPY = {
    full_frame_35mm: '全片幅 35 毫米', aps_c_reference: 'APS-C 參考格式', micro_four_thirds: 'M43 格式',
    medium_645_reference: '645 參考片幅', six_by_six_reference: '6×6 參考片幅',
    six_by_seven_reference: '6×7 參考片幅', four_by_five_reference: '4×5 參考片幅', eight_by_ten_reference: '8×10 參考片幅'
};

function localizedName(item) {
    if (['field_of_view', 'aperture_depth_of_field', 'shutter_speed', 'iso_sensitivity', 'exposure_compensation', 'aspect_ratio'].includes(item.category)) {
        return item.display_name;
    }
    if (item.localized_name && item.localized_name !== item.display_name) return `${item.display_name}｜${item.localized_name}`;
    return item.display_name;
}

function normalizeChinesePunctuation(value) {
    const text = String(value || '').trim()
        .replace(/,\s*/g, '，')
        .replace(/([^\d])\.([^\d]|$)/g, '$1。$2')
        .replace(/\s*\/\s*/g, '、')
        .replace(/；/g, '，');
    if (!text || /[。！？]$/.test(text)) return text;
    return `${text}。`;
}

function focalDescription(item) {
    const mm = Number.parseFloat(item.id);
    if (mm <= 14) return `超廣角視野，極致誇張近大遠小與空間延伸感，適合壯闊全景與強烈透視張力。`;
    if (mm <= 24) return `廣角視野，兼具前景張力與豐富環境脈絡，適合空間、建築與動態敘事。`;
    if (mm <= 40) return `小廣角人文視野，兼顧主體人物與周遭環境，為經典紀實與敘事焦段。`;
    if (mm <= 58) return `標準透視視野，最貼近人眼自然觀看視角，透視客觀寫實、變形極低。`;
    if (mm <= 135) return `中長焦人像視野，主體與背景分離度高、背景適度壓縮，突顯主體特徵與神情。`;
    return `超長焦視野，強烈壓縮前後景縱深、拉近遠距主體，具備極高空間壓縮感與主體特寫力。`;
}

function apertureDescription(item) {
    const f = Number.parseFloat(String(item.id).replace('f/', ''));
    if (f <= 1.2) return `超大光圈極淺景深，背景強烈奶油般虛化、夜間進光量極高，主體如浮雕般分離。`;
    if (f <= 2.8) return `大光圈淺景深，柔美散景同時保留主體邊緣清晰辨識度，為經典電影與人像光圈。`;
    if (f <= 5.6) return `中等景深，主體與背景環境細節平衡呈現，光學銳利度與階調表現最佳。`;
    if (f <= 11) return `較深景深，前後景均維持清晰，適合群像、建築、風光與深空間場面調度。`;
    return `極深景深，全畫面維持清晰焦點，適合大景深深焦攝影（Deep Focus）。`;
}

function shutterDescription(item) {
    const id = String(item.id || '');
    if (id === 'bulb' || id === 'multi_hour' || id === '1_hour' || id === 'tens_of_minutes' || id === 'several_minutes' || /^\d+s$/.test(id)) {
        return `極長曝光時間，使流動水體化為絲絹、車流匯成光軌、動態人流完全虛化，呈現時間凝縮的超現實靜謐感。`;
    }
    if (['1/2s', '1/4s', '1/8s', '1/15s'].includes(id)) {
        return `慢速快門，使畫面中運動主體產生顯著動態模糊（Motion Blur），強烈表現速度感、奔馳或夢幻殘影。`;
    }
    if (['1/30s', '1/60s'].includes(id)) {
        return `標準電影與自然快門（對齊 180° 電影快門角），呈現符合人眼視覺慣性的自然動態模糊與流暢度。`;
    }
    if (['1/125s', '1/250s', '1/500s'].includes(id)) {
        return `中高速快門，可瞬間清晰定格日常走動與一般運動人物，邊緣銳利乾淨、無晃動殘影。`;
    }
    return `超高速快門，可定格高速飛濺水滴、激烈爆炸碎屑、高速運動與飛鳥展翅，捕捉肉眼不可見的凝結瞬間。`;
}

function isoDescription(item) {
    const iso = Number.parseInt(String(item.id).replace('iso_', ''), 10);
    if (iso <= 200) return `低感光度，畫面極致純淨無雜訊，動態範圍與色彩階調最豐富，適合充足光線與棚拍。`;
    if (iso <= 800) return `標準感光度，兼具優良畫質與自然細微感光質地，適應多數光線場景。`;
    if (iso <= 6400) return `高感光度，伴隨可見顆粒雜訊與暗部粗糙紋理，賦予畫面強烈紀實感、夜間氛圍與底片質感。`;
    return `極高感光度，粗糙雜訊與高反差暗部紋理，適合極限暗夜、粗獷紀實或低光監控風格。`;
}

function exposureCompensationDescription(item) {
    const id = String(item.id || '');
    if (id.startsWith('minus')) return `調降整體曝光，壓暗影調以嚴格保護亮部高光，陰影深邃沉穩，營造神秘、壓抑或低調（Low-Key）電影氛圍。`;
    if (id === 'zero_ev') return `標準曝光基準，亮部與暗部階調平衡呈現，反映客觀中性反差。`;
    return `提高整體曝光，提升暗部層次與整體亮度，營造明亮、通透、空氣感或高調（High-Key）純淨視覺。`;
}

function aspectRatioDescription(item) {
    const id = String(item.id || '');
    if (id === '1:1') return `1:1 正方形畫幅，構圖具備對稱、穩定與現代社群極簡美感。`;
    if (id === '3:4' || id === '4:5' || id === '2:3') return `經典直式畫幅，強化垂直縱向延伸與人物全身/半身修長比例。`;
    if (id === '9:16') return `9:16 全螢幕直式畫幅，專為現代行動裝置與直式短影音沉浸視覺設計。`;
    if (id === '4:3') return `4:3 經典學院畫幅（Academy Ratio），具備懷舊復古電影感與凝聚的主體焦點。`;
    if (id === '3:2') return `3:2 經典 35mm 靜態底片畫幅，橫向視角均衡、最符合經典攝影視覺直覺。`;
    if (id === '16:9') return `16:9 現代影視標準寬螢幕畫幅，兼具橫向視野與普遍顯示器最佳適配。`;
    if (id === '21:9') return `2.39:1 / 21:9 變形寬銀幕電影畫幅（Cinemascope），提供強烈橫向全景展開與史詩電影沉浸感。`;
    return `極致全景長寬比，營造超長橫向或縱向全景展開視覺。`;
}

const SPECIFIC_DESCRIPTIONS = {
    'shotTypes:ECU': '大特寫鏡頭，極致聚焦主體局部細節（如雙眼、手部動作或關鍵物件），放大情緒張力。',
    'shotTypes:Macro': '微距攝影，極致放大主體微觀紋理（如露珠、昆蟲結構、晶片細節），呈現超越肉眼的視覺。',
    'shotTypes:Crowd': '大密集群眾配置，營造宏大場面感、社會集體氛圍或人潮張力。',
    'shotTypes:Group': '多人小群體配置，清楚呈現團隊內部成員的空間層次與群體互動關係。',
    'shotTypes:TwoShot': '雙人主體配置，平衡呈現兩人之間的對話互動、情感連結或對峙張力。',
    'arrangement:single_subject': '單一主體配置，全畫面視線完全聚焦於單一個體，強調個體情緒與純粹視覺重心。',
    'perspectives:frontal': '主體正面直視鏡頭，建立最強烈、直接的情感交流與凝視感。',
    'perspectives:threequarter': '四分之三側面角度，完美展現主體面部五官的立體縱深與光影過渡。',
    'perspectives:profile': '正側面剪影視角，突顯主體側臉輪廓線條與專注、沉思的客觀情緒。',
    'perspectives:back': '主體背對鏡頭，營造神秘感、孤獨氛圍或引導觀眾與主體同向凝視世界。',
    'perspectives:overhead': '正上方俯視主體，呈現獨特的空間幾何與超脫的觀察者視角。',
    'perspectives:eye': '視平線高度，與被攝主體處於對等平視位置，觀感最自然客觀。',
    'perspectives:ground': '貼地極低機位，貼近地面視角，強化地表紋理與前景巨大化張力。',
    'perspectives:waist': '腰平機位，經典雙眼反光相機視角，視角溫和且保持優雅的觀察距離。',
    'perspectives:aerial': '高空俯瞰機位，綜觀大範圍地理環境與空間佈局，具備宏觀宏大感。',
    'perspectives:eye_level': '水平視角，相機無仰俯傾斜，呈現客觀穩定的現實透視。',
    'perspectives:low': '低角度仰拍，使主體顯得高大、崇高、威嚴或具有心理壓迫優勢。',
    'perspectives:frog': '青蛙仰角蟲瞻視角，由極低地面往上仰望，極度誇張主體高聳感。',
    'perspectives:worms': '蟲瞻極低視角，緊貼地表向上透視，主體展現壓倒性的視覺衝擊。',
    'perspectives:undershot': '仰視底拍，由下往上直視主體底部，呈現不尋常的底面透視結構。',
    'perspectives:high': '高角度俯拍，使主體顯得渺小、脆弱、被審視或突顯地面佈局。',
    'perspectives:flatlay': '垂直向下 90 度俯拍平鋪視角（Flat Lay），完美展示桌面物品佈局、幾何秩序與設計細節。',
    'perspectives:bird': '鳥瞰俯視，由高空俯視地面，將地景簡化為幾何圖形與紋理。',
    'perspectives:god': '上帝視角，由正天頂最高點完全垂直俯瞰，展現全知全覽的宏觀透視。',
    'perspectives:gods_eye': '上帝視角，由正天頂最高點完全垂直俯瞰，展現全知全覽的宏觀透視。',
    'perspectives:nadir': '天底垂直仰拍，由最低點朝正天頂垂直仰望，營造天空穹頂環繞感。',
    'perspectives:dutch': '荷蘭式傾斜角度，地平線傾斜失衡，營造心理不安、緊張、危機、迷失或強烈動態張力。',
    'perspectives:canted': '側傾視角，打破常規水平構圖，賦予畫面傾斜動態感與戲劇張力。',
    'perspectives:oblique': '斜角透視，以斜向軸線引導視線，強化空間縱深與非平衡感。',
    'perspectives:ots': '過肩鏡頭（Over-The-Shoulder），以前景人物肩膀框定視線，建立對話兩者的空間深度與臨場感。',
    'perspectives:pov': '主觀視角（Point of View），模擬特定人物或生物雙眼所見，讓觀眾直接代入體驗。',
    'perspectives:selfie': '自拍視角，近距離手持自視，呈現生活化、親密感或第一人稱記錄感。',
    'perspectives:drone': '空拍機動態視角，在三維空間自由穿梭，展現開闊壯觀的地理與建築全景。',
    'perspectives:tracking': '運動跟拍視角，攝影機隨主體同步位移移動，保持連貫動態跟隨感。',
    'perspectives:symmetrical': '雙側對稱構圖，以畫面正中垂直軸為基準建立左右鏡像平衡，展現莊嚴、神聖或秩序美感。',
    'composition:symmetrical': '雙側對稱構圖，以畫面正中垂直軸為基準建立左右鏡像平衡，展現莊嚴、神聖或秩序美感。',
    'composition:rule_of_thirds': '三分法構圖，將主體或地平線置於九宮格三分線交點，營造自然和諧與留白美感。',
    'composition:centered': '置中對稱構圖，將核心主體置於畫面正中央，形成強烈視覺焦點與莊重感。',
    'composition:golden_ratio': '黃金比例構圖（1:1.618 螺旋），引導視線流暢滑向核心焦點，具備自然優雅美感。',
    'composition:leading_lines': '引導線構圖，利用道路、河流或線條引導觀眾視線穿透畫面，深入視覺核心。',
    'composition:framing': '框中框構圖，利用門窗、樹影或幾何結構作為前景框架，強化空間層次與窺探感。',
    'distance:intimate': '極貼近親密距離，相機緊貼主體表面，放大微觀細節與極致空間親密感。',
    'distance:close': '近距離拍攝，相機靠近主體，主體存在感極強、排除多餘干擾空間。',
    'distance:conversational': '對談距離，相機保持日常社交人際距離，主體與周遭環境自然平衡。',
    'distance:distant': '遠距離觀察，相機遠離主體，營造客觀、冷靜、旁觀或孤獨抽離的敘事感。',
    'distance:extreme_distant': '極遠距離，相機極遠眺望，主體化為大環境中的點綴，空間遼闊感極致放大。',
    'focus:primary_subject': '精準對焦於主要主體或人物眼部，確保核心焦點極致銳利清晰。',
    'focus:near_foreground': '對焦於近距離前景元素，引導視線穿透模糊背景，增加前後景深層次。',
    'focus:midground': '對焦於中景區域，使前景與遠景自然漸變虛化，兼顧主體與空間平衡。',
    'focus:background': '對焦於遠景背景，使近處前景主體化為剪影或散景，營造神秘遠觀感。',
    'focus:intentional_misfocus': '刻意全畫面脫焦失焦，將具體細節融化為抽象光斑與色彩光暈，營造夢幻詩意氛圍。',
    'projection:rectilinear': '直線透視投影，保持現實中直線在畫面上依然筆直，為標準鏡頭光學成像方式。',
    'projection:orthographic': '近正交投影，消除近大遠小透視差，使物件無論遠近尺寸均等，具備工業圖紙感。',
    'projection:fisheye': '魚眼鏡頭半球投影，直線強烈彎曲成弧線，呈現 180 度超廣圓弧視覺張力。',
    'projection:cylindrical': '柱面全景投影，橫向視角展開無極限拉伸，適合超寬接縫全景。',
    'projection:equirectangular': '等距長方投影，將 360 度全景球面展開為 2:1 平面，為 VR 與全景標準貼圖。',
    'optical_filter:split_diopter': '半割雙焦濾鏡，同時使極近距離前景與極遠距離背景維持清晰焦點，營造超現實深焦張力。',
    'optical_filter:promist': '黑柔光濾鏡（Black Pro-Mist），輕微擴散高光溢光、降低數位相機生硬銳度、柔化皮膚瑕疵，營造電影光暈感。',
    'lighting:diffused_light': '大面積柔光源擴散漫射，光線均勻柔和包裹主體，陰影邊緣羽化過渡自然，消除刺眼油光。',
    'lighting:negative_fill': '在陰影側使用吸光黑旗板吸收環境反射光，強化面部與物體明暗反差與立體雕塑感。',
    'lighting:lens_flare': '強光源直射鏡頭內部鏡片組反射產生的多邊形或圓形鬼影光斑，營造夢幻大氣與戲劇張力。',
    'light_direction:front_light': '順光正面照射，陰影極少、主體色彩與細節清晰平坦，光影反差低。',
    'light_direction:three_quarter_key': '四分之三主光角度，自然勾勒面部與物體立體結構，明暗過渡豐富自然。',
    'light_direction:side_light': '正側光 90 度照射，半明半暗強烈反差，極致刻畫主體表面肌理、輪廓與戲劇感。',
    'light_direction:backlight': '主光從後方逆向照射，勾勒主體邊緣髮絲與輪廓金邊（Rim Light），強烈分離背景。',
    'light_direction:underlight': '由下往上底光照射（腳光），顛覆自然光向下規律，營造恐怖、懸疑、戲劇或詭譎氛圍。',
    'light_direction:toplight': '正上方頂光直射，在眼窩、鼻下投射深邃陰影，營造壓抑、審判或神聖天光感。',
    'light_direction:crosslight': '兩側交叉側光對照，塑造極致雕塑感與立體明暗交織輪廓。',
    'lighting_pattern:rembrandt': '倫勃朗光，在背光側臉頰形成標誌性三角形光斑，兼具立體感與古典油畫戲劇感。',
    'lighting_pattern:split_lighting': '分割光，將面部精準平分為一明一暗兩半，反差極高，象徵雙重性格或強烈內心衝突。',
    'lighting_pattern:butterfly': '蝴蝶光（派拉蒙光），在鼻下投下對稱蝴蝶形陰影，雕刻高顴骨與對稱美感，為經典人像光。',
    'lighting_pattern:clamshell': '蚌殼式佈光，上下兩組光源包覆面部，大幅減少下巴與眼窩陰影，呈現極致柔美通透膚質。',
    'lighting_pattern:balanced_key_fill': '平衡主補光，主光與補光比例適中，保留立體感同時保持暗部細節豐富可見。',
    'lighting_pattern:low_fill_high_ratio': '高反差主補比，極弱補光使暗部深邃沉降，營造硬調電影黑色電影（Film Noir）氛圍。',
    'lighting_pattern:cross_key': '雙主光交叉佈光，為對話雙方或對稱場景提供均衡且立體的獨立主光照明。',
    'exposure_character:protected_highlights': '保護高光曝光，嚴防亮部過曝死白，保留雲層、高光與發光體極致細節，影調深沉。',
    'exposure_character:lifted_shadow_exposure': '抬升陰影曝光，提亮暗部細節與階調，呈現通透、低反差與柔和空氣感。',
    'exposure_character:crushed_shadow_exposure': '壓黑暗部曝光，使陰影沉降為純黑剪影，強化畫面硬朗輪廓與高反差視覺張力。',
    'color_response:neutral_response': '中性色彩反應，客觀真實還原場景光譜色溫與色彩飽和度，無偏色修飾。',
    'color_response:soft_saturation_rolloff': '柔和飽和度滾降，高光與極限亮部色彩自然淡化過渡，具備經典電影底片色彩質感。',
    'color_response:strong_color_separation': '強色彩分離度，清晰區分相近色相邊界，色彩層次鮮明俐落、飽滿立體。',
    'grain_noise:fine_film_grain': '細緻膠片顆粒，均勻散布於中灰與暗部，賦予畫面細膩有機質地與類比電影感。',
    'grain_noise:coarse_film_grain': '粗獷膠片顆粒，顆粒感顯著、質地粗糙，營造強烈復古、紀實與街頭攝影張力。',
    'grain_noise:luminance_noise': '亮度雜訊，隨機明暗噪點分布於平滑影調中，模擬高感光元件在低光下的電子訊號特徵。',
    'grain_noise:chrominance_noise': '色度雜訊，暗部出現紅綠藍彩色雜訊噪點，呈現極限低光與高 ISO 的粗糙數位特徵。',
    'optical_distortion:barrel': '桶狀變形，畫面線條向外膨脹彎曲，邊緣擴張，為廣角鏡頭常見光學特徵。',
    'optical_distortion:pincushion': '枕狀變形，畫面線條向內收縮凹陷，邊緣向中心聚攏，為長焦鏡頭常見光學特徵。',
    'optical_distortion:lateral_chromatic_aberration': '橫向色差（紫邊/綠邊），高對比邊緣出現紅青或藍黃色邊，具備老鏡頭光學不完美特色。',
    'optical_distortion:coma': '彗差散景，畫面邊緣點光源拖尾變形為彗星狀或飛鳥狀光斑，呈現大光圈邊緣光學特徵。',
    'optical_distortion:field_curvature': '像場彎曲，焦點平面非純平面而呈弧形，中心清晰時邊緣自然柔化，突顯中央主體。'
};

function cleanGuardrailText(text) {
    if (!text) return '';
    let s = String(text).trim();
    s = s.replace(/的曝光時間控制；只依場景中實際存在的運動.*$/, '');
    s = s.replace(/只依場景中實際存在的運動.*$/, '');
    s = s.replace(/控制.*?不改變.*?$/, '');
    s = s.replace(/控制.*?不等同.*?$/, '');
    s = s.replace(/只控制.*?$/, '');
    s = s.replace(/控制.*?不保證.*?$/, '');
    s = s.replace(/是獨立可見的影像訊號或媒材特性。?$/, '');
    return s.trim();
}

function localizedDescription(item) {
    if (SPECIFIC_DESCRIPTIONS[item.key]) return SPECIFIC_DESCRIPTIONS[item.key];
    if (item.category === 'field_of_view') return focalDescription(item);
    if (item.category === 'aperture_depth_of_field') return apertureDescription(item);
    if (item.category === 'shutter_speed') return shutterDescription(item);
    if (item.category === 'iso_sensitivity') return isoDescription(item);
    if (item.category === 'exposure_compensation') return exposureCompensationDescription(item);
    if (item.category === 'aspect_ratio') return aspectRatioDescription(item);

    const cleaned = cleanGuardrailText(item.historical_context || item.definition);
    if (/[\u3400-\u9fff]/.test(cleaned) && cleaned.length >= 4) return normalizeChinesePunctuation(cleaned);
    const category = CATEGORY_COPY[item.category] || '影像控制';
    return `${item.display_name}（${item.localized_name || ''}）：提供具備電影質感的${category}表現。`;
}

function localizedWarning(entry) {
    const selectedNames = (entry.item_keys || [])
        .map((key) => byKey.get(key))
        .filter(Boolean)
        .map(localizedName)
        .join('、');
    if (entry.type === 'migration') return {
        title: '舊版設定已略過',
        detail: `找不到舊版儲存的「${entry.detail || '選項'}」，已略過該值，其他設定可正常使用。`,
        resolution: '請重新選擇此項目。'
    };
    if (entry.type === 'physical_conflict') {
        if (/aperture/i.test(entry.title || '')) return {
            title: '光圈超出鏡頭可用範圍',
            detail: '所選光圈比該鏡頭標示的最大光圈更大，提示詞已自動改用鏡頭可支援的光圈效果。',
            resolution: '可更換鏡頭，或選擇較小的光圈數值。'
        };
        return {
            title: '鏡頭與焦距不相容',
            detail: '所選鏡頭與焦距的視野設定不一致，提示詞會保留焦距的視野效果，只保留鏡頭不受焦距影響的特性。',
            resolution: '請選擇與鏡頭焦段相符的焦距。'
        };
    }
    if (entry.type === 'semantic_conflict') {
        if (/modality/i.test(entry.title || '')) return {
            title: '成像模態優先於一般色彩',
            detail: '科學或特殊成像方式與一般色彩流程衝突，提示詞會保留成像模態的色彩規則。',
            resolution: '可移除一般色彩或調色設定。'
        };
        return {
            title: '選項效果互相衝突',
            detail: `${selectedNames || '選取的設定'} 無法在同一畫面同時成立，其中一項不會寫入提示詞。`,
            resolution: '移除標示「未寫入」的橘色標籤，或改選相容的效果。'
        };
    }
    if (entry.type === 'creative_combination') return {
        title: '跨媒介影像組合',
        detail: '科學或機器成像與類比底片特性同時選用，會形成實驗性視覺效果。',
        resolution: '此組合可以保留，成像模態會優先決定一般色彩規則。'
    };
    if (entry.type === 'technique_interaction') return {
        title: '攝影手法與技術設定需協調',
        detail: `${selectedNames || '目前選取的設定'} 仍可作為創意組合，但快門、閃光或景深語意不會自動假設為一般拍攝條件。`,
        resolution: '可依目標調整快門、閃光或景深；系統會保留創意組合並避免輸出互相矛盾的物理敘述。'
    };
    if (entry.type === 'semantic_suppression') return {
        title: '重複效果已合併',
        detail: `${selectedNames || '目前選取的效果'} 含有相同的可見成分，提示詞只保留一份。`,
        resolution: '儲存狀態仍保留原選項，可移除其中一項以簡化設定。'
    };
    if (entry.type === 'evidence_gap') return {
        title: '此選項暫不寫入提示詞',
        detail: `${selectedNames || '此選項'} 保留在資料庫供搜尋，但目前沒有可安全輸出的視覺效果。`,
        resolution: '若只想保留器材名稱，可開啟器材名稱權杖。'
    };
    return {
        title: '設定提示',
        detail: '目前設定已套用相容性規則。',
        resolution: '請依橘色或紅色標籤調整。'
    };
}

function groupForKey(key) {
    const item = byKey.get(key);
    return item && MULTI_GROUPS.find((group) => group.categories.includes(item.category));
}

function groupSelectionCount(keys, group) {
    return keys.map((key) => byKey.get(key)).filter((item) => item && group.categories.includes(item.category)).length;
}

function Icon({ name, size = 16, className = '' }) {
    const lucideName = String(name || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/_/g, '-')
        .toLowerCase();
    return <i data-lucide={lucideName} style={{ width: size, height: size }} className={`inline-block shrink-0 ${className}`}></i>;
}

function SelectControl({ category, label, icon, value, onChange }) {
    const options = library.items.filter((item) => item.category === category && !item.deprecated && item.id !== 'none');
    return (
        <div className="space-y-1.5 min-w-0">
            <label className={`mobile-label text-xs font-black uppercase flex items-center gap-1 tracking-wider ${CATEGORY_TONE[category] || 'text-[#5e98f9]'}`}>
                <Icon name={icon} size={13} /> {label}
            </label>
            <select value={value || ''} onChange={(event) => onChange(category, event.target.value)} className="w-full bg-[#1c1c1e] border border-gray-700 rounded-xl h-12 px-3 outline-none cursor-pointer text-gray-200">
                <option value="" title="不指定此項控制，交由其他已選影像條件決定。"></option>
                {options.map((item) => (
                    <option key={item.key} value={item.key} title={localizedDescription(item)}>{localizedName(item)}</option>
                ))}
            </select>
        </div>
    );
}

function ChipPicker({ group, selectedKeys, effectiveKeys, suppressedKeys, warnings, onAdd, onRemove }) {
    const options = library.items.filter((item) => group.categories.includes(item.category) && !item.deprecated && item.id !== 'none');
    const selected = selectedKeys.map((key) => byKey.get(key)).filter((item) => item && group.categories.includes(item.category));
    const atLimit = selected.length >= group.limit;
    const effective = new Set(effectiveKeys || []);
    const suppressed = new Set(suppressedKeys || []);
    const statusWarning = (item) => (warnings || []).find((entry) => suppressed.has(item.key) && (entry.item_keys || []).includes(item.key));
    return (
        <div className={`bg-[#18181b] border rounded-2xl p-4 space-y-3 ${atLimit ? group.border : 'border-gray-700/80'}`}>
            <div className="flex items-center justify-between gap-3">
                <label className={`text-xs font-black uppercase tracking-widest flex items-center gap-1.5 ${group.tone}`}><Icon name={group.icon} size={13} /> {group.label}</label>
                <select disabled={atLimit} value="" onChange={(event) => { if (event.target.value) onAdd(event.target.value); }} className={`max-w-[58%] bg-[#111113] border rounded-lg h-10 px-3 text-sm text-blue-300 disabled:cursor-not-allowed disabled:text-gray-600 ${atLimit ? 'border-amber-500/40' : 'border-gray-700'}`}>
                    <option value="" title={`新增一項「${group.label.split('｜')[1]}」控制。`}></option>
                    {options.filter((item) => !selectedKeys.includes(item.key)).map((item) => <option key={item.key} value={item.key} title={localizedDescription(item)}>{localizedName(item)}</option>)}
                </select>
            </div>
            <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">已選 {selected.length}／{group.limit} 項</span>
                <span className={atLimit ? 'text-amber-300 font-bold' : 'text-gray-600'}>{atLimit ? '已達上限，請先移除一項' : `還可加入 ${group.limit - selected.length} 項`}</span>
            </div>
            <div className="flex flex-wrap gap-2 min-h-8">
                {selected.length ? selected.map((item) => (
                    <button key={item.key} onClick={() => onRemove(item.key)} title={`${localizedDescription(item)}\n${suppressed.has(item.key) ? `未寫入提示詞：${(statusWarning(item) || {}).resolution || '與其他設定衝突。'}` : '已寫入提示詞。'}`} className={`text-[11px] border px-3 py-1.5 rounded-full transition-colors ${suppressed.has(item.key) ? 'bg-amber-500/10 text-amber-200 border-amber-400/40 hover:bg-red-600/20 hover:text-red-200' : effective.has(item.key) ? 'bg-blue-600/10 text-blue-200 border-blue-400/30 hover:bg-red-600/20 hover:text-red-200' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-red-600/20 hover:text-red-200'}`}>
                        {localizedName(item)} {suppressed.has(item.key) ? '！未寫入' : '✓'} ×
                    </button>
                )) : <span className="text-[11px] text-gray-600">No active traits｜尚未選擇特性</span>}
            </div>
        </div>
    );
}

function WarningPanel({ warnings, migrationWarnings }) {
    const all = [
        ...(migrationWarnings || []).map((detail) => ({ severity: 'warning', type: 'migration', detail })),
        ...(warnings || [])
    ];
    if (!all.length) return null;
    const tone = { conflict: 'border-red-500/30 text-red-300', warning: 'border-amber-500/30 text-amber-300', info: 'border-blue-500/20 text-blue-300' };
    return (
        <div className="space-y-2">
            {all.map((entry, index) => (
                <div key={`${entry.title}-${index}`} className={`bg-[#18181b] border rounded-xl p-3 ${tone[entry.severity] || tone.info}`}>
                    <div className="text-xs font-black tracking-wider">{localizedWarning(entry).title}</div>
                    <div className="text-sm text-gray-300 mt-1">{localizedWarning(entry).detail}</div>
                    <div className="text-[11px] text-gray-500 mt-1">處理方式：{localizedWarning(entry).resolution}</div>
                </div>
            ))}
        </div>
    );
}

function LibraryExplorer({ state, onSelect, onAddTag, onRemoveTag }) {
    const [query, setQuery] = useState('');
    const normalized = query.trim().toLowerCase();
    const results = useMemo(() => {
        if (!normalized) return [];
        return library.items.filter((item) => item.id !== 'none' && !item.deprecated && [item.display_name, item.localized_name, item.definition, item.category, ...item.visual_traits].join(' ').toLowerCase().includes(normalized)).slice(0, 40);
    }, [normalized]);
    const active = new Set([...Object.values(state.selections), ...state.tags]);
    return (
        <details className="bg-[#121214] border border-gray-800 rounded-2xl overflow-hidden">
            <summary className="cursor-pointer px-4 py-3 text-[10px] font-black text-[#61f7f7] uppercase tracking-widest flex items-center gap-2"><Icon name="Library" size={14} />資料庫瀏覽器</summary>
            <div className="p-4 pt-1 space-y-3">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋器材、光學、流程、成像模態與效果…" className="w-full bg-[#18181b] border border-gray-800 rounded-xl h-10 px-3 text-xs outline-none focus:border-violet-500/50 select-text" />
                <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2">
                    {results.map((item) => {
                        const mode = library.categories[item.category].selection_mode;
                        const isActive = active.has(item.key);
                        const group = mode === 'multi' ? groupForKey(item.key) : null;
                        const atLimit = !isActive && group && groupSelectionCount(state.tags, group) >= group.limit;
                        const toggle = () => {
                            if (atLimit) return;
                            if (mode === 'single') onSelect(item.category, isActive ? '' : item.key);
                            else if (isActive) onRemoveTag(item.key);
                            else onAddTag(item.key);
                        };
                        return (
                            <button key={item.key} onClick={toggle} disabled={atLimit} title={atLimit ? `此分類已達 ${group.limit} 項上限，請先移除一項。` : localizedDescription(item)} className={`w-full text-left rounded-xl border p-3 transition-colors disabled:cursor-not-allowed ${isActive ? 'bg-violet-600/15 border-violet-500/40' : atLimit ? 'bg-amber-500/5 border-amber-500/20 text-gray-600' : 'bg-[#18181b] border-gray-800 hover:border-violet-500/30'}`}>
                                <div className="flex justify-between gap-3"><span className="text-xs text-gray-200 font-bold">{localizedName(item)}</span><span className="text-[10px] text-violet-400 uppercase">{CATEGORY_COPY[item.category] || item.category}</span></div>
                                <div className="text-[11px] text-gray-400 mt-1">{localizedDescription(item)}</div>
                                <div className="text-[10px] text-gray-600 mt-1">{atLimit ? `已達 ${group.limit} 項上限，請先移除一項。` : `控制範圍：${item.controls.map((control) => CATEGORY_COPY[control] || control).join('、')}，信心等級：${item.confidence}`}</div>
                            </button>
                        );
                    })}
                    {normalized && !results.length && <div className="text-[10px] text-gray-600 py-6 text-center">No matching Library entity.｜找不到相符的資料庫項目。</div>}
                </div>
            </div>
        </details>
    );
}

function copyText(text, onDone) {
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(onDone).catch(() => fallback());
    else fallback();
    function fallback() {
        const element = document.createElement('textarea');
        element.value = text;
        element.style.position = 'fixed';
        element.style.left = '-9999px';
        document.body.appendChild(element);
        element.select();
        try { document.execCommand('copy'); onDone(); } finally { document.body.removeChild(element); }
    }
}

function App() {
    const [state, setState] = useState(loadInitialState);
    const [shots, setShots] = useState(loadInitialShots);
    const [copyId, setCopyId] = useState(null);
    const [dragIndex, setDragIndex] = useState(null);
    const scrollContainerRef = useRef(null);
    const dragOverIndex = useRef(null);

    const result = useMemo(() => compiler.compile(library, state), [state]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_KEY}_cfg`, JSON.stringify(state));
    }, [state]);
    useEffect(() => {
        localStorage.setItem(`${STORAGE_KEY}_list`, JSON.stringify(shots));
    }, [shots]);
    useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
    });

    const selectItem = (category, key) => setState((previous) => ({ ...previous, selections: { ...previous.selections, [category]: key } }));
    const addTag = (key) => setState((previous) => {
        if (previous.tags.includes(key)) return previous;
        const group = groupForKey(key);
        if (!group || groupSelectionCount(previous.tags, group) >= group.limit) return previous;
        return { ...previous, tags: [...previous.tags, key] };
    });
    const removeTag = (key) => setState((previous) => ({ ...previous, tags: previous.tags.filter((item) => item !== key) }));
    const changeReference = (key, value) => setState((previous) => ({ ...previous, references: { ...previous.references, [key]: value } }));

    const addShot = () => {
        if (!state.action.trim()) return;
        const shot = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            action: state.action.trim(),
            prompt: result.prompt,
            state_snapshot: state,
            schema_version: library.schema_version,
            model_profile: state.model_profile,
            warnings: result.warnings
        };
        setShots((previous) => [...previous, shot]);
        setState((previous) => ({ ...previous, action: '', references: { ...DEFAULT_STATE.references }, migration_warnings: [] }));
        setTimeout(() => { if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight; }, 50);
    };

    const reset = () => {
        if (window.confirm('確定要重置所有控制與參考圖設定嗎？')) {
            setState((previous) => ({
                ...DEFAULT_STATE,
                model_profile: previous.model_profile || DEFAULT_STATE.model_profile,
                reference_format: previous.reference_format || DEFAULT_STATE.reference_format,
                action: '',
                selections: previous.selections && previous.selections.aspect_ratio ? { aspect_ratio: previous.selections.aspect_ratio } : { ...DEFAULT_STATE.selections },
                tags: [],
                references: { person: false, product: false, environment: false, style: false },
                literal_gear_token: false,
                migration_warnings: []
            }));
        }
    };
    const clearShots = () => {
        if (window.confirm('確定要清除所有分鏡紀錄嗎？')) setShots([]);
    };
    const exportCsv = () => {
        exportApi.downloadShotCsv(shots);
    };

    const pointerDown = (index) => { setDragIndex(index); dragOverIndex.current = index; };
    const pointerMove = (index) => {
        if (dragIndex === null || index === dragOverIndex.current) return;
        setShots((previous) => {
            const next = [...previous];
            const moving = next.splice(dragOverIndex.current, 1)[0];
            next.splice(index, 0, moving);
            return next;
        });
        dragOverIndex.current = index;
        setDragIndex(index);
    };
    const pointerUp = () => { setDragIndex(null); dragOverIndex.current = null; };

    const fov = result.metadata && result.metadata.horizontal_fov_degrees;

    return (
        <div className="min-h-screen bg-[#070708] text-gray-200 font-sans p-2 md:p-6 pb-20 select-none">
            <div className="max-w-screen-2xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
                <div className="xl:col-span-5 space-y-4">
                    <header className="flex items-center justify-between px-2 pt-2 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-blue-600 p-2 rounded-xl shadow-lg border border-blue-400/20"><Icon name="Clapperboard" size={24} className="text-white" /></div>
                            <div className="min-w-0"><h1 className="text-lg font-black tracking-tighter text-white uppercase leading-none truncate">CINEPROMPT MASTER</h1><p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mt-1">V4.1 · CINEMATOGRAPHY ONTOLOGY COMPILER</p></div>
                        </div>
                        <div className="shrink-0 text-[8px] text-green-400 bg-green-400/5 px-2 py-1 rounded-full border border-green-400/20 font-bold">{library.audit_summary.audited_entries} AUDITED</div>
                    </header>

                    <div className="bg-[#121214] border border-gray-800 rounded-3xl p-4 md:p-6 shadow-2xl space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-gray-400 uppercase flex items-center gap-2 tracking-widest"><Icon name="ChevronRight" className="text-blue-500" size={16} /> Scene / Action</label>
                            <textarea value={state.action} onChange={(event) => setState((previous) => ({ ...previous, action: event.target.value }))} placeholder="把畫面、主體與動作寫下來…" className="w-full bg-[#18181b] border border-gray-800 rounded-2xl p-4 text-sm focus:ring-1 focus:ring-blue-500 outline-none h-28 resize-none shadow-inner select-text" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-[#5e98f9] uppercase flex items-center gap-1 tracking-wider"><Icon name="Cpu" size={13} /> 目標模型</label>
                                <select value={state.model_profile} onChange={(event) => setState((previous) => ({ ...previous, model_profile: event.target.value }))} className="w-full bg-[#1c1c1e] border border-gray-800 rounded-xl h-11 px-3 text-gray-300">
                                    {library.model_profiles.map((profile) => <option key={profile.id} value={profile.id} title={(MODEL_COPY[profile.id] || {}).description}>{(MODEL_COPY[profile.id] || {}).name || profile.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <SelectControl category="aspect_ratio" label="畫面比例" icon="Monitor" value={state.selections.aspect_ratio} onChange={selectItem} />
                            </div>
                        </div>

                        <div className="bg-[#18181b] border border-blue-900/20 rounded-2xl p-4">
                            <div className="flex justify-between items-center mb-2 gap-2">
                                <div><label className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Icon name="Brain" size={12} />即時提示詞</label>{fov != null && <span className="text-[11px] text-gray-500">視野換算：{fov}° 水平視野，{FORMAT_COPY[result.metadata.reference_format.id] || result.metadata.reference_format.name}。</span>}</div>
                                <div className="flex gap-2"><button onClick={addShot} disabled={!state.action.trim()} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-full disabled:bg-gray-800 disabled:text-gray-600 flex items-center gap-1"><Icon name="Plus" size={11} /> ADD</button><button onClick={() => copyText(result.prompt, () => { setCopyId('live'); setTimeout(() => setCopyId(null), 1500); })} disabled={!state.action.trim()} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-full disabled:bg-gray-800 disabled:text-gray-600 flex items-center gap-1">{copyId === 'live' ? <><Icon name="Check" size={11} /> COPIED</> : <><Icon name="Copy" size={11} /> COPY</>}</button></div>
                            </div>
                            <div className="font-mono text-xs leading-relaxed text-gray-300 max-h-[170px] overflow-y-auto custom-scrollbar select-text">{result.prompt}</div>
                        </div>

                        <WarningPanel warnings={result.warnings} migrationWarnings={state.migration_warnings} />

                        <div className="bg-[#18181b] border border-gray-800/50 rounded-2xl p-4 space-y-3">
                            <label className="text-xs font-black text-blue-400 uppercase flex items-center gap-2 tracking-widest"><Icon name="Layers" size={14} /> 資產配置</label>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                                {Object.entries({ person: '人物參考', product: '產品參考', environment: '環境參考', style: '風格參考' }).map(([key, label]) => <label key={key} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={state.references[key]} onChange={(event) => changeReference(key, event.target.checked)} /><span className="text-[13px] font-bold text-gray-400">{label}</span></label>)}
                            </div>
                            <label className="flex items-center justify-between border-t border-gray-800 pt-3 cursor-pointer gap-4">
                                <span><span className="block text-xs font-black text-gray-300 uppercase">輸出攝影器材名稱</span><span className="block text-[11px] text-gray-500">關閉時只使用已確認的視覺結果；開啟後才實驗性保留器材名稱。</span></span>
                                <input type="checkbox" checked={state.literal_gear_token} onChange={(event) => setState((previous) => ({ ...previous, literal_gear_token: event.target.checked }))} />
                            </label>
                        </div>

                        <LibraryExplorer state={state} onSelect={selectItem} onAddTag={addTag} onRemoveTag={removeTag} />

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {SINGLE_FIELDS.filter(([category]) => PRIMARY_FIELDS.includes(category)).flatMap(([category, label, icon]) => category === 'primary_lens' ? [
                                <div key="reference_format" className="space-y-1.5 min-w-0">
                                    <label className="mobile-label text-xs font-black text-[#5e98f9] uppercase flex items-center gap-1 tracking-wider"><Icon name="ScanLine" size={13} /> 片幅</label>
                                    <select value={state.reference_format} onChange={(event) => setState((previous) => ({ ...previous, reference_format: event.target.value }))} className="w-full bg-[#1c1c1e] border border-gray-700 rounded-xl h-12 px-3 text-gray-200">
                                        {library.reference_formats.map((format) => <option key={format.id} value={format.id} title={`將同一焦距換算為 ${FORMAT_COPY[format.id] || '參考片幅'} 的水平視野角度；此角度會寫入提示詞，不改變主體透視。`}>{format.name}｜{FORMAT_COPY[format.id] || '參考片幅'}</option>)}
                                    </select>
                                </div>,
                                <SelectControl key={category} category={category} label={label} icon={icon} value={state.selections[category]} onChange={selectItem} />
                            ] : [<SelectControl key={category} category={category} label={label} icon={icon} value={state.selections[category]} onChange={selectItem} />])}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {SINGLE_FIELDS.filter(([category]) => FRAMING_FIELDS.includes(category)).map(([category, label, icon]) => <SelectControl key={category} category={category} label={label} icon={icon} value={state.selections[category]} onChange={selectItem} />)}
                        </div>

                        <ChipPicker group={MULTI_GROUPS[0]} selectedKeys={state.tags} effectiveKeys={result.effective_item_keys} suppressedKeys={result.suppressed_item_keys} warnings={result.warnings} onAdd={addTag} onRemove={removeTag} />

                        <details className="bg-[#18181b] border border-gray-800 rounded-2xl">
                            <summary className="cursor-pointer px-4 py-3 text-xs font-black text-[#61f7f7] uppercase tracking-widest flex items-center gap-2"> <Icon name="SlidersHorizontal" size={14} /> 分類進階控制 </summary>
                            <div className="p-4 pt-1 space-y-5">
                                {ADVANCED_FIELD_GROUPS.map((group) => <section key={group.label} className="space-y-2">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><Icon name={group.icon} size={12} /> {group.label}</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {SINGLE_FIELDS.filter(([category]) => group.categories.includes(category)).map(([category, label, icon]) => <SelectControl key={category} category={category} label={label} icon={icon} value={state.selections[category]} onChange={selectItem} />)}
                                    </div>
                                </section>)}
                            </div>
                        </details>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {MULTI_GROUPS.slice(1).map((group) => <ChipPicker key={group.id} group={group} selectedKeys={state.tags} effectiveKeys={result.effective_item_keys} suppressedKeys={result.suppressed_item_keys} warnings={result.warnings} onAdd={addTag} onRemove={removeTag} />)}
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-7 flex flex-col gap-4">
                    <div className="flex justify-between items-center px-1 gap-3"><h2 className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Icon name="Film" size={18} /> Shot List Timeline</h2><div className="flex gap-4"><button onClick={reset} className="text-[10px] font-bold text-gray-500 hover:text-white">RESET</button><button onClick={clearShots} className="text-[10px] font-bold text-red-500/80 hover:text-red-500">CLEAR</button><button onClick={exportCsv} className="text-[10px] font-bold text-blue-500 hover:text-blue-400">EXPORT CSV</button></div></div>
                    <div className="bg-[#121214] border border-gray-800 rounded-3xl flex-1 overflow-hidden shadow-inner flex flex-col">
                        <div ref={scrollContainerRef} className="overflow-y-auto max-h-[1200px] custom-scrollbar scroll-smooth">
                            <table className="w-full text-left text-xs border-separate border-spacing-0">
                                <thead className="bg-[#18181b] text-[9px] text-gray-500 uppercase font-black sticky top-0 z-20"><tr><th className="px-2 py-4 w-10 text-center">⇅</th><th className="px-5 py-4 w-12 text-center">#</th><th className="px-5 py-4">Visual Narrative</th><th className="px-5 py-4 w-24 text-right">Action</th></tr></thead>
                                <tbody>
                                    {!shots.length ? <tr><td colSpan="4" className="px-5 py-40 text-center text-gray-600 italic">尚未建立分鏡，請輸入 Scene / Action。</td></tr> : shots.map((shot, index) => {
                                        const selectedNames = [...Object.values(shot.state_snapshot && shot.state_snapshot.selections || {}), ...(shot.state_snapshot && shot.state_snapshot.tags || [])].map((key) => byKey.get(key)).filter(Boolean).slice(0, 9);
                                        return <tr key={shot.id} onPointerEnter={() => pointerMove(index)} className={`border-t border-gray-800/50 hover:bg-blue-600/5 ${dragIndex === index ? 'row-dragging' : ''}`}>
                                            <td className="px-2 py-6 text-center"><button className="drag-handle" onPointerDown={() => pointerDown(index)} onPointerUp={pointerUp}><Icon name="Menu" size={16} /></button></td>
                                            <td className="px-5 py-6 text-gray-600 font-black text-center">{index + 1}</td>
                                            <td className="px-5 py-6"><div className="font-black text-gray-100 mb-2 text-sm select-text">{shot.action}</div><div className="flex flex-wrap gap-1.5 mb-2">{selectedNames.map((item) => <span key={item.key} className="text-[8px] bg-blue-900/10 text-blue-400 px-1.5 py-0.5 rounded-lg border border-blue-900/30">{item.display_name}</span>)}{shot.legacy && <span className="text-[8px] text-amber-400 border border-amber-500/20 rounded-lg px-1.5">LEGACY READABLE</span>}</div><div className="text-[10px] text-blue-500/60 font-mono line-clamp-3 italic select-text">{shot.prompt}</div></td>
                                            <td className="px-5 py-6 text-right"><div className="flex justify-end gap-2"><button aria-label={`Copy shot ${index + 1}`} onClick={() => copyText(shot.prompt, () => { setCopyId(shot.id); setTimeout(() => setCopyId(null), 1500); })} className="p-2.5 rounded-xl bg-gray-800 text-gray-400 hover:text-white hover:bg-green-600">{copyId === shot.id ? <Icon name="Check" size={15} /> : <Icon name="Copy" size={15} />}</button><button aria-label={`Delete shot ${index + 1}`} onClick={() => setShots((previous) => previous.filter((item) => item.id !== shot.id))} className="p-2.5 rounded-xl bg-gray-800 text-gray-400 hover:text-white hover:bg-red-600"><Icon name="Trash2" size={15} /></button></div></td>
                                        </tr>;
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <footer className="text-[9px] text-gray-700 flex justify-between px-2 font-black"><div>STRUCTURED LIBRARY · SEMANTIC RESOLUTION · MODEL ADAPTERS</div><div>© 2026 CINEPROMPT MASTER</div></footer>
                </div>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
