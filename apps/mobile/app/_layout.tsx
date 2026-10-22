import React from 'react';
import { Stack, ErrorBoundary, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import { Manrope_500Medium, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Providers } from '../src/lib/Providers';
import { PersistentCustomerBottomNav } from '../src/ui/components';

export { ErrorBoundary };

export default function RootLayout() {
  const pathname = usePathname();
  const [loaded, error] = useFonts({
    Manrope_500Medium,
    Manrope_700Bold,
    PlayfairDisplay_600SemiBold,
    DMSans_400Regular,
  });

  if (!loaded && !error) {
    return null;
  }

  return (
    <Providers>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
        <PersistentCustomerBottomNav pathname={pathname} />
      </View>
    </Providers>
  );
}
