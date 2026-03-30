# Nano Banana 2 Upgrade Plan

## Overview

Google released Nano Banana 2 on Feb 26, 2026, powered by `gemini-3.1-flash-image-preview`. This replaces the previous `gemini-3-pro-image-preview` model with faster generation, better quality, ~50% lower pricing, and new capabilities.

## Key Changes

### Model
- **Old:** `gemini-3-pro-image-preview`
- **New:** `gemini-3.1-flash-image-preview`

### Pricing (Batch API, 50% discount included)
| Size | Old Price | New Price |
|------|-----------|-----------|
| 0.5K | N/A | $0.0225 |
| 1K | $0.02 | $0.0335 |
| 2K | $0.07 | $0.0505 |
| 4K | $0.12 | $0.0755 |

### New Output Size
- **0.5K** resolution added as the lowest tier

### New Aspect Ratios
Added 5 new ratios:
- `3:2` (Photo)
- `2:3` (Photo Portrait)
- `4:5` (Social)
- `5:4` (Social Wide)
- `21:9` (Ultrawide)

## Files Modified

1. `src/lib/stores/jobs.ts` — OUTPUT_SIZES, ASPECT_RATIOS, Job interface
2. `src/lib/components/TextToImageForm.svelte` — outputSize type
3. `src/lib/components/ImageToImageForm.svelte` — outputSize type
4. `docs/planning/application-specification.md` — model name, pricing, size mappings
5. `src/lib/stores/jobs.test.ts` — update price/size assertions
6. `src/lib/components/__tests__/JobCard.test.ts` — update cost assertions
7. `src/lib/components/__tests__/TextToImageForm.test.ts` — update size references
8. `src/lib/components/__tests__/ImageToImageForm.test.ts` — update size references

## Notes

- Batch API still supported with 50% discount
- No database schema migration needed (output_size is TEXT)
- Default output size remains 1K
