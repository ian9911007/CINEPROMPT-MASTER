const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const base = path.resolve(__dirname, '..');
const library = require(path.join(base, 'library', 'cineprompt-library.js'));
const compiler = require(path.join(base, 'src', 'compiler.js'));
const storageMigration = require(path.join(base, 'src', 'storage-migration.js'));
const migration = storageMigration.forLibrary(library);
const exportApi = require(path.join(base, 'src', 'export.js'));

const forbidden = /(?:\b(?:8K|12K|16K|32K|32-bit|HDR|\d+MP)\b|clinical sharpness|zero grain|maximum detail|masterpiece|shot on|shot with)/i;
const cases = [];

function run(name, fn) {
    fn();
    cases.push({ name, status: 'PASS' });
}

function state(overrides = {}) {
    return {
        action: 'A ceramic vessel on a quiet worktable',
        model_profile: 'generic',
        reference_format: 'full_frame_35mm',
        literal_gear_token: false,
        selections: { aspect_ratio: 'aspectRatios:4:5', ...(overrides.selections || {}) },
        tags: overrides.tags || [],
        references: overrides.references || {},
        ...Object.fromEntries(Object.entries(overrides).filter(([key]) => !['selections', 'tags', 'references'].includes(key)))
    };
}

function compile(overrides) {
    return compiler.compile(library, state(overrides));
}

run('full-library entry audit and schema', () => {
    assert.ok(library.items.length >= 800);
    assert.equal(library.audit_summary.audited_entries, library.items.length);
    assert.equal(new Set(library.items.map((item) => item.key)).size, library.items.length);
    for (const item of library.items) {
        for (const field of ['controls', 'does_not_control', 'conflicts_with', 'suppresses', 'semantic_traits', 'negative_semantics']) assert.ok(Array.isArray(item[field]), `${item.key}: ${field}`);
        assert.equal(item.audit.status, 'audited');
        assert.equal(Object.prototype.hasOwnProperty.call(item, 'prompt'), false, `${item.key} must not contain a monolithic prompt`);
    }
});

run('protected Aspect Ratio dataset and semantics remain byte-stable', () => {
    const protectedAspect = {
        category: library.categories.aspect_ratio,
        items: library.items.filter((item) => item.category === 'aspect_ratio')
    };
    const hash = crypto.createHash('sha256').update(JSON.stringify(protectedAspect)).digest('hex');
    assert.equal(hash, '8ad2e5d50970f4fb79018585f4908276aac778a2f68a5ada1a4811701d58a68a');
    assert.equal(protectedAspect.items.length, 14);
});

run('user-facing category groups consolidate without destroying canonical categories', () => {
    assert.deepEqual(Object.keys(library.ui_category_groups), [
        'camera_capture', 'lens_optics', 'camera_geometry', 'photographic_technique',
        'composition', 'lighting', 'color_grading', 'image_character_effects'
    ]);
    assert.ok(library.ui_category_groups.camera_capture.categories.includes('imaging_modality'));
    assert.ok(library.ui_category_groups.lens_optics.categories.includes('projection'));
    assert.deepEqual(library.ui_category_groups.composition.categories, ['composition']);
    assert.equal(library.categories.color_grade.selection_mode, 'multi');
});

run('shutter range is first-class, complete, and equipment-safe', () => {
    const shutter = library.items.filter((item) => item.category === 'shutter_speed');
    assert.equal(shutter.length, 30);
    for (const key of ['shutters:bulb', 'shutters:60s', 'shutters:1_2s', 'shutters:1_60s', 'shutters:1_1000s', 'shutters:approx_1_10000s', 'shutters:approx_1_100000s_simulation']) {
        assert.ok(shutter.some((item) => item.key === key), key);
    }
    const ultra = shutter.find((item) => item.key === 'shutters:approx_1_100000s_simulation');
    assert.ok(ultra.semantic_traits.some((trait) => /visual simulation/i.test(trait.text)));
    const compiled = compile({ selections: { shutter_speed: 'shutters:30s' } });
    assert.ok(/30 s exposure-time control/i.test(compiled.prompt));
    assert.ok(!/star trail|traffic|waterfall/i.test(compiled.prompt));
});

