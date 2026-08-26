const fs = require('fs');
const path = require('path');

const base = path.resolve(__dirname, '..');
const library = require(path.join(base, 'library', 'cineprompt-library.js'));
const aiDir = path.join(base, 'ai');

const index = {
    schema_version: library.schema_version,
    generated: library.created,
    generated_from: '../library/cineprompt-library.js',
    source_of_truth: false,
    retrieval_policy: library.retrieval_policy,
    precedence: library.precedence,
    categories: library.categories,
    ui_category_groups: library.ui_category_groups,
    reference_formats: library.reference_formats,
    audit_summary: library.audit_summary,
    items: library.items.map((item) => ({
        key: item.key,
        id: item.id,
        display_name: item.display_name,
        localized_name: item.localized_name,
        category: item.category,
        subcategory: item.subcategory,
        definition: item.definition,
        historical_context: item.historical_context,
        physical_traits: item.physical_traits,
        visual_traits: item.visual_traits,
        controls: item.controls,
        does_not_control: item.does_not_control,
        compatible_with: item.compatible_with,
        conflicts_with: item.conflicts_with,
        suppresses: item.suppresses,
        requires: item.requires,
        semantic_traits: item.semantic_traits,
        negative_semantics: item.negative_semantics,
        literal_name_safe: item.literal_name_safe,
        source: item.source,
        confidence: item.confidence,
        uncertainty: item.uncertainty,
        deprecated: item.deprecated,
        duplicate_of: item.duplicate_of,
        search_text: [item.key, item.display_name, item.localized_name, item.category, item.definition, item.historical_context, ...item.visual_traits].join(' ').toLowerCase()
    }))
};

const categoryRows = Object.entries(library.audit_summary.by_category)
    .map(([category, count]) => `| \`${category}\` | ${library.categories[category].display_name} | \`${library.categories[category].selection_mode}\` | ${count} |`)
    .join('\n');
const sourceRows = Object.values(library.official_sources)
    .map((source) => `- [${source.title}](${source.url}) — accessed ${source.accessed}`)
    .join('\n');
const markdown = `# CINEPROMPT Library Agent Contract

Created: ${library.created}

This document and \`index.json\` are generated projections. The only Source of Truth is \`../library/cineprompt-library.js\`.

## Retrieval rules

${library.retrieval_policy.map((rule) => `- ${rule}`).join('\n')}

An agent must retrieve only task-relevant entities, inspect \`controls\`, honor \`does_not_control\`, resolve \`requires\` / \`conflicts_with\` / \`suppresses\`, and then compile semantic traits. It must never concatenate all retrieved traits.

## Schema

Every entity has a namespaced \`key\`, stable legacy \`id\`, display labels, category, definition, optional historical context, physical and visual traits, positive and negative control boundaries, compatibility relations, semantic traits, literal-gear policy, sources, confidence, uncertainty, deprecation state, and entry-level audit status.

## Authority order

${library.precedence.map((entry, index) => `${index + 1}. \`${entry}\``).join('\n')}

## Category inventory

| Category | Display name | Selection | Audited entries |
| --- | --- | --- | ---: |
${categoryRows}

## User-facing category groups

${Object.entries(library.ui_category_groups).map(([id, group]) => `- \`${id}\` — ${group.display_name} / ${group.localized_name}: ${group.categories.map((category) => `\`${category}\``).join(', ')}`).join('\n')}

## Audit summary

- Total entries inspected: ${library.audit_summary.audited_entries} / ${library.audit_summary.total_entries}
- Reclassified entries: ${library.audit_summary.reclassified_entries}
- Corrected semantic entries: ${library.audit_summary.corrected_semantic_entries}
- Quality-noise repairs: ${library.audit_summary.quality_noise_repairs}
- Literal-gear repairs: ${library.audit_summary.literal_gear_repairs}
- Label corrections: ${library.audit_summary.label_corrections}
- Confirmed duplicate / deprecated aliases: ${library.audit_summary.duplicate_deprecated_entries}
- Entries retaining explicit uncertainty: ${library.audit_summary.uncertain_entries}

## Evidence contract

- \`high\`: supported physical rule or stable mathematical control.
- \`medium\`: standard cinematography vocabulary or directly observable behavior that still depends on context.
- \`low\`: legacy equipment, historical, named-style, or AI-generation association not individually verified from a primary source.
- Low-confidence \`historical_context\` is searchable context, not factual authority.
- A missing safe semantic trait means the identity remains searchable but is not serialized by default.

## Official sources used for shared rules and adapters

${sourceRows}
`;

fs.mkdirSync(aiDir, { recursive: true });
fs.writeFileSync(path.join(aiDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
fs.writeFileSync(path.join(aiDir, 'CINEPROMPT-LIBRARY.md'), markdown);
console.log(`Generated ${index.items.length} AI index records from schema ${library.schema_version}.`);
