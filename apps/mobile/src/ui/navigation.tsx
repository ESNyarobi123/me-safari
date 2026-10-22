import React from 'react';
import {Redirect,Stack,Tabs,type Href} from 'expo-router';
import {StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSession} from '../lib/session';
import {roleHome,type Role} from '../lib/domain';
import {useT} from '../lib/i18n';
import {FloatingTabBar,type FloatingTabItem,type NavIconKind} from './components';
import {colors} from './theme';

export function RoleLayout({role}:{role:Role}){
 const session=useSession();
 if(role==='CUSTOMER'&&!session.user){
  return <Stack screenOptions={{headerShown:false,animation:'none'}}/>;
 }
 if(!session.user?.roles.includes(role)||session.role!==role){
  return <Redirect href={(session.role?roleHome[session.role]:'/login') as Href}/>;
 }
 return <Stack screenOptions={{headerShown:false,animation:'none'}}/>;
}

type TabDef={name:string;label:string;icon:NavIconKind};

const tabs:Record<Exclude<Role,'CUSTOMER'>,TabDef[]> = {
 OPERATIONS:[
  {name:'today',label:'Today',icon:'home'},
  {name:'requests',label:'Requests',icon:'stars'},
  {name:'bookings',label:'Bookings',icon:'bookmark'},
  {name:'trips',label:'Trips',icon:'grid-search'},
 ],
 DRIVER_GUIDE:[
  {name:'my-trips',label:'My Trips',icon:'home'},
  {name:'itinerary',label:'Itinerary',icon:'bookmark'},
  {name:'progress',label:'Progress',icon:'grid-search'},
  {name:'support',label:'Support',icon:'stars'},
 ],
 ADMIN:[
  {name:'overview',label:'Overview',icon:'home'},
  {name:'bookings',label:'Bookings',icon:'bookmark'},
  {name:'finance',label:'Finance',icon:'stars'},
  {name:'settings',label:'Settings',icon:'profile'},
 ],
};

type TabBarState={index:number;routes:{key:string;name:string}[]};
type TabBarNavigation={navigate:(name:string)=>void;emit:(event:{type:'tabPress';target:string;canPreventDefault:boolean})=>{defaultPrevented:boolean}};

function RoleTabBar({state,navigation,defs,role}:{state:TabBarState;navigation:TabBarNavigation;defs:TabDef[];role:string}){
 const t=useT();
 const items:FloatingTabItem[]=defs.map(def=>{
  const index=state.routes.findIndex(route=>route.name===def.name);
  const focused=index===state.index;
  return {
   key:def.name,
   label:t(def.label),
   icon:def.icon,
   active:focused,
   onPress:()=>{
    if(index<0)return;
    const event=navigation.emit({type:'tabPress',target:state.routes[index]!.key,canPreventDefault:true});
    if(!focused&&!event.defaultPrevented)navigation.navigate(def.name);
   },
  };
 });
 return <SafeAreaView edges={['bottom']} style={navStyles.wrap}><FloatingTabBar items={items} groupKey={`role-${role}`}/></SafeAreaView>;
}

export function RoleTabs({role}:{role:Role}){
 if(role==='CUSTOMER'){
  return <Tabs screenOptions={{headerShown:false,tabBarStyle:{display:'none'}}}/>;
 }
 const defs=tabs[role];
 return <Tabs tabBar={(props)=><RoleTabBar state={props.state as unknown as TabBarState} navigation={props.navigation as unknown as TabBarNavigation} defs={defs} role={role}/>} screenOptions={{headerShown:false}}>
  {defs.map(def=><Tabs.Screen key={def.name} name={def.name} options={{title:def.label}}/>)}
 </Tabs>;
}

const navStyles=StyleSheet.create({
 wrap:{backgroundColor:colors.cream,paddingHorizontal:14,paddingTop:4,paddingBottom:8},
});
