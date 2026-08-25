# CINEPROMPT Library Agent Contract

Created: 2026-08-25

This document and `index.json` are generated projections. The only Source of Truth is `../library/cineprompt-library.js`.

## Retrieval rules

- Retrieve only entities relevant to the task; never concatenate all traits.
- Treat controls as the positive authority boundary and does_not_control as an explicit non-implication contract.
- Resolve conflicts, requirements, suppressions, and precedence before serialization.
- Treat low-confidence historical_context as unverified legacy context, not fact.
- Translate equipment identity into semantic_traits unless Literal Gear Token is explicitly enabled.

An agent must retrieve only task-relevant entities, inspect `controls`, honor `does_not_control`, resolve `requires` / `conflicts_with` / `suppresses`, and then compile semantic traits. It must never concatenate all retrieved traits.

## Schema

Every entity has a namespaced `key`, stable legacy `id`, display labels, category, definition, optional historical context, physical and visual traits, positive and negative control boundaries, compatibility relations, semantic traits, literal-gear policy, sources, confidence, uncertainty, deprecation state, and entry-level audit status.

## Authority order

1. `explicit_user_scene_intent`
2. `reference_authority`
3. `composition_camera_geometry`
4. `capture_optical_constraints`
5. `lighting`
6. `image_response`
7. `creative_effects`
8. `output_fidelity`
9. `model_serialization`

## Category inventory

| Category | Display name | Selection | Audited entries |
| --- | --- | --- | ---: |
| `capture_system` | Capture System | `single` | 80 |
| `capture_medium` | Capture Medium | `single` | 9 |
| `primary_lens` | Primary Lens / Lens Family | `single` | 146 |
| `field_of_view` | Field of View / Focal Length | `single` | 24 |
| `aperture_depth_of_field` | Aperture / Depth of Field | `single` | 18 |
| `shot_size` | Shot Size | `single` | 12 |
| `shot_purpose` | Shot Purpose | `single` | 4 |
| `subject_orientation` | Subject Orientation | `single` | 5 |
| `composition` | Composition | `multi` | 7 |
| `camera_height` | Camera Height | `single` | 4 |
| `camera_pitch` | Camera Pitch | `single` | 9 |
| `camera_roll` | Camera Roll | `single` | 3 |
| `camera_position` | Camera Position | `single` | 4 |
| `projection` | Projection | `single` | 6 |
| `camera_movement` | Camera Movement | `multi` | 8 |
| `optical_filter` | Optical Filter | `multi` | 3 |
| `imaging_modality` | Imaging Modality | `single` | 50 |
| `lighting_pattern` | Lighting Pattern | `multi` | 9 |
| `light_direction` | Light Direction | `multi` | 7 |
| `light_quality` | Light Quality | `multi` | 35 |
| `exposure_character` | Exposure Character | `multi` | 8 |
| `color_response` | Color Response | `single` | 7 |
| `film_sensor_character` | Film / Sensor Character | `single` | 38 |
| `film_process` | Film Process | `single` | 7 |
| `highlight_behavior` | Highlight Behavior | `multi` | 1 |
| `color_grade` | Color Grade | `single` | 14 |
| `image_character` | Image Character | `multi` | 2 |
| `post_visual_effect` | Post / Visual Effect | `multi` | 37 |
| `aspect_ratio` | Aspect Ratio | `single` | 14 |
| `creative_preset` | Creative Preset | `multi` | 39 |

## Audit summary

- Total entries inspected: 610 / 610
- Reclassified entries: 269
- Corrected semantic entries: 430
- Quality-noise repairs: 69
- Literal-gear repairs: 203
- Label corrections: 1
- Confirmed duplicate / deprecated aliases: 8
- Entries retaining explicit uncertainty: 440

## Evidence contract

- `high`: supported physical rule or stable mathematical control.
- `medium`: standard cinematography vocabulary or directly observable behavior that still depends on context.
- `low`: legacy equipment, historical, named-style, or AI-generation association not individually verified from a primary source.
- Low-confidence `historical_context` is searchable context, not factual authority.
- A missing safe semantic trait means the identity remains searchable but is not serialized by default.

## Official sources used for shared rules and adapters

- [Canon: Focal length and field of view](https://files.canon-europe.com/files/webcontent/rf-lens-world/knowledge/focus/index.html) — accessed 2026-08-25
- [Canon: Depth of field](https://files.canon-europe.com/files/webcontent/rf-lens-world/knowledge/depth-of-field/index.html) — accessed 2026-08-25
- [Canon: Perspective](https://files.canon-europe.com/files/webcontent/rf-lens-world/knowledge/perspective/index.html) — accessed 2026-08-25
- [Google AI for Developers: Nano Banana image generation](https://ai.google.dev/gemini-api/docs/image-generation) — accessed 2026-08-25
- [OpenAI Developers: GPT Image 2 model](https://developers.openai.com/api/docs/models/gpt-image-2) — accessed 2026-08-25
