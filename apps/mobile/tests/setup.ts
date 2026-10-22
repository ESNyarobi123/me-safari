jest.mock('expo-secure-store',()=>({getItemAsync:jest.fn(async()=>null),setItemAsync:jest.fn(async()=>undefined),deleteItemAsync:jest.fn(async()=>undefined),WHEN_UNLOCKED_THIS_DEVICE_ONLY:'device'}));
jest.mock('@react-native-community/netinfo',()=>({useNetInfo:()=>({isConnected:true,isInternetReachable:true}),default:{addEventListener:()=>()=>{},fetch:async()=>({isConnected:true,isInternetReachable:true})}}));
jest.mock('expo-router',()=>({router:{push:jest.fn(),replace:jest.fn(),back:jest.fn(),canGoBack:()=>true},useLocalSearchParams:()=>({}),useNavigation:()=>({dispatch:jest.fn()}),Redirect:()=>null,Stack:()=>null,Tabs:()=>null}));
jest.mock('expo-router/react-navigation',()=>({usePreventRemove:jest.fn()}));
jest.mock('expo-constants',()=>({__esModule:true,default:{expoConfig:{extra:{apiUrl:'http://localhost:4000/v1'}}}}));
jest.mock('expo-crypto',()=>({randomUUID:()=> 'stable-action-key',CryptoDigestAlgorithm:{SHA256:'SHA256'},digestStringAsync:async (_algorithm:string,value:string)=>value.length.toString()}));
jest.mock('react-native-safe-area-context',()=>{const React=require('react');const {View}=require('react-native');return {SafeAreaView:View,SafeAreaProvider:({children}:{children:unknown})=>children,useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})};});
