import { halftoneSettingsSchema } from '@invite/shared';

/** Approved in the host's preview for every place photo shown to a guest. */
export const GUEST_PHOTO_STYLE = halftoneSettingsSchema.parse({
  rasterStyle: 'grid',
  cellSize: 8,
  dotScale: 0.8,
  contrast: 25,
  brightness: 5,
  paperColor: '#e2e5e8',
  dotColor: '#a53b8e',
  paperGrain: true,
  grainOpacity: 12,
});
