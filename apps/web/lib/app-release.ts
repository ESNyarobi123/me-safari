/**
 * Android distribution details — one source of truth for the landing-page
 * download popup and the /android page.
 *
 * The APK itself is published next to the static export:
 *   apps/web/public/android/ma-safaris.apk → /android/ma-safaris.apk
 * The file is intentionally not committed to git (build artifact); the release
 * step copies it into the published directory.
 */
export const ANDROID_APP = {
  version: '1.0.0',
  fileName: 'ma-safaris.apk',
  downloadPath: '/android/ma-safaris.apk',
  minimumAndroid: '8.0',
  packageId: 'tz.meandadventure.safaris',
} as const;

/** Marketing page that holds the download button, install steps and notes. */
export const ANDROID_PAGE_PATH = '/android/';

/** Public API origin baked into the shipped APK. */
export const ANDROID_API_BASE_URL = 'https://api.meandadventuresafaris.com/v1';
