(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.CinePromptAdapters = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const ORDER = [
        ['scene', 'Scene'],
        ['composition', 'Composition'],
        ['camera_geometry', 'Camera'],
        ['optics', 'Optics'],
        ['lighting', 'Lighting'],
        ['capture_image_character', 'Capture / Image Character'],
        ['materials_image_character', 'Materials / Effects'],
        ['constraints', 'Constraints']
    ];

    function sentence(value) {
        const text = String(value || '').trim().replace(/[.;,\s]+$/, '');
        return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}.` : '';
    }

    function limit(values, count) {
        return (values || []).slice(0, count);
    }

    function generic(semantic, state) {
        const parts = [];
        for (const [key, label] of ORDER) {
            const values = limit(semantic.sections[key], key === 'scene' ? 1 : 7);
            if (!values.length) continue;
            parts.push(`${label}: ${values.join('; ')}`);
        }
        return parts.join(' | ');
    }

    function image2(semantic) {
        const parts = [];
        const scene = semantic.sections.scene[0];
        if (scene) parts.push(sentence(scene));
        const composition = limit(semantic.sections.composition, 5);
        if (composition.length) parts.push(sentence(`Frame the scene with ${composition.join(', ')}`));
        const camera = limit(semantic.sections.camera_geometry, 5);
        if (camera.length) parts.push(sentence(`Use camera geometry that creates ${camera.join(', ')}`));
        const optics = limit(semantic.sections.optics, 5);
        if (optics.length) parts.push(sentence(`Render the optics with ${optics.join(', ')}`));
        const lighting = limit(semantic.sections.lighting, 6);
        if (lighting.length) parts.push(sentence(`Light the scene with ${lighting.join(', ')}`));
        const character = limit([...semantic.sections.capture_image_character, ...semantic.sections.materials_image_character], 7);
        if (character.length) parts.push(sentence(`Preserve image and material character through ${character.join(', ')}`));
        const constraints = limit(semantic.sections.constraints, 8);
        if (constraints.length) parts.push(sentence(`Constraints: ${constraints.join('; ')}`));
        return parts.join(' ');
    }

    function nanoBanana(semantic) {
        const parts = [];
        for (const [key, label] of ORDER) {
            const values = limit(semantic.sections[key], key === 'scene' ? 1 : 12);
            if (!values.length) continue;
            parts.push(`${label}: ${values.join('; ')}`);
        }
        return parts.join(' | ');
    }

    function serialize(profile, semantic, state) {
        if (!semantic.sections.scene.length) return 'Prompts are generated here.';
        if (profile === 'image_2') return image2(semantic, state);
        if (profile === 'nano_banana_pro' || profile === 'nano_banana_2') return nanoBanana(semantic, state);
        return generic(semantic, state);
    }

    return { serialize, generic, image2, nanoBanana };
});
