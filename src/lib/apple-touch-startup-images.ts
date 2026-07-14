// iOS launch images for standalone (Add to Home Screen) mode.
// Each entry pairs a device media query with the matching splash PNG under /public/splash.
type SplashLink = { rel: "apple-touch-startup-image"; href: string; media: string };

const DEVICES: Array<{ w: number; h: number; dpr: number; media: string }> = [
  { w: 430, h: 932, dpr: 3, media: "" }, // iPhone 14 Pro Max / 15 Plus
  { w: 393, h: 852, dpr: 3, media: "" }, // iPhone 14 Pro / 15
  { w: 390, h: 844, dpr: 3, media: "" }, // iPhone 14/13/12
  { w: 428, h: 926, dpr: 3, media: "" }, // iPhone 12/13 Pro Max
  { w: 375, h: 812, dpr: 3, media: "" }, // iPhone X/XS/11 Pro
  { w: 414, h: 896, dpr: 3, media: "" }, // iPhone XS Max / 11 Pro Max
  { w: 414, h: 896, dpr: 2, media: "" }, // iPhone XR / 11
  { w: 414, h: 736, dpr: 3, media: "" }, // iPhone 8+ / 7+ / 6+
  { w: 375, h: 667, dpr: 2, media: "" }, // iPhone 8 / 7 / 6 / SE2
  { w: 320, h: 568, dpr: 2, media: "" }, // iPhone SE
  { w: 1024, h: 1366, dpr: 2, media: "" }, // iPad Pro 12.9
  { w: 834, h: 1194, dpr: 2, media: "" }, // iPad Pro 11
  { w: 834, h: 1112, dpr: 2, media: "" }, // iPad Air 10.5
  { w: 768, h: 1024, dpr: 2, media: "" }, // iPad 9.7 / Mini
];

export const appleTouchStartupImages: SplashLink[] = DEVICES.flatMap(({ w, h, dpr }) => {
  const pw = w * dpr;
  const ph = h * dpr;
  const base = `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr})`;
  return [
    {
      rel: "apple-touch-startup-image" as const,
      href: `/splash/splash-${pw}x${ph}.png`,
      media: `${base} and (orientation: portrait)`,
    },
    {
      rel: "apple-touch-startup-image" as const,
      href: `/splash/splash-${ph}x${pw}.png`,
      media: `${base} and (orientation: landscape)`,
    },
  ];
});