run('photographic techniques and composition are production-useful families', () => {
    const techniques = library.items.filter((item) => item.category === 'photographic_technique' && !item.deprecated);
    const composition = library.items.filter((item) => item.category === 'composition' && !item.deprecated);
    assert.equal(techniques.length, 20);
    assert.equal(composition.length, 27);
    for (const key of ['techniques:panning', 'techniques:star_trails', 'techniques:focus_stacking', 'techniques:rear_curtain_sync', 'techniques:extreme_macro_photography', 'luts:double_exposure']) assert.ok(techniques.some((item) => item.key === key), key);
    for (const key of ['composition:rule_of_thirds', 'composition:leading_lines', 'composition:golden_spiral', 'composition:negative_space', 'composition:layered_planes', 'composition:visual_hierarchy']) assert.ok(composition.some((item) => item.key === key), key);
    assert.equal(library.items.find((item) => item.key === 'cameras:isometric_camera').category, 'projection');
    assert.equal(library.items.find((item) => item.key === 'perspectives:flatlay').category, 'camera_pitch');
    assert.equal(library.items.find((item) => item.key === 'perspectives:ots').category, 'camera_position');
});

run('clean modern commercial image', () => {
    const result = compile({ selections: { capture_system: 'cameras:sony_a7r5', primary_lens: 'lenses:sony_35_gm', field_of_view: 'focals:35mm', aperture_depth_of_field: 'apertures:f/2.0' }, tags: ['lighting:softbox_l', 'lighting:negative_fill'] });
    assert.ok(result.prompt.includes('softbox'));
    assert.ok(!forbidden.test(result.prompt));
});

run('vintage optical image', () => {
    const result = compile({ selections: { primary_lens: 'lenses:helios_44_2', field_of_view: 'focals:58mm' } });
    assert.ok(/bokeh|vignett|flare|optical/i.test(result.prompt));
    assert.ok(!/Helios/i.test(result.prompt));
});

run('analog film and early-digital profiles do not receive fidelity spam', () => {
    const analog = compile({ selections: { film_sensor_character: 'luts:kodak_portra_400' } });
    const early = compile({ selections: { capture_system: 'cameras:vx1000' } });
    assert.ok(!forbidden.test(`${analog.prompt} ${early.prompt}`));
});

run('extreme telephoto uses causal distance semantics and format-aware FoV', () => {
    const full = compile({ selections: { field_of_view: 'focals:600mm' } });
    const small = compile({ reference_format: 'micro_four_thirds', selections: { field_of_view: 'focals:600mm' } });
    assert.ok(/greater camera-to-subject distance/i.test(full.prompt));
    assert.ok(full.metadata.horizontal_fov_degrees > small.metadata.horizontal_fov_degrees);
    assert.ok(full.prompt.includes('Full Frame 35mm reference gate'));
    assert.ok(small.prompt.includes('Micro Four Thirds reference gate'));
    assert.notEqual(full.prompt, small.prompt);
    assert.ok(!/focal length causes perspective/i.test(full.prompt));
});

run('fisheye and telephoto physical conflict', () => {
    const result = compile({ selections: { projection: 'lenses:generic_fisheye', field_of_view: 'focals:200mm' } });
    assert.ok(result.warnings.some((entry) => entry.type === 'physical_conflict'));
    assert.ok(result.suppressed_item_keys.includes('lenses:generic_fisheye'));
});

run('scientific modality suppresses normal color response', () => {
    const result = compile({ selections: { imaging_modality: 'cameras:thermal_imaging', color_response: 'luts:hassy_hncs' } });
    assert.ok(result.suppressed_item_keys.includes('luts:hassy_hncs'));
    assert.ok(result.warnings.some((entry) => entry.type === 'semantic_conflict'));
});

run('multi-light chips coexist while exclusive lighting conflicts warn', () => {
    const compatible = compile({ tags: ['lighting:rimlight_l', 'lighting:negative_fill', 'lighting:softbox_l'] });
    assert.ok(/rim|negative fill|softbox/i.test(compatible.prompt));
    const conflict = compile({ tags: ['lighting:highkey_l', 'lighting:lowkey_l'] });
    assert.ok(conflict.warnings.some((entry) => entry.type === 'semantic_conflict'));
});

run('shutter and technique interactions warn without rigidly rejecting creative combinations', () => {
    const panning = compile({ selections: { shutter_speed: 'shutters:1_8000s' }, tags: ['techniques:panning'] });
    assert.ok(panning.warnings.some((entry) => entry.type === 'technique_interaction'));
    assert.ok(panning.effective_item_keys.includes('shutters:1_8000s'));
    assert.ok(panning.effective_item_keys.includes('techniques:panning'));

    const stacked = compile({ selections: { aperture_depth_of_field: 'apertures:f/1.4' }, tags: ['techniques:focus_stacking'] });
    assert.ok(stacked.suppressed_item_keys.includes('apertures:f/1.4'));
    assert.ok(/focus-stacked composite depth/i.test(stacked.prompt));
    assert.ok(!/aperture f\/1\.4/i.test(stacked.prompt));
});

