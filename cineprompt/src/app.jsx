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
    { label: 'Composition｜構圖', categories: ['composition', 'shot_purpose', 'camera_movement'] },
    { label: 'Lighting｜燈光', categories: ['lighting_pattern', 'light_direction', 'light_quality', 'exposure_character'] },
    { label: 'Optics & Effects｜光學與效果', categories: ['lens_character', 'optical_distortion', 'optical_filter', 'highlight_behavior', 'post_visual_effect'] },
    { label: 'Image Character & Presets｜影像特性與預設', categories: ['grain_noise', 'image_character', 'creative_preset'] }
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
    if (item.category === 'field_of_view') return `${item.display_name}｜${item.display_name.replace('mm', ' 毫米')}`;
    if (item.category === 'aperture_depth_of_field') return `${item.display_name}｜${item.display_name} 光圈`;
    if (item.category === 'aspect_ratio') return `${item.display_name}｜${item.display_name.replace(':', ' 比 ')}`;
    return item.display_name;
}

function localizedDescription(item) {
    const name = item.localized_name || item.display_name;
    const category = CATEGORY_COPY[item.category] || '影像控制';
    if (/^Catalog identity retained for /.test(item.definition || '')) {
        return `保留「${name}」的目錄身分；舊有視覺關聯尚未完整驗證，提示詞只採用已確認的影像語意，不將器材名稱當作畫面主體。`;
    }
    if (/ control$/.test(item.definition || '')) {
        if (item.category === 'field_of_view') return `以 ${item.display_name} 焦距設定視野與壓縮感；透視仍由相機與主體距離決定。`;
        if (item.category === 'aperture_depth_of_field') return `以 ${item.display_name} 光圈控制景深與散景；實際可用範圍會受所選鏡頭限制。`;
        return `用於設定「${category}」的控制值。`;
    }
    if (/ aspect ratio$/.test(item.definition || '')) return `設定 ${item.display_name} 畫面比例，影響影像的水平與垂直構圖空間。`;
    return item.definition || `用於控制「${category}」的影像語意。`;
}

function Icon({ name, size = 16, className = '' }) {
    return <i data-lucide={name.toLowerCase()} style={{ width: size, height: size }} className={`inline-block ${className}`}></i>;
}

function SelectControl({ category, label, icon, value, onChange }) {
    const options = library.items.filter((item) => item.category === category && !item.deprecated && item.id !== 'none');
    return (
        <div className="space-y-1.5 min-w-0">
            <label className="mobile-label text-[10px] font-black text-gray-500 uppercase flex items-center gap-1 tracking-wider">
                <Icon name={icon} size={13} /> {label}
            </label>
            <select value={value || ''} onChange={(event) => onChange(category, event.target.value)} className="w-full bg-[#1c1c1e] border border-gray-800 rounded-xl h-11 px-3 outline-none cursor-pointer text-gray-300">
                <option value="" title="不指定此項控制，交由其他已選影像條件決定。">N/A｜不指定</option>
                {options.map((item) => (
                    <option key={item.key} value={item.key} title={localizedDescription(item)}>{localizedName(item)}</option>
                ))}
            </select>
        </div>
    );
}

