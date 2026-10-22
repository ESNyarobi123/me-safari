import React,{useEffect,type ReactNode} from 'react';
import {AppState,Platform} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {QueryClientProvider,focusManager,onlineManager} from '@tanstack/react-query';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {isRunningInExpoGo} from 'expo';
import {router,type Href} from 'expo-router';
import {queryClient} from './session';
import {restoreSession} from './api';

export function Providers({children}:{children:ReactNode}){
  useEffect(()=>{
    void restoreSession();
    const app=AppState.addEventListener('change',state=>focusManager.setFocused(state==='active'));
    const network=NetInfo.addEventListener(state=>onlineManager.setOnline(state.isConnected===true&&state.isInternetReachable!==false));
    
    let removeNotificationListener: (()=>void)|undefined;
    const canUseNotifications=!(Platform.OS==='android'&&isRunningInExpoGo());
    if(canUseNotifications){
      try{
        // Dynamic require ensures expo-notifications is not evaluated in Expo Go on Android
        // where SDK 53+ intentionally throws a fatal unhandled error at top-level evaluation.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Notifications=require('expo-notifications');
        const subscription=Notifications.addNotificationResponseReceivedListener?.((event: { notification?: { request?: { content?: { data?: Record<string, unknown> } } } })=>{
          const data=event?.notification?.request?.content?.data??{};
          void queryClient.invalidateQueries();
          const path=typeof data.path==='string'?data.path:'';
          if(/^\/(customer|operations|guide|admin|notifications|support)\//.test(path)){
            router.push(path as Href);
          }
        });
        if(subscription?.remove){
          removeNotificationListener=()=>subscription.remove();
        }
      }catch(err){
        console.warn('Notification listener skipped:', err);
      }
    }

    return ()=>{
      app.remove();
      network();
      removeNotificationListener?.();
    };
  },[]);

  return <SafeAreaProvider><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></SafeAreaProvider>;
}