run('umbrella image effects suppress duplicate selected primitives', () => {
    const result = compile({ tags: ['luts:vhs_glitch', 'image_character:analog_scanlines'] });
    assert.ok(result.suppressed_item_keys.includes('image_character:analog_scanlines'));
    assert.ok(result.warnings.some((entry) => entry.type === 'semantic_suppression'));
});

run('historical lens aperture and focal conflicts resolve without impossible output', () => {
    const result = compile({ selections: { primary_lens: 'lenses:canon_dream', field_of_view: 'focals:85mm', aperture_depth_of_field: 'apertures:f/0.7' } });
    assert.ok(result.warnings.filter((entry) => entry.type === 'physical_conflict').length >= 2);
    assert.ok(/f\/0\.95/i.test(result.prompt));
    assert.ok(!/aperture around f\/0\.7/i.test(result.prompt));
});

run('reference authority compiles without subject booster', () => {
    const result = compile({ action: 'A woman holding a product bottle', references: { person: true, product: true }, tags: ['composition:golden_spiral', 'highlight:highlight_bloom'] });
    assert.ok(/preserve character identity/i.test(result.prompt));
    assert.ok(/preserve exact product geometry/i.test(result.prompt));
    assert.ok(!/pore-level|masterful studio portrait|premium commercial product/i.test(result.prompt));
});

run('model adapters produce distinct supported structures', () => {
    const tags = ['lighting:rimlight_l', 'techniques:panning'];
    const nano = compile({ model_profile: 'nano_banana_pro', tags });
    const image2 = compile({ model_profile: 'image_2', tags });
    const generic = compile({ model_profile: 'generic', tags });
    assert.ok(nano.prompt.startsWith('Scene:'));
    assert.ok(image2.prompt.startsWith('A ceramic'));
    assert.ok(generic.prompt.startsWith('Scene:'));
    assert.equal([nano.prompt, image2.prompt, generic.prompt].every((prompt) => !prompt.includes('--ar')), true);
    assert.ok(nano.prompt.includes('Photographic Technique:'));
    assert.ok(/Render motion and exposure through/i.test(image2.prompt));
    assert.ok(generic.prompt.includes('Photographic Technique:'));
});

run('Literal Gear Token behavior remains opt-in after UI relocation', () => {
    const selections = { capture_system: 'cameras:sony_a7r5' };
    const semanticOnly = compile({ selections, literal_gear_token: false });
    const literal = compile({ selections, literal_gear_token: true });
    assert.ok(!/Sony A7R V/i.test(semanticOnly.prompt));
    assert.ok(/Sony A7R V/i.test(literal.prompt));
});

run('Nano Banana profiles share one visible menu option while old state remains compatible', () => {
    assert.deepEqual(library.model_profiles.filter((profile) => profile.id.startsWith('nano_banana')), [
        library.model_profiles.find((profile) => profile.id === 'nano_banana_pro')
    ]);
    assert.equal(storageMigration.normalizeState({ model_profile: 'nano_banana_2' }).model_profile, 'nano_banana_pro');
});

run('legacy localStorage migration remains readable and unknown IDs degrade gracefully', () => {
    const migrated = migration.migrateLegacyRecord({ action: 'Legacy', camera: 'thermal_imaging', lens: 'canon_dream', focal: '50mm', aperture: 'f/0.7', lut: 'missing_lut', lighting: 'rimlight_l', shotType: 'MCU', perspective: 'eye', aspect: '16:9', refPerson: true });
    assert.equal(migrated.selections.imaging_modality, 'cameras:thermal_imaging');
    assert.equal(migrated.selections.primary_lens, 'lenses:canon_dream');
    assert.ok(migrated.tags.includes('lighting:rimlight_l'));
    assert.ok(migrated.migration_warnings.length === 1);
    const storage = { getItem: (key) => key.endsWith('_list') ? JSON.stringify([{ id: 1, action: 'Old shot', prompt: 'old readable prompt' }]) : null };
    assert.equal(migration.loadInitialShots(storage)[0].prompt, 'old readable prompt');
});

run('current-state migration preserves reclassified keys and multi-select color grades', () => {
    const canonicalize = storageMigration.forLibrary(library).canonicalizeState;
    const migrated = canonicalize({
        selections: { color_grade: 'luts:teal_orange' },
        tags: ['cameras:isometric_camera', 'shotTypes:TwoShot'],
        references: { product: true },
        literal_gear_token: true,
        reference_format: 'medium_645_reference'
    });
    assert.ok(migrated.tags.includes('luts:teal_orange'));
    assert.equal(migrated.selections.projection, 'cameras:isometric_camera');
    assert.equal(migrated.selections.subject_arrangement, 'shotTypes:TwoShot');
    assert.equal(migrated.reference_format, 'medium_645_reference');
    assert.equal(migrated.literal_gear_token, true);
    assert.equal(migrated.references.product, true);
});