function ChipPicker({ group, selectedKeys, onAdd, onRemove }) {
    const options = library.items.filter((item) => group.categories.includes(item.category) && !item.deprecated && item.id !== 'none');
    const selected = selectedKeys.map((key) => byKey.get(key)).filter((item) => item && group.categories.includes(item.category));
    return (
        <div className="bg-[#18181b] border border-gray-800/70 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{group.label}</label>
                <select value="" onChange={(event) => { if (event.target.value) onAdd(event.target.value); }} className="max-w-[55%] bg-[#111113] border border-gray-800 rounded-lg h-8 px-2 text-[10px] text-blue-400">
                    <option value="" title={`新增一項「${group.label.split('｜')[1]}」控制。`}>+ Add｜新增</option>
                    {options.filter((item) => !selectedKeys.includes(item.key)).map((item) => <option key={item.key} value={item.key} title={localizedDescription(item)}>{localizedName(item)}</option>)}
                </select>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-7">
                {selected.length ? selected.map((item) => (
                    <button key={item.key} onClick={() => onRemove(item.key)} title={`${localizedDescription(item)}\n控制範圍：${item.controls.map((control) => CATEGORY_COPY[control] || control).join('、')}`} className="text-[9px] bg-blue-600/10 text-blue-300 border border-blue-500/20 px-2 py-1 rounded-full hover:bg-red-600/20 hover:text-red-300 transition-colors">
                        {localizedName(item)} ×
                    </button>
                )) : <span className="text-[9px] text-gray-700">No active traits｜尚未選擇特性</span>}
            </div>
        </div>
    );
}

