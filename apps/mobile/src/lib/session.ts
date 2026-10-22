import {create} from 'zustand';
import * as SecureStore from 'expo-secure-store';
import {QueryClient} from '@tanstack/react-query';
import type {LoginResult, Role, User} from './domain';
import {usePreferences} from './preferences';
export const queryClient=new QueryClient({defaultOptions:{queries:{staleTime:30_000,retry:1},mutations:{retry:false,networkMode:'always'}}});
export const refreshKey='ma-safaris.refresh.v1';
export const useSession=create<{user:User|null;role:Role|null;accessToken:string|null;restoring:boolean;setSession:(data:LoginResult)=>Promise<void>;setUser:(user:User)=>void;setRole:(role:Role)=>void;clear:()=>Promise<void>;ready:()=>void}>(set=>({
 user:null,role:null,accessToken:null,restoring:true,
 setSession:async data=>{const previous=useSession.getState().user;if(previous&&previous.id!==data.user.id){queryClient.clear();usePreferences.getState().clear();}await SecureStore.setItemAsync(refreshKey,data.refreshToken,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});set(state=>({user:data.user,accessToken:data.accessToken,role:state.user?.id===data.user.id&&state.role&&data.user.roles.includes(state.role)?state.role:(data.user.roles[0]??null),restoring:false}));usePreferences.getState().setLocale(data.user.locale??'en');},
 setUser:user=>set(state=>({user,role:state.role&&user.roles.includes(state.role)?state.role:(user.roles[0]??null)})),
 setRole:role=>{const state=useSession.getState();if(!state.user?.roles.includes(role))throw new Error('ROLE_CONTEXT_DENIED');queryClient.clear();usePreferences.getState().clear();set({role});},
 clear:async()=>{await SecureStore.deleteItemAsync(refreshKey);queryClient.clear();usePreferences.getState().clear();set({user:null,role:null,accessToken:null,restoring:false});},ready:()=>set({restoring:false})
}));
/** One operation for concurrent expiry responses, so refresh rotation cannot revoke its own family. */
export function singleFlight<T>(operation:()=>Promise<T>):()=>Promise<T> {let running:Promise<T>|null=null;return ()=>{if(!running)running=operation().finally(()=>{running=null;});return running;};}
