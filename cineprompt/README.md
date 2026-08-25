# CINEPROMPT MASTER V4

Created: 2026-08-25

## Architecture

`library/cineprompt-library.js` is the only manually maintained Source of Truth for cinematography entities. The webpage, compiler, compatibility engine, generated AI index, and validation suite all consume this file.

Data flow:

`Structured Library → User Selections → Semantic Resolution → Compatibility / Conflict Resolution → Model-neutral Semantic Prompt → Model Adapter → Final Prompt`

## Directory map

- `library/cineprompt-library.js`: canonical ontology, evidence status, relationships, semantic traits, audit metadata, and model profiles.
- `src/compatibility.js`: physical, semantic, suppression, requirement, and creative-combination resolution.
- `src/semantic-resolver.js`: model-neutral section building and semantic deduplication.
- `src/adapters/index.js`: Nano Banana Pro, Nano Banana 2, Image 2.0, and Generic serialization.
- `src/compiler.js`: public compiler entry point.
- `src/storage-migration.js`: backward-compatible migration for `cine_v15_2_authority` localStorage records.
- `src/export.js`: deterministic CSV serialization and browser download handoff.
- `src/app.jsx`: React control panel, Shot List, Timeline, warnings, copy, CSV export, and Library Explorer.
- `ai/index.json`: generated retrieval index for agents.
- `ai/CINEPROMPT-LIBRARY.md`: generated retrieval and evidence contract.
- `scripts/generate-ai-library.js`: regenerates AI projections from the canonical Library.
- `tests/validate-library.js`: schema, full-entry, compiler, migration, conflict, and adapter validation.

## Commands

```bash
node Resources/cineprompt/scripts/generate-ai-library.js
node Resources/cineprompt/tests/validate-library.js
```

The webpage remains a static GitHub Pages application. No backend or build step is required for runtime.