function WarningPanel({ warnings, migrationWarnings }) {
    const all = [
        ...(migrationWarnings || []).map((detail) => ({ severity: 'warning', title: 'Legacy migration warning', detail, resolution: 'Unknown values were ignored without breaking the shot.' })),
        ...(warnings || [])
    ];
    if (!all.length) return null;
    const tone = { conflict: 'border-red-500/30 text-red-300', warning: 'border-amber-500/30 text-amber-300', info: 'border-blue-500/20 text-blue-300' };
    return (
        <div className="space-y-2">
            {all.map((entry, index) => (
                <div key={`${entry.title}-${index}`} className={`bg-[#18181b] border rounded-xl p-3 ${tone[entry.severity] || tone.info}`}>
                    <div className="text-[10px] font-black uppercase tracking-wider">{entry.title}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{entry.detail}</div>
                    <div className="text-[9px] text-gray-600 mt-1">Resolution: {entry.resolution}</div>
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
                        const toggle = () => mode === 'single' ? onSelect(item.category, isActive ? '' : item.key) : isActive ? onRemoveTag(item.key) : onAddTag(item.key);
                        return (
                            <button key={item.key} onClick={toggle} className={`w-full text-left rounded-xl border p-3 transition-colors ${isActive ? 'bg-violet-600/15 border-violet-500/40' : 'bg-[#18181b] border-gray-800 hover:border-violet-500/30'}`}>
                                <div className="flex justify-between gap-3"><span className="text-[11px] text-gray-200 font-bold">{localizedName(item)}</span><span className="text-[8px] text-violet-400 uppercase">{CATEGORY_COPY[item.category] || item.category}</span></div>
                                <div className="text-[9px] text-gray-500 mt-1">{localizedDescription(item)}</div>
                                <div className="text-[8px] text-gray-700 mt-1">控制範圍：{item.controls.map((control) => CATEGORY_COPY[control] || control).join('、')} · 信心等級：{item.confidence}</div>
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
    const addTag = (key) => setState((previous) => ({ ...previous, tags: previous.tags.includes(key) ? previous.tags : [...previous.tags, key] }));
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
                                <label className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-1 tracking-wider"><Icon name="Cpu" size={13} /> Target Model｜目標模型</label>
                                <select value={state.model_profile} onChange={(event) => setState((previous) => ({ ...previous, model_profile: event.target.value }))} className="w-full bg-[#1c1c1e] border border-gray-800 rounded-xl h-11 px-3 text-gray-300">
                                    {library.model_profiles.map((profile) => <option key={profile.id} value={profile.id} title={(MODEL_COPY[profile.id] || {}).description}>{(MODEL_COPY[profile.id] || {}).name || profile.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-1 tracking-wider"><Icon name="ScanLine" size={13} /> Reference Format / Gate｜參考片幅</label>
                                <select value={state.reference_format} onChange={(event) => setState((previous) => ({ ...previous, reference_format: event.target.value }))} className="w-full bg-[#1c1c1e] border border-gray-800 rounded-xl h-11 px-3 text-gray-300">
                                    {library.reference_formats.map((format) => <option key={format.id} value={format.id} title={`使用 ${format.name} 作為水平視野計算的參考片幅；此設定不改變主體透視。`}>{format.name}｜{FORMAT_COPY[format.id] || '參考片幅'}</option>)}
                                </select>
                            </div>
                        </div>

                        <label className="flex items-center justify-between bg-[#18181b] border border-gray-800 rounded-xl px-3 py-2.5 cursor-pointer">
                            <span><span className="block text-[10px] font-black text-gray-300 uppercase">Literal Gear Token｜器材名稱權杖</span><span className="block text-[9px] text-gray-600">關閉時僅使用已確認的視覺結果；開啟後允許在提示詞中實驗性保留器材身分。</span></span>
                            <input type="checkbox" checked={state.literal_gear_token} onChange={(event) => setState((previous) => ({ ...previous, literal_gear_token: event.target.checked }))} />
                        </label>

                        <div className="bg-[#18181b] border border-blue-900/20 rounded-2xl p-4">
                            <div className="flex justify-between items-center mb-2 gap-2">
                                <div><label className="text-[11px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2"><Icon name="Brain" size={12} /> Live Semantic Prompt</label>{fov != null && <span className="text-[8px] text-gray-600">FoV metadata: {fov}° horizontal on {result.metadata.reference_format.name}</span>}</div>
                                <div className="flex gap-2"><button onClick={addShot} disabled={!state.action.trim()} className="text-[9px] bg-blue-600 text-white px-3 py-1 rounded-full disabled:bg-gray-800 disabled:text-gray-600"><Icon name="Plus" size={10} /> ADD SHOT</button><button onClick={() => copyText(result.prompt, () => { setCopyId('live'); setTimeout(() => setCopyId(null), 1500); })} disabled={!state.action.trim()} className="text-[9px] bg-green-600 text-white px-3 py-1 rounded-full disabled:bg-gray-800 disabled:text-gray-600">{copyId === 'live' ? 'COPIED' : 'COPY'}</button></div>
                            </div>
                            <div className="font-mono text-[10px] leading-relaxed text-gray-400 max-h-[170px] overflow-y-auto custom-scrollbar select-text">{result.prompt}</div>
                        </div>

                        <WarningPanel warnings={result.warnings} migrationWarnings={state.migration_warnings} />

                        <div className="bg-[#18181b] border border-gray-800/50 rounded-2xl p-4 space-y-3">
                            <label className="text-[10px] font-black text-blue-400 uppercase flex items-center gap-2 tracking-widest"><Icon name="Layers" size={14} /> Reference Authority</label>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                                {Object.entries({ person: '人物參考', product: '產品參考', environment: '環境參考', style: '風格參考' }).map(([key, label]) => <label key={key} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={state.references[key]} onChange={(event) => changeReference(key, event.target.checked)} /><span className="text-[13px] font-bold text-gray-400">{label}</span></label>)}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {SINGLE_FIELDS.filter(([category]) => coreCategories.includes(category)).map(([category, label, icon]) => <SelectControl key={category} category={category} label={label} icon={icon} value={state.selections[category]} onChange={selectItem} />)}
                        </div>

                        <details className="bg-[#18181b] border border-gray-800 rounded-2xl">
                            <summary className="cursor-pointer px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Advanced Physical & Response Controls｜進階物理與影像反應控制</summary>
                            <div className="p-4 pt-1 grid grid-cols-2 md:grid-cols-3 gap-3">
                                {advancedCategories.map(([category, label, icon]) => <SelectControl key={category} category={category} label={label} icon={icon} value={state.selections[category]} onChange={selectItem} />)}
                            </div>
                        </details>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {MULTI_GROUPS.map((group) => <ChipPicker key={group.label} group={group} selectedKeys={state.tags} onAdd={addTag} onRemove={removeTag} />)}
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