run('CSV export serialization preserves prompt text and escapes spreadsheet cells', () => {
    const shots = [{ action: 'Glass, metal', model_profile: 'image_2', schema_version: '4.0.0', warnings: [{ title: 'Lens "limit"' }], prompt: 'Line one\nLine two' }];
    const csv = exportApi.buildShotCsv(shots);
    assert.ok(csv.includes('"Glass, metal"'));
    assert.ok(csv.includes('"Lens ""limit"""'));
    assert.ok(csv.includes('"Line one\nLine two"'));
    const calls = [];
    const link = { style: {}, click: () => calls.push('click') };
    const documentMock = { createElement: () => link, body: { appendChild: () => calls.push('append'), removeChild: () => calls.push('remove') } };
    const urlMock = { createObjectURL: () => { calls.push('url'); return 'blob:test'; }, revokeObjectURL: () => calls.push('revoke') };
    exportApi.downloadShotCsv(shots, documentMock, urlMock);
    assert.deepEqual(calls.slice(0, 4), ['url', 'append', 'click', 'remove']);
    assert.equal(link.download, 'CINEPROMPT-ShotList.csv');
});

run('every default serialized item remains gear-safe and quality-safe', () => {
    for (const item of library.items.filter((entry) => entry.id !== 'none' && !entry.deprecated)) {
        const mode = library.categories[item.category].selection_mode;
        const overrides = mode === 'single' ? { selections: { [item.category]: item.key } } : { tags: [item.key] };
        const result = compile(overrides);
        assert.ok(!forbidden.test(result.prompt), `${item.key}: ${result.prompt}`);
        for (const values of Object.values(result.semantic.sections)) assert.equal(values.length, new Set(values.map((value) => value.toLowerCase())).size, `${item.key}: duplicate semantics`);
    }
});

run('static GitHub Pages entry references only local runtime modules plus existing CDNs', () => {
    const html = fs.readFileSync(path.resolve(base, '..', 'CINEPROMPT-MASTER.html'), 'utf8');
    for (const resource of ['library/cineprompt-library.js', 'src/compatibility.js', 'src/semantic-resolver.js', 'src/adapters/index.js', 'src/compiler.js', 'src/storage-migration.js', 'src/export.js', 'src/app.jsx']) assert.ok(html.includes(`cineprompt/${resource}`));
    assert.ok(html.includes("runtime: 'classic'"));
    assert.ok(!/fetch\(|XMLHttpRequest|\/api\//.test(html));
});

run('menus use concise values, visual Traditional-Chinese descriptions, and visible tag limits', () => {
    const app = fs.readFileSync(path.join(base, 'src', 'app.jsx'), 'utf8');
    assert.ok(app.includes('function localizedName(item)'));
    assert.ok(app.includes('function localizedDescription(item)'));
    assert.ok(app.includes('title={localizedDescription(item)}'));
    assert.ok(app.includes('>{localizedName(item)}</option>'));
    assert.ok(app.includes('+ ADD'));
    assert.ok(app.includes('構圖'));
    assert.ok(app.includes('item.historical_context || item.definition'));
    assert.ok(app.includes('function normalizeChinesePunctuation(value)'));
    assert.ok(app.includes("'shutter_speed', 'iso_sensitivity', 'exposure_compensation', 'aspect_ratio'"));
    assert.ok(app.includes('已達上限，請先移除一項'));
    assert.ok(app.includes('！未寫入'));
    assert.ok(!app.includes('Catalog identity retained for'));
    assert.ok(app.includes('category="aspect_ratio" label="畫面比例"'));
    assert.ok(app.indexOf('目標模型') < app.indexOf('category="aspect_ratio" label="畫面比例"'));
    assert.ok(app.indexOf('key="reference_format"') < app.indexOf('<SelectControl key={category} category={category}'));
    assert.ok(app.indexOf('資產配置') < app.indexOf('輸出攝影器材名稱'));
    for (const label of ['攝影手法', '構圖', '燈光', '色彩與調色', '影像質感與效果']) assert.ok(app.includes(`label: '${label}'`));
});

console.log(JSON.stringify({ status: 'PASS', cases: cases.length, audit: library.audit_summary, results: cases }, null, 2));
