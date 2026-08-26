(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.CinePromptCompatibility = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const MONO_MODALITY = /(?:thermal|xray|x_ray|sem|monochrom|850nm|darkfield)/i;
    const FISHEYE = /(?:fisheye|nikkor_6mm|nikkor_8mm)/i;

    function warning(type, severity, title, detail, resolution, itemKeys) {
        return { type, severity, title, detail, resolution, item_keys: itemKeys || [] };
    }

    function unique(values) {
        return [...new Set(values.filter(Boolean))];
    }

    function collectRequestedKeys(state) {
        return unique([
            ...Object.values(state.selections || {}),
            ...(state.tags || [])
        ]);
    }

    function resolveItems(library, state) {
        const byKey = new Map(library.items.map((item) => [item.key, item]));
        const requestedKeys = collectRequestedKeys(state);
        const items = [];
        const warnings = [];
        for (const key of requestedKeys) {
            const item = byKey.get(key);
            if (!item) {
                warnings.push(warning(
                    'migration', 'warning', 'Unknown or deprecated selection',
                    `The saved selection ${key} is not present in schema ${library.schema_version}.`,
                    'The unknown selection was ignored; the rest of the shot remains usable.', [key]
                ));
                continue;
            }
            if (item.deprecated && item.duplicate_of) {
                const replacement = byKey.get(item.duplicate_of);
                if (replacement) {
                    items.push(replacement);
                    warnings.push(warning(
                        'migration', 'info', 'Deprecated duplicate migrated',
                        `${item.display_name} resolves to the canonical ${replacement.display_name} entry.`,
                        'The canonical entity is used without deleting the legacy ID.', [key, replacement.key]
                    ));
                    continue;
                }
            }
            items.push(item);
        }
        return { items, warnings, byKey };
    }

    function compareLensConstraints(items, suppressedKeys, semanticOverrides, warnings) {
        const lens = items.find((item) => item.category === 'primary_lens');
        const focal = items.find((item) => item.category === 'field_of_view');
        const aperture = items.find((item) => item.category === 'aperture_depth_of_field');
        if (!lens) return;

        const range = lens.physical_traits && lens.physical_traits.focal_range;
        const selectedMm = focal && Number.parseFloat(focal.id);
        if (range && Number.isFinite(selectedMm) && (selectedMm < range.min_mm || selectedMm > range.max_mm)) {
            warnings.push(warning(
                'physical_conflict', 'conflict', 'Lens and focal length are physically incompatible',
                `${lens.display_name} is labeled for ${range.min_mm === range.max_mm ? `${range.min_mm}mm` : `${range.min_mm}-${range.max_mm}mm`}, while ${selectedMm}mm is selected.`,
                'Field of view keeps authority; only focal-independent lens-character traits are retained.', [lens.key, focal.key]
            ));
            semanticOverrides.lens_focal_conflict = true;
        }

        const limit = lens.physical_traits && lens.physical_traits.aperture_limit;
        const selectedF = aperture && Number.parseFloat(String(aperture.id).replace('f/', ''));
        if (limit && Number.isFinite(selectedF) && selectedF < limit.widest_f_number) {
            warnings.push(warning(
                'physical_conflict', 'conflict', 'Selected aperture exceeds the labeled lens limit',
                `${aperture.id} is wider than the ${lens.display_name} label limit of f/${limit.widest_f_number}.`,
                `The compiler clamps aperture semantics to f/${limit.widest_f_number}; the UI selection is preserved for inspection.`, [lens.key, aperture.key]
            ));
            suppressedKeys.add(aperture.key);
            semanticOverrides.aperture = {
                f_number: limit.widest_f_number,
                text: `aperture around f/${limit.widest_f_number}, with depth of field still conditional on focal length, format, focus distance, and camera-to-subject distance`
            };
        }
    }

    function compareImagingModality(items, suppressedKeys, warnings) {
        const modality = items.find((item) => item.category === 'imaging_modality' && MONO_MODALITY.test(item.key));
        if (!modality) return;
        const colorItems = items.filter((item) => ['color_response', 'color_grade', 'film_sensor_character'].includes(item.category));
        for (const colorItem of colorItems) suppressedKeys.add(colorItem.key);
        if (colorItems.length) {
            warnings.push(warning(
                'semantic_conflict', 'warning', 'Imaging modality overrides normal color response',
                `${modality.display_name} is incompatible with an ordinary photographic color pipeline.`,
                'Normal color-response items are suppressed; modality-specific false color may remain.', [modality.key, ...colorItems.map((item) => item.key)]
            ));
        }
    }

    function compareProjection(items, suppressedKeys, warnings) {
        const projection = items.find((item) => item.category === 'projection' && FISHEYE.test(item.key));
        const focal = items.find((item) => item.category === 'field_of_view');
        const mm = focal && Number.parseFloat(focal.id);
        if (projection && Number.isFinite(mm) && mm >= 85) {
            suppressedKeys.add(projection.key);
            warnings.push(warning(
                'physical_conflict', 'conflict', 'Fisheye projection conflicts with telephoto field of view',
                `${projection.display_name} and ${mm}mm describe incompatible projection / FoV states.`,
                'The explicit FoV selection has higher camera-geometry authority, so the fisheye projection is suppressed.', [projection.key, focal.key]
            ));
        }
    }

    function compareDirectRelations(items, suppressedKeys, warnings) {
        const selectedKeys = new Set(items.map((item) => item.key));
        for (const item of items) {
            for (const conflict of item.conflicts_with || []) {
                if (!selectedKeys.has(conflict)) continue;
                if (suppressedKeys.has(item.key) || suppressedKeys.has(conflict)) continue;
                suppressedKeys.add(conflict);
                warnings.push(warning(
                    'semantic_conflict', 'warning', 'Mutually exclusive selections',
                    `${item.display_name} conflicts with another selected physical or semantic state.`,
                    'The later canonical authority is retained and the conflicting item is suppressed.', [item.key, conflict]
                ));
            }
            for (const suppressed of item.suppresses || []) {
                if (!selectedKeys.has(suppressed) || suppressedKeys.has(suppressed)) continue;
                suppressedKeys.add(suppressed);
                warnings.push(warning(
                    'semantic_suppression', 'info', 'Umbrella effect suppresses a duplicate component',
                    `${item.display_name} already includes the selected component effect.`,
                    'The umbrella asset is retained and its duplicate component is omitted from the compiled prompt.', [item.key, suppressed]
                ));
            }
        }
    }

    function compareCreativeCombination(items, warnings) {
        const hasScientific = items.some((item) => item.compatibility_profile === 'scientific_machine_imaging');
        const hasAnalog = items.some((item) => item.compatibility_profile === 'analog_film');
        if (hasScientific && hasAnalog) {
            warnings.push(warning(
                'creative_combination', 'info', 'Unusual cross-medium combination',
                'Scientific or machine imaging is combined with analog film character.',
                'The combination remains allowed; modality evidence has authority over normal color response.', items.filter((item) => ['scientific_machine_imaging', 'analog_film'].includes(item.compatibility_profile)).map((item) => item.key)
            ));
        }
    }

    function compareTechniqueInteractions(items, suppressedKeys, semanticOverrides, warnings) {
        const shutter = items.find((item) => item.category === 'shutter_speed');
        const techniques = items.filter((item) => item.category === 'photographic_technique');
        const techniqueIds = new Set(techniques.map((item) => item.id));
        const regime = shutter && shutter.physical_traits && shutter.physical_traits.exposure_regime;
        const slowRegimes = new Set(['extreme_long', 'long', 'slow']);
        const fastRegimes = new Set(['fast', 'ultra_fast']);

        function interaction(title, detail, resolution, keys) {
            warnings.push(warning('technique_interaction', 'info', title, detail, resolution, keys));
        }

        const needsIntegratedMotion = [...techniqueIds].some((id) => /^(?:panning|long_exposure|extreme_long_exposure|light_trails|light_painting|intentional_camera_movement|rear_curtain_sync|slow_sync_flash)$/.test(id));
        if (shutter && needsIntegratedMotion && fastRegimes.has(regime)) {
            interaction(
                'Fast shutter limits integrated-motion technique',
                `${shutter.display_name} reduces the motion integration expected by the selected technique.`,
                'Both selections remain available as an intentional creative combination; use a slower exposure time for stronger trails or directional blur.',
                [shutter.key, ...techniques.map((item) => item.key)]
            );
        }

        if (shutter && techniqueIds.has('star_trails') && fastRegimes.has(regime)) {
            interaction(
                'Fast shutter is treated as a stacked star-trail source frame',
                `${shutter.display_name} is too brief for a continuous single-frame star trail but can describe one frame in a multi-frame stack.`,
                'The star-trail technique remains authoritative for the final composite; the selected shutter is not presented as one continuous exposure.',
                [shutter.key, ...techniques.filter((item) => item.id === 'star_trails').map((item) => item.key)]
            );
        }

        if (shutter && techniqueIds.has('exposure_bracket_merge')) {
            interaction(
                'Selected shutter is the exposure-bracket baseline',
                `${shutter.display_name} is treated as the baseline frame while the bracket varies exposure time around it and keeps aperture behavior stable.`,
                'The final image describes the merged tonal result rather than claiming every source frame used the same shutter.',
                [shutter.key, ...techniques.filter((item) => item.id === 'exposure_bracket_merge').map((item) => item.key)]
            );
        }

        const needsFrozenMotion = techniqueIds.has('freeze_motion') || techniqueIds.has('high_speed_photography');
        if (shutter && needsFrozenMotion && slowRegimes.has(regime)) {
            interaction(
                'Slow shutter limits motion-freezing technique',
                `${shutter.display_name} integrates subject movement instead of freezing it unless a brief flash or strobe supplies the effective exposure.`,
                'The combination remains allowed for deliberate ambient trails plus flash-frozen detail; otherwise choose a faster shutter.',
                [shutter.key, ...techniques.filter((item) => ['freeze_motion', 'high_speed_photography'].includes(item.id)).map((item) => item.key)]
            );
        }

        if (techniqueIds.has('focus_stacking')) {
            const aperture = items.find((item) => item.category === 'aperture_depth_of_field');
            const fNumber = aperture && Number.parseFloat(String(aperture.id).replace('f/', ''));
            if (aperture && Number.isFinite(fNumber) && fNumber <= 2.8) {
                suppressedKeys.add(aperture.key);
                semanticOverrides.focus_stack = {
                    text: 'focus-stacked composite depth with multiple focus planes rendered sharp; this composite focus authority overrides single-exposure shallow-depth-of-field rendering'
                };
                interaction(
                    'Focus stacking overrides shallow-depth-of-field rendering',
                    `${aperture.display_name} normally implies shallow depth of field, while focus stacking combines multiple focus planes.`,
                    'The selected aperture remains stored, but its ordinary shallow-depth-of-field semantic is suppressed for this composite technique.',
                    [aperture.key, ...techniques.filter((item) => item.id === 'focus_stacking').map((item) => item.key)]
                );
            }
        }
    }

    function calculateFoV(library, state, items) {
        const format = library.reference_formats.find((entry) => entry.id === state.reference_format) || library.reference_formats[0];
        const focal = items.find((item) => item.category === 'field_of_view');
        const mm = focal && Number.parseFloat(focal.id);
        if (!format || !Number.isFinite(mm)) return { reference_format: format || null, focal_length_mm: null, horizontal_fov_degrees: null };
        const degrees = 2 * Math.atan(format.horizontal_mm / (2 * mm)) * 180 / Math.PI;
        return {
            reference_format: format,
            focal_length_mm: mm,
            horizontal_fov_degrees: Number(degrees.toFixed(1)),
            note: 'FoV metadata uses the selected horizontal reference gate; it is not a universal value for the focal length.'
        };
    }

    function evaluate(library, state) {
        const resolved = resolveItems(library, state);
        const suppressedKeys = new Set();
        const semanticOverrides = {};
        const warnings = [...resolved.warnings];
        compareLensConstraints(resolved.items, suppressedKeys, semanticOverrides, warnings);
        compareImagingModality(resolved.items, suppressedKeys, warnings);
        compareProjection(resolved.items, suppressedKeys, warnings);
        compareDirectRelations(resolved.items, suppressedKeys, warnings);
        compareCreativeCombination(resolved.items, warnings);
        compareTechniqueInteractions(resolved.items, suppressedKeys, semanticOverrides, warnings);

        return {
            requested_items: resolved.items,
            effective_items: resolved.items.filter((item) => !suppressedKeys.has(item.key)),
            suppressed_item_keys: [...suppressedKeys],
            semantic_overrides: semanticOverrides,
            warnings,
            metadata: calculateFoV(library, state, resolved.items)
        };
    }

    return { evaluate, collectRequestedKeys };
});
