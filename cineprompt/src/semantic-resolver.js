(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.CinePromptSemanticResolver = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const SECTION_BY_CATEGORY = {
        shot_size: 'composition',
        shot_purpose: 'composition',
        subject_arrangement: 'composition',
        subject_orientation: 'composition',
        composition: 'composition',
        camera_height: 'camera_geometry',
        camera_pitch: 'camera_geometry',
        camera_roll: 'camera_geometry',
        camera_position: 'camera_geometry',
        camera_distance: 'camera_geometry',
        field_of_view: 'camera_geometry',
        camera_movement: 'photographic_technique',
        primary_lens: 'optics',
        lens_character: 'optics',
        projection: 'optics',
        aperture_depth_of_field: 'optics',
        focus_behavior: 'optics',
        optical_distortion: 'optics',
        optical_filter: 'optics',
        shutter_speed: 'photographic_technique',
        photographic_technique: 'photographic_technique',
        lighting_pattern: 'lighting',
        light_direction: 'lighting',
        light_quality: 'lighting',
        exposure_character: 'lighting',
        capture_system: 'capture_image_character',
        capture_medium: 'capture_image_character',
        imaging_modality: 'capture_image_character',
        iso_sensitivity: 'capture_image_character',
        exposure_compensation: 'capture_image_character',
        white_balance: 'capture_image_character',
        color_response: 'capture_image_character',
        film_sensor_character: 'capture_image_character',
        film_process: 'capture_image_character',
        grain_noise: 'capture_image_character',
        highlight_behavior: 'capture_image_character',
        color_grade: 'capture_image_character',
        image_character: 'materials_image_character',
        post_visual_effect: 'materials_image_character',
        creative_preset: 'materials_image_character',
        aspect_ratio: 'constraints'
    };

    const UNSAFE = /(?:\b(?:8K|12K|16K|32K|HDR|\d+MP)\b|clinical sharpness|zero grain|maximum detail|masterpiece|shot on|shot with)/i;

    function conceptFamily(text) {
        const value = text.toLowerCase();
        if (/halation|highlight bloom|diffusion bloom|glowing highlight/.test(value)) return 'highlight_diffusion';
        if (/swirly bokeh|spiral background|vortex-like background/.test(value)) return 'swirly_bokeh';
        if (/lens flare|horizontal flare|streak flare/.test(value)) return 'flare';
        if (/motion trail|motion streak|directional motion blur/.test(value)) return 'motion_rendering';
        if (/film grain|digital noise|luminance noise|chroma noise/.test(value)) return 'grain_noise';
        if (/high contrast|strong contrast/.test(value)) return 'high_contrast';
        if (/low contrast|soft contrast/.test(value)) return 'low_contrast';
        return value.replace(/[^a-z0-9]+/g, ' ').trim();
    }

    function dedupeTraits(traits) {
        const seenText = new Set();
        const seenFamily = new Map();
        const output = [];
        for (const trait of traits) {
            const text = String(trait.text || trait).trim();
            const normalized = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            if (!text || UNSAFE.test(text) || seenText.has(normalized)) continue;
            const family = conceptFamily(text);
            if (['highlight_diffusion', 'swirly_bokeh', 'flare', 'high_contrast', 'low_contrast'].includes(family) && seenFamily.has(family)) continue;
            seenText.add(normalized);
            seenFamily.set(family, text);
            output.push(text);
        }
        return output;
    }

    function referenceSemantics(references) {
        const values = [];
        let index = 1;
        if (references && references.person) values.push(`preserve character identity from reference image ${index++}`);
        if (references && references.product) values.push(`preserve exact product geometry, branding, text, and material details from reference image ${index++}`);
        if (references && references.environment) values.push(`preserve environment layout and spatial relationships from reference image ${index++}`);
        if (references && references.style) values.push(`use reference image ${index++} only for observable visual style while preserving higher-priority scene and geometry instructions`);
        return values;
    }

    function resolve(state, compatibility) {
        const sections = {
            scene: [],
            composition: [],
            camera_geometry: [],
            optics: [],
            photographic_technique: [],
            lighting: [],
            capture_image_character: [],
            materials_image_character: [],
            constraints: []
        };
        const warnings = [];
        if (state.action && String(state.action).trim()) sections.scene.push(String(state.action).trim());
        sections.constraints.push(...referenceSemantics(state.references));
        const fov = compatibility.metadata && compatibility.metadata.horizontal_fov_degrees;
        const referenceFormat = compatibility.metadata && compatibility.metadata.reference_format;
        if (fov != null && referenceFormat) {
            sections.camera_geometry.push(`horizontal field of view approximately ${fov} degrees on the ${referenceFormat.name} reference gate`);
        }

        for (const item of compatibility.effective_items) {
            const section = SECTION_BY_CATEGORY[item.category] || 'materials_image_character';
            const traits = (item.semantic_traits || []).map((trait) => trait.text).filter(Boolean);
            if (!traits.length && item.id !== 'none') {
                warnings.push({
                    type: 'evidence_gap', severity: 'info', title: 'No safe semantic trait available',
                    detail: `${item.display_name} remains searchable in the Library but its unverified legacy prompt was not serialized.`,
                    resolution: 'Enable Literal Gear Token only for deliberate equipment-token experiments.', item_keys: [item.key]
                });
            }
            sections[section].push(...traits);
            if (state.literal_gear_token && !item.literal_name_safe && item.id !== 'none') {
                const prefix = item.category === 'primary_lens' ? 'optical rendering associated with' : 'capture characteristics associated with';
                sections[section].unshift(`${prefix} ${item.display_name}`);
            }
        }

        if (compatibility.semantic_overrides.aperture) {
            sections.optics.push(compatibility.semantic_overrides.aperture.text);
        }
        if (compatibility.semantic_overrides.focus_stack) {
            sections.optics.push(compatibility.semantic_overrides.focus_stack.text);
        }
        if (compatibility.semantic_overrides.lens_focal_conflict) {
            sections.constraints.push('retain only focal-independent optical character from the selected lens reference');
        }
        for (const section of Object.keys(sections)) sections[section] = dedupeTraits(sections[section]);

        return {
            sections,
            warnings,
            metadata: compatibility.metadata,
            effective_item_keys: compatibility.effective_items.map((item) => item.key)
        };
    }

    return { resolve, dedupeTraits };
});
