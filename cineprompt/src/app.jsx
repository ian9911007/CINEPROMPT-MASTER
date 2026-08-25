const { useEffect, useMemo, useRef, useState } = React;

const library = window.CINEPROMPT_LIBRARY;
const compiler = window.CinePromptCompiler;
const storageMigration = window.CinePromptStorageMigration;
const exportApi = window.CinePromptExport;
const STORAGE_KEY = storageMigration.STORAGE_KEY;

const SINGLE_FIELDS = [
    ['capture_system', 'Capture System｜拍攝系統', 'Camera'],
    ['capture_medium', 'Capture Medium｜拍攝媒介', 'CircleDot'],
    ['primary_lens', 'Primary Lens｜主要鏡頭', 'Focus'],
    ['field_of_view', 'Field of View｜視野與焦距', 'Scan'],
    ['aperture_depth_of_field', 'Aperture / DoF｜光圈與景深', 'Aperture'],
    ['shot_size', 'Shot Size｜景別', 'Frame'],
    ['subject_orientation', 'Subject Orientation｜主體朝向', 'UserRound'],
    ['camera_height', 'Camera Height｜機位高度', 'MoveVertical'],
    ['camera_pitch', 'Camera Pitch｜鏡頭俯仰', 'MoveDiagonal'],
    ['camera_roll', 'Camera Roll｜鏡頭滾轉', 'RotateCw'],
    ['camera_position', 'Camera Position｜相機位置', 'MapPin'],
    ['projection', 'Projection｜投影方式', 'Orbit'],
    ['imaging_modality', 'Imaging Modality｜成像模態', 'Microscope'],
    ['color_response', 'Color Response｜色彩反應', 'Palette'],
    ['film_sensor_character', 'Film / Sensor Character｜底片與感光元件特性', 'Film'],
    ['film_process', 'Film Process｜底片沖印流程', 'FlaskConical'],
    ['color_grade', 'Color Grade｜調色', 'SlidersHorizontal'],
    ['aspect_ratio', 'Aspect Ratio｜畫面比例', 'Monitor']
];

const MULTI_GROUPS = [
    { label: 'Composition｜構圖', categories: ['composition', 'shot_purpose', 'camera_movement'], limit: 3, tone: 'text-sky-300', border: 'border-sky-500/25' },
    { label: 'Lighting｜燈光', categories: ['lighting_pattern', 'light_direction', 'light_quality', 'exposure_character'], limit: 4, tone: 'text-amber-300', border: 'border-amber-500/25' },
    { label: 'Optics & Effects｜光學與效果', categories: ['lens_character', 'optical_distortion', 'optical_filter', 'highlight_behavior', 'post_visual_effect'], limit: 3, tone: 'text-fuchsia-300', border: 'border-fuchsia-500/25' },
    { label: 'Image Character & Presets｜影像特性與預設', categories: ['grain_noise', 'image_character', 'creative_preset'], limit: 3, tone: 'text-violet-300', border: 'border-violet-500/25' }
];

const byKey = new Map(library.items.map((item) => [item.key, item]));
const DEFAULT_STATE = storageMigration.DEFAULT_STATE;
const normalizeState = storageMigration.normalizeState;
const storageApi = storageMigration.forLibrary(library);
const loadInitialState = () => storageApi.loadInitialState(localStorage);
const loadInitialShots = () => storageApi.loadInitialShots(localStorage);

const CATEGORY_COPY = {
    capture_system: '拍攝系統', capture_medium: '拍攝媒介', primary_lens: '主要鏡頭',
    field_of_view: '視野與焦距', aperture_depth_of_field: '光圈與景深', shot_size: '景別',
    shot_purpose: '鏡頭用途', subject_orientation: '主體朝向', composition: '構圖',
    camera_height: '機位高度', camera_pitch: '鏡頭俯仰', camera_roll: '鏡頭滾轉',
    camera_position: '相機位置', camera_distance: '相機與主體距離', projection: '投影方式',
    camera_movement: '運鏡', lens_character: '鏡頭特性', optical_distortion: '光學變形',
    optical_filter: '光學濾鏡', imaging_modality: '成像模態', lighting_pattern: '佈光方式',
    light_direction: '光線方向', light_quality: '光質', exposure_character: '曝光特性',
    color_response: '色彩反應', film_sensor_character: '底片與感光元件特性', film_process: '底片沖印流程',
    grain_noise: '顆粒與雜訊', highlight_behavior: '高光表現', color_grade: '調色',
    image_character: '影像特性', post_visual_effect: '後期與視覺效果', aspect_ratio: '畫面比例',
    creative_preset: '創意預設'
};

