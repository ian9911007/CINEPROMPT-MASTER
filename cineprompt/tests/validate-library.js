const assert = require('assert');
const fs = require('fs');
const path = require('path');

const base = path.resolve(__dirname, '..');
const library = require(path.join(base, 'library', 'cineprompt-library.js'));
const compiler = require(path.join(base, 'src', 'compiler.js'));
const migration = require(path.join(base, 'src', 'storage-migration.js')).forLibrary(library);
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
    assert.equal(library.items.length, 610);
    assert.equal(library.audit_summary.audited_entries, 610);
    assert.equal(new Set(library.items.map((item) => item.key)).size, 610);
    for (const item of library.items) {
        for (const field of ['controls', 'does_not_control', 'conflicts_with', 'suppresses', 'semantic_traits', 'negative_semantics']) assert.ok(Array.isArray(item[field]), `${item.key}: ${field}`);
        assert.equal(item.audit.status, 'audited');
        assert.equal(Object.prototype.hasOwnProperty.call(item, 'prompt'), false, `${item.key} must not contain a monolithic prompt`);
    }
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

run('historical lens aperture and focal conflicts resolve without impossible output', () => {
    const result = compile({ selections: { primary_lens: 'lenses:canon_dream', field_of_view: 'focals:85mm', aperture_depth_of_field: 'apertures:f/0.7' } });
    assert.ok(result.warnings.filter((entry) => entry.type === 'physical_conflict').length >= 2);
    assert.ok(/f\/0\.95/i.test(result.prompt));
    assert.ok(!/aperture around f\/0\.7/i.test(result.prompt));
});

run('reference authority compiles without subject booster', () => {
    const result = compile({ action: 'A woman holding a product bottle', references: { person: true, product: true } });
    assert.ok(/preserve character identity/i.test(result.prompt));
    assert.ok(/preserve exact product geometry/i.test(result.prompt));
    assert.ok(!/pore-level|masterful studio portrait|premium commercial product/i.test(result.prompt));
});

run('model adapters produce distinct supported structures', () => {
    const nano = compile({ model_profile: 'nano_banana_pro', tags: ['lighting:rimlight_l'] });
    const image2 = compile({ model_profile: 'image_2', tags: ['lighting:rimlight_l'] });
    const generic = compile({ model_profile: 'generic', tags: ['lighting:rimlight_l'] });
    assert.ok(nano.prompt.startsWith('Scene:'));
    assert.ok(image2.prompt.startsWith('A ceramic'));
    assert.ok(generic.prompt.startsWith('Scene:'));
    assert.equal([nano.prompt, image2.prompt, generic.prompt].every((prompt) => !prompt.includes('--ar')), true);
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

run('all menu entries use bilingual labels and Traditional-Chinese floating descriptions', () => {
    const app = fs.readFileSync(path.join(base, 'src', 'app.jsx'), 'utf8');
    assert.ok(app.includes('function localizedName(item)'));
    assert.ok(app.includes('function localizedDescription(item)'));
    assert.ok(app.includes('title={localizedDescription(item)}'));
    assert.ok(app.includes('>{localizedName(item)}</option>'));
    assert.ok(app.includes('+ Add｜新增'));
    assert.ok(app.includes('Composition｜構圖'));
    assert.ok(app.includes('保留「${name}」的目錄身分'));
});

console.log(JSON.stringify({ status: 'PASS', cases: cases.length, audit: library.audit_summary, results: cases }, null, 2));
