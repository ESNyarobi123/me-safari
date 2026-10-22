import type { ExpoConfig } from 'expo/config';
const config: ExpoConfig = {
  name: 'M&A Safaris', slug: 'ma-safaris', version: '1.0.0', scheme: 'masafaris', orientation: 'default', userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  ios: { bundleIdentifier: 'tz.meandadventure.safaris', supportsTablet: true, infoPlist: {NSPhotoLibraryUsageDescription: 'Choose a photo to attach to a trip issue or support conversation.'} },
  android: { package: 'tz.meandadventure.safaris', permissions: [], adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#FFFFFF' } },
  web: { favicon: './assets/favicon.png' },
  plugins: [['expo-splash-screen', {image: './assets/splash.png', imageWidth: 220, resizeMode: 'contain', backgroundColor: '#F6F3ED'}], 'expo-router','expo-secure-store', ['expo-image-picker',{photosPermission:'Choose a photo to attach to a trip issue or support conversation.',cameraPermission:false,microphonePermission:false}], 'expo-notifications'],
  experiments: { typedRoutes: false },
  extra: {apiUrl:process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1', developmentPayments:process.env.EXPO_PUBLIC_DEVELOPMENT_PAYMENTS === 'true', eas: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ? {projectId:process.env.EXPO_PUBLIC_EAS_PROJECT_ID}:undefined}
};
export default config;