const CATEGORY_TONE = {
    capture_system: 'text-cyan-300', capture_medium: 'text-cyan-300', primary_lens: 'text-violet-300',
    field_of_view: 'text-sky-300', aperture_depth_of_field: 'text-amber-300', shot_size: 'text-rose-300',
    subject_orientation: 'text-rose-300', camera_height: 'text-sky-300', camera_pitch: 'text-sky-300',
    camera_roll: 'text-sky-300', camera_position: 'text-sky-300', projection: 'text-fuchsia-300',
    imaging_modality: 'text-emerald-300', color_response: 'text-pink-300', film_sensor_character: 'text-orange-300',
    film_process: 'text-orange-300', color_grade: 'text-pink-300', aspect_ratio: 'text-lime-300'
};

const MODEL_COPY = {
    nano_banana_pro: { name: 'Nano Banana Pro｜高密度影像生成', description: '以分區式攝影語意輸出，適合保留較完整的鏡頭、燈光與影像特性控制。' },
    nano_banana_2: { name: 'Nano Banana 2｜高密度影像生成', description: '以分區式攝影語意輸出，適合保留較完整的鏡頭、燈光與影像特性控制。' },
    image_2: { name: 'Image 2.0｜自然語言影像生成', description: '以連貫自然語言輸出影像指示，避免加入模型專屬的指令語法。' },
    generic: { name: 'Generic｜通用模型', description: '以模型中立的攝影語意輸出，供未列出的影像模型使用。' }
};

const FORMAT_COPY = {
    full_frame_35mm: '全片幅 35 毫米', aps_c_reference: 'APS-C 參考格式', micro_four_thirds: 'M43 格式',
    medium_645_reference: '645 參考片幅', six_by_six_reference: '6×6 參考片幅',
    six_by_seven_reference: '6×7 參考片幅', four_by_five_reference: '4×5 參考片幅', eight_by_ten_reference: '8×10 參考片幅'
};

function localizedName(item) {
    if (item.localized_name && item.localized_name !== item.display_name) return `${item.display_name}｜${item.localized_name}`;
    if (['field_of_view', 'aperture_depth_of_field', 'aspect_ratio'].includes(item.category)) return item.display_name;
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
    if (mm <= 14) return `超廣角視野，誇張近大遠小與空間延伸，適合強烈透視與大場景。`;
    if (mm <= 24) return `廣角視野，能保留環境脈絡與前景張力，適合空間、建築與動態構圖。`;
    if (mm <= 40) return `自然偏廣的視野，兼顧主體與環境，適合紀實與敘事畫面。`;
    if (mm <= 58) return `接近自然觀看感的視野，透視穩定，適合日常人像與主體敘事。`;
    if (mm <= 135) return `中長焦視野，壓縮前後景並更聚焦主體，適合人像與細節。`;
    return `超望遠視野，強烈壓縮前後景並隔離遠距主體，適合運動、野生動物與遠景細節。`;
}

function apertureDescription(item) {
    const f = Number.parseFloat(String(item.id).replace('f/', ''));
    if (f <= 1.2) return `極淺景深與明顯散景，主體分離感強，低光環境也較容易維持曝光。`;
    if (f <= 2.8) return `淺景深與柔和散景，保留主體辨識度，同時弱化背景干擾。`;
    if (f <= 5.6) return `景深較均衡，主體與部分環境都能維持清楚，適合一般敘事與產品畫面。`;
    if (f <= 11) return `較深景深，前後景細節更完整，適合場景、建築與群像。`;
    return `極深景深，前後景都較清楚，但繞射可能降低細節銳利度。`;
}

function localizedDescription(item) {
    const category = CATEGORY_COPY[item.category] || '影像控制';
    if (item.category === 'field_of_view') return focalDescription(item);
    if (item.category === 'aperture_depth_of_field') return apertureDescription(item);
    if (item.category === 'aspect_ratio') return `設定 ${item.display_name} 畫面比例，改變橫直畫幅與可用構圖空間。`;
    const visualDescription = item.historical_context || item.definition;
    if (/[\u3400-\u9fff]/.test(visualDescription || '')) return normalizeChinesePunctuation(visualDescription);
    return `此選項控制「${category}」的畫面呈現。`;
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
    return <i data-lucide={name.toLowerCase()} style={{ width: size, height: size }} className={`inline-block ${className}`}></i>;
}

