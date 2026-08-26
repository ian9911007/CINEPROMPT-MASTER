# CINEPROMPT Library Agent Contract

Created: 2026-08-26

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
5. `photographic_technique`
6. `lighting`
7. `image_response`
8. `creative_effects`
9. `output_fidelity`
10. `model_serialization`

## Category inventory

| Category | Display name | Selection | Audited entries |
| --- | --- | --- | ---: |
| `capture_system` | Capture System | `single` | 80 |
| `camera_movement` | Camera Movement | `multi` | 8 |
| `creative_preset` | Creative Preset | `multi` | 39 |
| `capture_medium` | Capture Medium | `single` | 9 |
| `imaging_modality` | Imaging Modality | `single` | 50 |
| `projection` | Projection | `single` | 9 |
| `optical_filter` | Optical Filter | `multi` | 6 |
| `post_visual_effect` | Post / Visual Effect | `multi` | 35 |
| `primary_lens` | Primary Lens / Lens Family | `single` | 146 |
| `color_grade` | Color Grade | `multi` | 24 |
| `color_response` | Color Response | `single` | 10 |
| `exposure_character` | Exposure Character | `multi` | 11 |
| `highlight_behavior` | Highlight Behavior | `multi` | 7 |
| `film_sensor_character` | Film / Sensor Character | `single` | 38 |
| `film_process` | Film Process | `single` | 7 |
| `photographic_technique` | Photographic Technique | `multi` | 20 |
| `light_quality` | Light Quality | `multi` | 45 |
| `lighting_pattern` | Lighting Pattern | `multi` | 14 |
| `light_direction` | Light Direction | `multi` | 12 |
| `lens_character` | Lens Character | `multi` | 9 |
| `image_character` | Image Character | `multi` | 12 |
| `shot_size` | Shot Size | `single` | 12 |
| `camera_position` | Camera Position | `single` | 5 |
| `shot_purpose` | Shot Purpose | `single` | 4 |
| `subject_arrangement` | Subject Arrangement | `single` | 4 |
| `camera_height` | Camera Height | `single` | 4 |
| `camera_pitch` | Camera Pitch | `single` | 10 |
| `subject_orientation` | Subject Orientation | `single` | 5 |
| `composition` | Composition | `multi` | 27 |
| `camera_roll` | Camera Roll | `single` | 3 |
| `field_of_view` | Field of View / Focal Length | `single` | 24 |
| `aperture_depth_of_field` | Aperture / Depth of Field | `single` | 18 |
| `aspect_ratio` | Aspect Ratio | `single` | 14 |
| `shutter_speed` | Shutter / Exposure Time | `single` | 30 |
| `camera_distance` | Camera-to-Subject Distance | `single` | 5 |
| `focus_behavior` | Focus Target / Focus Plane | `single` | 5 |
| `iso_sensitivity` | ISO / Sensitivity | `single` | 11 |
| `exposure_compensation` | Exposure Compensation | `single` | 7 |
| `white_balance` | White Balance / Temperature / Tint | `single` | 9 |
| `optical_distortion` | Optical Distortion | `multi` | 7 |
| `grain_noise` | Grain / Noise | `multi` | 6 |

## User-facing category groups

- `camera_capture` — Camera / Capture / 攝影機與感光: `capture_system`, `capture_medium`, `imaging_modality`, `film_sensor_character`, `iso_sensitivity`, `exposure_compensation`
- `lens_optics` — Lens / Optics / 鏡頭與光學: `primary_lens`, `field_of_view`, `aperture_depth_of_field`, `focus_behavior`, `projection`, `lens_character`, `optical_distortion`, `optical_filter`
- `camera_geometry` — Camera Geometry / Viewpoint / 相機幾何與視點: `shot_size`, `shot_purpose`, `subject_arrangement`, `subject_orientation`, `camera_height`, `camera_pitch`, `camera_roll`, `camera_position`, `camera_distance`
- `photographic_technique` — Photographic Technique / 攝影手法: `shutter_speed`, `camera_movement`, `photographic_technique`
- `composition` — Composition / 構圖: `composition`
- `lighting` — Lighting / 燈光: `lighting_pattern`, `light_direction`, `light_quality`, `exposure_character`
- `color_grading` — Color & Grading / 色彩與調色: `white_balance`, `color_response`, `film_process`, `color_grade`
- `image_character_effects` — Image Character & Effects / 影像質感與效果: `grain_noise`, `highlight_behavior`, `image_character`, `post_visual_effect`, `creative_preset`

