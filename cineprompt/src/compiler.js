(function (root, factory) {
    const api = factory(
        root.CinePromptCompatibility,
        root.CinePromptSemanticResolver,
        root.CinePromptAdapters
    );
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(
            require('./compatibility.js'),
            require('./semantic-resolver.js'),
            require('./adapters/index.js')
        );
    }
    root.CinePromptCompiler = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Compatibility, SemanticResolver, Adapters) {
    function compile(library, state) {
        if (!library || !Array.isArray(library.items)) throw new Error('A valid CINEPROMPT Library is required.');
        const normalizedState = {
            action: String(state && state.action || ''),
            model_profile: state && state.model_profile || 'generic',
            reference_format: state && state.reference_format || 'full_frame_35mm',
            literal_gear_token: Boolean(state && state.literal_gear_token),
            selections: state && state.selections || {},
            tags: state && state.tags || [],
            references: state && state.references || {}
        };
        const compatibility = Compatibility.evaluate(library, normalizedState);
        const semantic = SemanticResolver.resolve(normalizedState, compatibility);
        const prompt = Adapters.serialize(normalizedState.model_profile, semantic, normalizedState);
        return {
            prompt,
            semantic,
            warnings: [...compatibility.warnings, ...semantic.warnings],
            requested_item_keys: compatibility.requested_items.map((item) => item.key),
            effective_item_keys: semantic.effective_item_keys,
            suppressed_item_keys: compatibility.suppressed_item_keys,
            metadata: compatibility.metadata,
            model_profile: normalizedState.model_profile,
            schema_version: library.schema_version
        };
    }

    return { compile };
});