function SelectControl({ category, label, icon, value, onChange }) {
    const options = library.items.filter((item) => item.category === category && !item.deprecated && item.id !== 'none');
    return (
        <div className="space-y-1.5 min-w-0">
            <label className={`mobile-label text-xs font-black uppercase flex items-center gap-1 tracking-wider ${CATEGORY_TONE[category] || 'text-gray-400'}`}>
                <Icon name={icon} size={13} /> {label}
            </label>
            <select value={value || ''} onChange={(event) => onChange(category, event.target.value)} className="w-full bg-[#1c1c1e] border border-gray-700 rounded-xl h-12 px-3 outline-none cursor-pointer text-gray-200">
                <option value="" title="不指定此項控制，交由其他已選影像條件決定。">N/A｜不指定</option>
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
                <label className={`text-xs font-black uppercase tracking-widest ${group.tone}`}>{group.label}</label>
                <select disabled={atLimit} value="" onChange={(event) => { if (event.target.value) onAdd(event.target.value); }} className={`max-w-[58%] bg-[#111113] border rounded-lg h-10 px-3 text-sm text-blue-300 disabled:cursor-not-allowed disabled:text-gray-600 ${atLimit ? 'border-amber-500/40' : 'border-gray-700'}`}>
                    <option value="" title={`新增一項「${group.label.split('｜')[1]}」控制。`}>+ Add｜新增</option>
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
            <summary className="cursor-pointer px-4 py-3 text-[10px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-2"><Icon name="Library" size={14} /> Knowledge Library Explorer｜知識資料庫瀏覽器</summary>
            <div className="p-4 pt-1 space-y-3">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search equipment, optics, process, modality, effect...｜搜尋器材、光學、流程、成像模態與效果…" className="w-full bg-[#18181b] border border-gray-800 rounded-xl h-10 px-3 text-xs outline-none focus:border-violet-500/50 select-text" />
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
        if (window.confirm('確定要重置所有控制與參考圖設定嗎？')) setState(normalizeState(DEFAULT_STATE));
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

    const coreCategories = ['capture_system', 'primary_lens', 'field_of_view', 'aperture_depth_of_field', 'shot_size', 'aspect_ratio'];
    const advancedCategories = SINGLE_FIELDS.filter(([category]) => !coreCategories.includes(category));
    const fov = result.metadata && result.metadata.horizontal_fov_degrees;

    return (
        <div className="min-h-screen bg-[#070708] text-gray-200 font-sans p-2 md:p-6 pb-20 select-none">
            <div className="max-w-screen-2xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
                <div className="xl:col-span-5 space-y-4">
                    <header className="flex items-center justify-between px-2 pt-2 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-blue-600 p-2 rounded-xl shadow-lg border border-blue-400/20"><Icon name="Clapperboard" size={24} className="text-white" /></div>
                            <div className="min-w-0"><h1 className="text-lg font-black tracking-tighter text-white uppercase leading-none truncate">CINEPROMPT MASTER</h1><p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mt-1">V4.0 · CINEMATOGRAPHY ONTOLOGY COMPILER</p></div>
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
                                <label className="text-xs font-black text-indigo-300 uppercase flex items-center gap-1 tracking-wider"><Icon name="Cpu" size={13} /> Target Model｜目標模型</label>
                                <select value={state.model_profile} onChange={(event) => setState((previous) => ({ ...previous, model_profile: event.target.value }))} className="w-full bg-[#1c1c1e] border border-gray-800 rounded-xl h-11 px-3 text-gray-300">
                                    {library.model_profiles.map((profile) => <option key={profile.id} value={profile.id} title={(MODEL_COPY[profile.id] || {}).description}>{(MODEL_COPY[profile.id] || {}).name || profile.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-teal-300 uppercase flex items-center gap-1 tracking-wider"><Icon name="ScanLine" size={13} /> Field-of-View Reference Gate｜視野換算片幅</label>
                                <select value={state.reference_format} onChange={(event) => setState((previous) => ({ ...previous, reference_format: event.target.value }))} className="w-full bg-[#1c1c1e] border border-gray-800 rounded-xl h-11 px-3 text-gray-300">
                                    {library.reference_formats.map((format) => <option key={format.id} value={format.id} title={`將同一焦距換算為 ${FORMAT_COPY[format.id] || '參考片幅'} 的水平視野角度；此角度會寫入提示詞，不改變主體透視。`}>{format.name}｜{FORMAT_COPY[format.id] || '參考片幅'}</option>)}
                                </select>
                            </div>
                        </div>

                        <label className="flex items-center justify-between bg-[#18181b] border border-gray-800 rounded-xl px-3 py-2.5 cursor-pointer">
                            <span><span className="block text-xs font-black text-gray-300 uppercase">Literal Gear Token｜器材名稱權杖</span><span className="block text-[11px] text-gray-500">關閉時只使用已確認的視覺結果，開啟後允許在提示詞中實驗性保留器材名稱。</span></span>
                            <input type="checkbox" checked={state.literal_gear_token} onChange={(event) => setState((previous) => ({ ...previous, literal_gear_token: event.target.checked }))} />
                        </label>

                        <div className="bg-[#18181b] border border-blue-900/20 rounded-2xl p-4">
                            <div className="flex justify-between items-center mb-2 gap-2">
                                <div><label className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Icon name="Brain" size={12} /> Live Semantic Prompt｜即時語意提示詞</label>{fov != null && <span className="text-[11px] text-gray-500">視野換算：{fov}° 水平視野，{FORMAT_COPY[result.metadata.reference_format.id] || result.metadata.reference_format.name}。</span>}</div>
                                <div className="flex gap-2"><button onClick={addShot} disabled={!state.action.trim()} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-full disabled:bg-gray-800 disabled:text-gray-600"><Icon name="Plus" size={11} /> ADD｜新增分鏡</button><button onClick={() => copyText(result.prompt, () => { setCopyId('live'); setTimeout(() => setCopyId(null), 1500); })} disabled={!state.action.trim()} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-full disabled:bg-gray-800 disabled:text-gray-600">{copyId === 'live' ? 'COPIED｜已複製' : 'COPY｜複製'}</button></div>
                            </div>
                            <div className="font-mono text-xs leading-relaxed text-gray-300 max-h-[170px] overflow-y-auto custom-scrollbar select-text">{result.prompt}</div>
                        </div>

                        <WarningPanel warnings={result.warnings} migrationWarnings={state.migration_warnings} />

                        <div className="bg-[#18181b] border border-gray-800/50 rounded-2xl p-4 space-y-3">
                            <label className="text-xs font-black text-blue-400 uppercase flex items-center gap-2 tracking-widest"><Icon name="Layers" size={14} /> Reference Authority｜參考圖權限</label>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                                {Object.entries({ person: '人物參考', product: '產品參考', environment: '環境參考', style: '風格參考' }).map(([key, label]) => <label key={key} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={state.references[key]} onChange={(event) => changeReference(key, event.target.checked)} /><span className="text-[13px] font-bold text-gray-400">{label}</span></label>)}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {SINGLE_FIELDS.filter(([category]) => coreCategories.includes(category)).map(([category, label, icon]) => <SelectControl key={category} category={category} label={label} icon={icon} value={state.selections[category]} onChange={selectItem} />)}
                        </div>

                        <details className="bg-[#18181b] border border-gray-800 rounded-2xl">
                            <summary className="cursor-pointer px-4 py-3 text-xs font-black text-fuchsia-300 uppercase tracking-widest">Advanced Physical & Response Controls｜進階物理與影像反應控制</summary>
                            <div className="p-4 pt-1 grid grid-cols-2 md:grid-cols-3 gap-3">
                                {advancedCategories.map(([category, label, icon]) => <SelectControl key={category} category={category} label={label} icon={icon} value={state.selections[category]} onChange={selectItem} />)}
                            </div>
                        </details>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {MULTI_GROUPS.map((group) => <ChipPicker key={group.label} group={group} selectedKeys={state.tags} effectiveKeys={result.effective_item_keys} suppressedKeys={result.suppressed_item_keys} warnings={result.warnings} onAdd={addTag} onRemove={removeTag} />)}
                        </div>

                        <LibraryExplorer state={state} onSelect={selectItem} onAddTag={addTag} onRemoveTag={removeTag} />
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
