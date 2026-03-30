import { OUTPUT_SIZES, ASPECT_RATIOS, TEMPERATURES } from '$lib/types';
import type { OutputSize, AspectRatio } from '$lib/types';

export const sizeOptions = Object.entries(OUTPUT_SIZES).map(([value, { label }]) => ({ value: value as OutputSize, label }));
export const ratioOptions = Object.entries(ASPECT_RATIOS).map(([value, label]) => ({ value: value as AspectRatio, label }));
export const tempOptions = TEMPERATURES.map((t) => ({ value: String(t), label: t === 0 ? '0 (Precise)' : t === 1 ? '1 (Default)' : t === 2 ? '2 (Creative)' : String(t) }));
