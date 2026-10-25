/**
 * Android distribution details — one source of truth for the landing-page
 * download popup and the /android page.
 *
 * Two per-ABI APKs are published next to the static export (a universal bundle
 * would be ~112 MB, which is too heavy for a phone download):
 *   /android/ma-safaris-arm64.apk  — arm64-v8a, every modern phone
 *   /android/ma-safaris-arm32.apk  — armeabi-v7a, older 32-bit devices
 *
 * The APKs are build artifacts, not committed to git; the release step copies
 * them into the published directory.
 */
export const ANDROID_APP = {
  version: '1.0.0',
  packageId: 'tz.meandadventure.safaris',
  minimumAndroid: '7.0',
  primary: {
    abi: 'arm64-v8a',
    label: '64-bit phones (most devices)',
    path: '/android/ma-safaris-arm64.apk',
    sizeLabel: '52 MB',
  },
  legacy: {
    abi: 'armeabi-v7a',
    label: 'Older 32-bit phones',
    path: '/android/ma-safaris-arm32.apk',
    sizeLabel: '45 MB',
  },
} as const;

/** Marketing page that holds the download button, install steps and notes. */
export const ANDROID_PAGE_PATH = '/android/';

/** Public API origin baked into the shipped APK. */
export const ANDROID_API_BASE_URL = 'https://api.meandadventuresafaris.com/v1';