## Audit summary

- Total entries inspected: 801 / 801
- Reclassified entries: 269
- Corrected semantic entries: 439
- Quality-noise repairs: 69
- Literal-gear repairs: 203
- Label corrections: 1
- Confirmed duplicate / deprecated aliases: 10
- Entries retaining explicit uncertainty: 436

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
- [Nikon: Understanding Shutter Speed](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/understanding-shutter-speed) — accessed 2026-08-26
- [Nikon: Capturing or Freezing Motion in Photos](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/capturing-or-freezing-motion-in-photos) — accessed 2026-08-26
- [Nikon: The Joy of Long Exposure Photography](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/the-joy-of-long-exposure-photography) — accessed 2026-08-26
- [Nikon: 10 Tips for Better Camera Panning](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/10-tips-for-better-camera-panning) — accessed 2026-08-26
- [Nikon: Focus Shift, the Basics: Stacking Focus](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/focus-shift-the-basics-stacking-focus) — accessed 2026-08-26
- [Nikon: Exposure Bracketing, the Creative Insurance Policy](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/exposure-bracketing-the-creative-insurance-policy) — accessed 2026-08-26
- [Nikon: Understanding ISO Sensitivity](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/understanding-iso-sensitivity) — accessed 2026-08-26
- [Nikon: Setting White Balance](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/setting-white-balance) — accessed 2026-08-26
- [Nikon: Flash Points, the Control of Light](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/flash-points-the-control-of-light) — accessed 2026-08-26
- [Nikon: 5 Easy Composition Guidelines](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/5-easy-composition-guidelines) — accessed 2026-08-26
- [Adobe: The Basics of Photography Composition](https://www.adobe.com/creativecloud/photography/technique/composition.html) — accessed 2026-08-26
- [Adobe: A Guide to Leading Lines in Photography](https://www.adobe.com/creativecloud/photography/technique/leading-lines.html) — accessed 2026-08-26
- [Adobe Camera Raw: Correct Lens Distortions](https://helpx.adobe.com/ca/camera-raw/desktop/using/correct-lens-distortions-camera-raw.html) — accessed 2026-08-26
- [Adobe Lightroom Classic: Image Tone and Color](https://helpx.adobe.com/uk/lightroom-classic/help/image-tone-color.html) — accessed 2026-08-26
- [Blackmagic Design: DaVinci Resolve Color](https://www.blackmagicdesign.com/products/davinciresolve/color) — accessed 2026-08-26
- [Blackmagic Design: DaVinci Resolve 19 New Features Guide](https://documents.blackmagicdesign.com/au/SupportNotes/DaVinci_Resolve_19_New_Features_Guide.pdf) — accessed 2026-08-26
- [Rosco: The Basics of Film Lighting](https://spectrum.rosco.com/the-basics-of-film-lighting) — accessed 2026-08-26
- [Sony alpha 9 III Specifications](https://www.sony.com/electronics/support/e-mount-body-ilce-9-series/ilce-9m3/specifications) — accessed 2026-08-26
- [Fujifilm: How to Start Photographing Star Trails](https://www.fujifilm-x.com/en-gb/learning-centre/how-to-start-photographing-star-trails/) — accessed 2026-08-26
- [Fujifilm: How to Make Amazing Light Trails](https://www.fujifilm-x.com/en-gb/learning-centre/how-to-make-amazing-light-trails/) — accessed 2026-08-26
- [Adobe: Light Painting Photography](https://www.adobe.com/creativecloud/photography/type/light-painting-photography.html) — accessed 2026-08-26
