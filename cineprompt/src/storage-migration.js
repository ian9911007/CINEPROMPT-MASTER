(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.CinePromptStorageMigration = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const STORAGE_KEY = 'cine_v4_ontology';
    const LEGACY_KEY = 'cine_v15_2_authority';
    const DEFAULT_STATE = {
        action: '',
        model_profile: 'generic',
        reference_format: 'full_frame_35mm',
        literal_gear_token: false,
        selections: {
            shot_size: 'shotTypes:MCU',
            camera_height: 'perspectives:eye',
            aspect_ratio: 'aspectRatios:16:9'
        },
        tags: [],
        references: { person: false, product: false, environment: false, style: false },
        migration_warnings: []
    };

    function safeParse(value, fallback) {
        try { return value ? JSON.parse(value) : fallback; } catch (_) { return fallback; }
    }

    function normalizeState(value) {
        const savedModelProfile = value && value.model_profile === 'nano_banana_2' ? 'nano_banana_pro' : value && value.model_profile;
        return {
            ...DEFAULT_STATE,
            ...(value || {}),
            model_profile: savedModelProfile || DEFAULT_STATE.model_profile,
            selections: { ...DEFAULT_STATE.selections, ...((value && value.selections) || {}) },
            tags: Array.isArray(value && value.tags) ? [...new Set(value.tags)] : [],
            references: { ...DEFAULT_STATE.references, ...((value && value.references) || {}) },
            migration_warnings: Array.isArray(value && value.migration_warnings) ? value.migration_warnings : []
        };
    }

    function forLibrary(library) {
        const byKey = new Map(library.items.map((item) => [item.key, item]));

        function migrateLegacyRecord(record) {
            const next = normalizeState({
                action: record && record.action || '',
                references: {
                    person: Boolean(record && record.refPerson),
                    product: Boolean(record && record.refProduct),
                    environment: Boolean(record && record.refEnv),
                    style: Boolean(record && record.refStyle)
                }
            });
            const fields = [
                ['camera', 'cameras'], ['lens', 'lenses'], ['focal', 'focals'], ['aperture', 'apertures'],
                ['lut', 'luts'], ['lighting', 'lighting'], ['shotType', 'shotTypes'], ['perspective', 'perspectives']
            ];
            for (const [legacyField, legacyCategory] of fields) {
                const id = record && record[legacyField];
                if (!id || id === 'none') continue;
                const item = byKey.get(`${legacyCategory}:${id}`);
                if (!item) {
                    next.migration_warnings.push(`Unknown legacy selection: ${legacyCategory}:${id}`);
                    continue;
                }
                const selectionMode = library.categories[item.category] && library.categories[item.category].selection_mode;
                if (selectionMode === 'single') next.selections[item.category] = item.deprecated && item.duplicate_of ? item.duplicate_of : item.key;
                else next.tags.push(item.deprecated && item.duplicate_of ? item.duplicate_of : item.key);
            }
            const aspect = record && record.aspect;
            if (aspect && byKey.has(`aspectRatios:${aspect}`)) next.selections.aspect_ratio = `aspectRatios:${aspect}`;
            next.tags = [...new Set(next.tags)];
            return next;
        }

        function loadInitialState(storage) {
            const current = safeParse(storage.getItem(`${STORAGE_KEY}_cfg`), null);
            if (current) return normalizeState(current);
            const legacy = safeParse(storage.getItem(`${LEGACY_KEY}_cfg`), null);
            return legacy ? migrateLegacyRecord(legacy) : normalizeState(DEFAULT_STATE);
        }

        function loadInitialShots(storage) {
            const current = safeParse(storage.getItem(`${STORAGE_KEY}_list`), null);
            if (Array.isArray(current)) return current;
            const legacy = safeParse(storage.getItem(`${LEGACY_KEY}_list`), []);
            if (!Array.isArray(legacy)) return [];
            return legacy.map((shot, index) => ({
                id: shot.id || `legacy-${index}`,
                action: shot.action || 'Legacy shot',
                prompt: shot.prompt || '',
                state_snapshot: migrateLegacyRecord(shot),
                schema_version: 'legacy-v15.2',
                legacy: true,
                warnings: []
            }));
        }

        return { migrateLegacyRecord, loadInitialState, loadInitialShots };
    }

    return { STORAGE_KEY, LEGACY_KEY, DEFAULT_STATE, safeParse, normalizeState, forLibrary };
});
