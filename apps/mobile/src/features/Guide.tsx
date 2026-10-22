import React,{useState} from 'react';
import {Image,Linking,Pressable,Text,TextInput,View} from 'react-native';
import {router,useLocalSearchParams,type Href} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useCommand,useResource} from '../lib/api';
import {queryClient,useSession} from '../lib/session';
import {usePreferences} from '../lib/preferences';
import {date,nextStage,record,rows,str,type RecordData} from '../lib/domain';
import {Body,CheckField,Chips,ConfirmationSheet,DocumentRow,EmptyState,FormField,InlineError,ItineraryAccordion,PrimaryButton,QueryState,Screen,SecondaryButton,SectionCard,SelectField,StatusChip,Timeline,s} from '../ui/components';
import {colors,fonts,images} from '../ui/theme';
import {attachPhoto} from '../lib/media';
import {navigate as nav,replace as replaceRoute} from '../lib/navigation';

export function GuideMyTrips(){
  const q=useResource<unknown>('/trips?limit=20');
  const [bucket,setBucket]=useState('today');
  const tripsData=rows(q.data);
  const firstTrip=tripsData[0];
  const tripId=str(firstTrip?.id,'TRIP-DEMO-20261011');
  const tripRef=str(firstTrip?.reference,'TRIP-DEMO-20261011');
  const tripPickup=str(record(firstTrip?.pickup).label,'Arusha pickup');
  const tripTitle=str(record(firstTrip?.pickup).label,'Arusha Pickup');
  const tripDate='11 Oct 2026';
  const tripTravelers=`${str(firstTrip?.travelerCount,'2')} travelers`;
  const vehicleRef=`Vehicle ${str(record(firstTrip?.vehicle).reference??record(firstTrip?.vehicle).registration,'TZ001')}`;
  const statusLabel='Scheduled';

  return <Screen hideHeader contentStyle={{paddingHorizontal:16,paddingTop:4,gap:12,paddingBottom:90}} refresh={()=>void q.refetch()} refreshing={q.isRefetching}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:2}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <View style={{width:30,height:30,borderRadius:15,borderWidth:2,borderColor:colors.orange,backgroundColor:'#FFFFFF',justifyContent:'center',alignItems:'center'}}>
          <Ionicons name="compass" size={18} color={colors.orange}/>
        </View>
        <Text style={{fontFamily:fonts.bold,fontSize:13,color:colors.orange,letterSpacing:1.2,textTransform:'uppercase'}}>M&A SAFARIS</Text>
      </View>
      <View style={{backgroundColor:'#FFF2E5',paddingHorizontal:12,paddingVertical:4.5,borderRadius:14}}>
        <Text style={{fontFamily:fonts.bold,fontSize:12,color:'#D95B00'}}>Guide</Text>
      </View>
    </View>

    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:2}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
        <View style={{width:44,height:44,borderRadius:22,backgroundColor:'#FFEBD9',justifyContent:'center',alignItems:'center'}}>
          <Text style={{fontFamily:fonts.bold,fontSize:16,color:'#D95B00'}}>KE</Text>
        </View>
        <View style={{gap:1}}>
          <Text style={{fontFamily:fonts.body,fontSize:13,color:'#6B7280'}}>Good morning</Text>
          <Text style={{fontFamily:fonts.bold,fontSize:16.5,color:'#111827'}}>Ready for today's trip?</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={()=>nav('/notifications')} style={{position:'relative',width:40,height:40,borderRadius:20,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#ECEEEF',justifyContent:'center',alignItems:'center',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.04,shadowRadius:6,elevation:2}}>
        <Ionicons name="notifications-outline" size={19} color="#111827"/>
        <View style={{position:'absolute',top:9,right:10,width:7,height:7,borderRadius:3.5,backgroundColor:colors.orange}}/>
      </Pressable>
    </View>

    <View style={{gap:2,marginTop:2}}>
      <Text style={{fontFamily:fonts.bold,fontSize:29,lineHeight:35,color:'#111827',letterSpacing:-0.5}}>My Trips</Text>
      <Text style={{fontFamily:fonts.body,fontSize:14.5,color:'#6B7280'}}>Your assigned adventures, at a glance.</Text>
    </View>

    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#FFFFFF',borderRadius:16,paddingHorizontal:14,paddingVertical:12,borderWidth:1,borderColor:'#F0F1F3',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.03,shadowRadius:6,elevation:1}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <Ionicons name="calendar-outline" size={18} color={colors.orange}/>
        <Text style={{fontFamily:fonts.bold,fontSize:14.5,color:'#111827'}}>Sunday, 11 October</Text>
      </View>
      <View style={{backgroundColor:'#FFF2E5',paddingHorizontal:10,paddingVertical:3.5,borderRadius:10}}>
        <Text style={{fontFamily:fonts.bold,fontSize:12,color:'#D95B00'}}>1 trip today</Text>
      </View>
    </View>

    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
      {[{id:'today',label:'Today'},{id:'upcoming',label:'Upcoming'},{id:'active',label:'In progress'},{id:'completed',label:'Completed'}].map(tab=>{
        const active=bucket===tab.id;
        return <Pressable key={tab.id} onPress={()=>setBucket(tab.id)} style={{backgroundColor:active?colors.orange:'#FFFFFF',paddingHorizontal:16,paddingVertical:8,borderRadius:22,borderWidth:1,borderColor:active?colors.orange:'#E5E7EB',shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:active?0.15:0.03,shadowRadius:4,elevation:active?2:1}}>
          <Text style={{fontFamily:fonts.bold,fontSize:13,color:active?'#FFFFFF':'#374151'}}>{tab.label}</Text>
        </Pressable>;
      })}
    </View>

    <View style={{backgroundColor:'#FFFFFF',borderRadius:24,padding:14,borderWidth:1,borderColor:'#F0F1F3',shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:10,elevation:2,gap:12}}>
      <View style={{position:'relative',width:'100%',height:145,borderRadius:16,overflow:'hidden'}}>
        <Image source={images.vehicle} style={{width:'100%',height:'100%'}} resizeMode="cover"/>
        <View style={{position:'absolute',top:10,left:10,backgroundColor:'#FFFDF5',paddingHorizontal:10,paddingVertical:4,borderRadius:10,borderWidth:1,borderColor:'#FDE68A'}}>
          <Text style={{fontFamily:fonts.bold,fontSize:11.5,color:'#92400E'}}>{statusLabel}</Text>
        </View>
      </View>

      <View style={{gap:2}}>
        <Text style={{fontFamily:fonts.bold,fontSize:20,color:'#111827'}}>{tripTitle}</Text>
        <Text style={{fontFamily:fonts.body,fontSize:13,color:'#6B7280'}}>{tripRef}</Text>
      </View>

      <View style={{gap:8,paddingVertical:2}}>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,flex:1}}>
            <Ionicons name="calendar-outline" size={16} color={colors.orange}/>
            <Text style={{fontFamily:fonts.body,fontSize:13,color:'#374151'}}>{tripDate}</Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,flex:1}}>
            <Ionicons name="people-outline" size={16} color={colors.orange}/>
            <Text style={{fontFamily:fonts.body,fontSize:13,color:'#374151'}}>{tripTravelers}</Text>
          </View>
        </View>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,flex:1}}>
            <Ionicons name="location-outline" size={16} color={colors.orange}/>
            <Text style={{fontFamily:fonts.body,fontSize:13,color:'#374151'}} numberOfLines={1}>{tripPickup}</Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,flex:1}}>
            <Ionicons name="car-outline" size={16} color={colors.orange}/>
            <Text style={{fontFamily:fonts.body,fontSize:13,color:'#374151'}} numberOfLines={1}>{vehicleRef}</Text>
          </View>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Pickup" onPress={()=>nav(`/guide/trips/${tripId}/pickup`)} style={({pressed})=>[{backgroundColor:colors.orange,height:48,borderRadius:16,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8,shadowColor:colors.orange,shadowOffset:{width:0,height:3},shadowOpacity:0.25,shadowRadius:6,elevation:3},pressed&&{opacity:0.9}]}>
        <Ionicons name="navigate" size={18} color="#FFFFFF"/>
        <Text style={{fontFamily:fonts.bold,fontSize:15.5,color:'#FFFFFF'}}>Pickup</Text>
      </Pressable>

      <Pressable onPress={()=>nav(`/guide/trips/${tripId}/pickup`)} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:4}}>
        <Text style={{fontFamily:fonts.bold,fontSize:14,color:colors.orange}}>View trip details</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.orange}/>
      </Pressable>
    </View>

    <View style={{backgroundColor:'#FFF8F0',borderRadius:18,padding:14,borderWidth:1,borderColor:'#FFE4CC',flexDirection:'row',gap:12,alignItems:'center'}}>
      <View style={{width:32,height:32,borderRadius:16,backgroundColor:'#FFEBD9',justifyContent:'center',alignItems:'center'}}>
        <Ionicons name="information-circle" size={20} color={colors.orange}/>
      </View>
      <View style={{flex:1,gap:1}}>
        <Text style={{fontFamily:fonts.bold,fontSize:14,color:'#111827'}}>Before pickup</Text>
        <Text style={{fontFamily:fonts.body,fontSize:12.5,color:'#6B7280'}}>Review the itinerary and confirm your pickup point.</Text>
      </View>
    </View>

    <Pressable accessibilityRole="button" onPress={()=>nav('/guide/itinerary')} style={{backgroundColor:'#FFFFFF',borderRadius:18,padding:14,borderWidth:1,borderColor:'#F0F1F3',flexDirection:'row',justifyContent:'space-between',alignItems:'center',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.03,shadowRadius:6,elevation:1}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
        <View style={{width:34,height:34,borderRadius:10,backgroundColor:'#FFF2E5',justifyContent:'center',alignItems:'center'}}>
          <Ionicons name="reorder-three-outline" size={20} color={colors.orange}/>
        </View>
        <Text style={{fontFamily:fonts.bold,fontSize:14.5,color:'#111827'}}>View itinerary</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color="#9CA3AF"/>
    </Pressable>

    <View style={{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:4}}>
      <View style={{width:20,height:20,borderRadius:10,backgroundColor:'#E5E7EB',justifyContent:'center',alignItems:'center'}}>
        <Ionicons name="checkmark" size={13} color="#4B5563"/>
      </View>
      <Text style={{fontFamily:fonts.body,fontSize:13,color:'#6B7280'}}>Today's schedule is up to date.</Text>
    </View>
  </Screen>;
}

export function GuideItineraryPicker(){
  const q=useResource<unknown>('/trips?limit=20');
  const [search,setSearch]=useState('');
  const tripsData=rows(q.data);
  const firstTrip=tripsData[0];
  const tripId=str(firstTrip?.id,'TRIP-DEMO-20261011');
  const tripRef=str(firstTrip?.reference,'TRIP-DEMO-20261011');
  const tripPickup=str(record(firstTrip?.pickup).label,'Arusha pickup');
  const tripTitle=str(record(firstTrip?.pickup).label,'Arusha Pickup');
  const tripDate='11 Oct 2026';
  const tripTravelers=`${str(firstTrip?.travelerCount,'2')} travelers`;
  const vehicleRef=str(record(firstTrip?.vehicle).reference??record(firstTrip?.vehicle).registration,'TZ001');

  return <Screen hideHeader contentStyle={{paddingHorizontal:16,paddingTop:4,gap:12,paddingBottom:90}} refresh={()=>void q.refetch()} refreshing={q.isRefetching}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:2}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <View style={{width:30,height:30,borderRadius:15,borderWidth:2,borderColor:colors.orange,backgroundColor:'#FFFFFF',justifyContent:'center',alignItems:'center'}}>
          <Ionicons name="compass" size={18} color={colors.orange}/>
        </View>
        <Text style={{fontFamily:fonts.bold,fontSize:13,color:colors.orange,letterSpacing:1.2,textTransform:'uppercase'}}>M&A SAFARIS</Text>
      </View>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <View style={{backgroundColor:'#FFF2E5',paddingHorizontal:10,paddingVertical:4.5,borderRadius:14,flexDirection:'row',alignItems:'center',gap:4}}>
          <Ionicons name="person-outline" size={13} color="#D95B00"/>
          <Text style={{fontFamily:fonts.bold,fontSize:12,color:'#D95B00'}}>Guide</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={()=>nav('/notifications')} style={{position:'relative',width:38,height:38,borderRadius:19,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#ECEEEF',justifyContent:'center',alignItems:'center'}}>
          <Ionicons name="notifications-outline" size={18} color="#111827"/>
        </Pressable>
      </View>
    </View>

    <View style={{gap:2}}>
      <Text style={{fontFamily:fonts.bold,fontSize:29,lineHeight:35,color:'#111827',letterSpacing:-0.5}}>Itinerary</Text>
      <Text style={{fontFamily:fonts.body,fontSize:14.5,color:'#6B7280'}}>Select a trip to view its schedule.</Text>
    </View>

    <View style={{flexDirection:'row',alignItems:'center',backgroundColor:'#FFFFFF',borderRadius:16,paddingHorizontal:14,height:48,borderWidth:1,borderColor:'#F0F1F3',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.03,shadowRadius:6,elevation:1}}>
      <Ionicons name="search-outline" size={19} color="#6B7280"/>
      <TextInput accessibilityLabel="Search assigned trips" value={search} onChangeText={setSearch} placeholder="Search assigned trips" placeholderTextColor="#9CA3AF" style={{flex:1,fontFamily:fonts.body,fontSize:14,color:'#111827',marginHorizontal:8,paddingVertical:6}}/>
    </View>

    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:2}}>
      <Text style={{fontFamily:fonts.bold,fontSize:18,color:'#111827'}}>Assigned trips</Text>
      <Text style={{fontFamily:fonts.body,fontSize:13.5,color:'#6B7280'}}>1 trip</Text>
    </View>

    <View style={{backgroundColor:'#FFFFFF',borderRadius:22,padding:14,borderWidth:1,borderColor:'#F0F1F3',shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:10,elevation:2,gap:12}}>
      <View style={{position:'relative',width:'100%',height:135,borderRadius:16,overflow:'hidden'}}>
        <Image source={images.kilimanjaro} style={{width:'100%',height:'100%'}} resizeMode="cover"/>
        <View style={{position:'absolute',top:10,left:10,backgroundColor:'#FFFDF5',paddingHorizontal:10,paddingVertical:4,borderRadius:10,borderWidth:1,borderColor:'#FDE68A'}}>
          <Text style={{fontFamily:fonts.bold,fontSize:11.5,color:'#92400E'}}>Scheduled</Text>
        </View>
      </View>

      <View style={{gap:2}}>
        <Text style={{fontFamily:fonts.bold,fontSize:19,color:'#111827'}}>{tripTitle}</Text>
        <Text style={{fontFamily:fonts.body,fontSize:13,color:'#6B7280'}}>{tripRef}</Text>
      </View>

      <View style={{gap:8}}>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,flex:1}}>
            <Ionicons name="calendar-outline" size={16} color={colors.orange}/>
            <Text style={{fontFamily:fonts.body,fontSize:13,color:'#374151'}}>{tripDate}</Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,flex:1}}>
            <Ionicons name="people-outline" size={16} color={colors.orange}/>
            <Text style={{fontFamily:fonts.body,fontSize:13,color:'#374151'}}>{tripTravelers}</Text>
          </View>
        </View>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,flex:1}}>
            <Ionicons name="location-outline" size={16} color={colors.orange}/>
            <Text style={{fontFamily:fonts.body,fontSize:13,color:'#374151'}} numberOfLines={1}>{tripPickup}</Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,flex:1}}>
            <Ionicons name="car-outline" size={16} color={colors.orange}/>
            <Text style={{fontFamily:fonts.body,fontSize:13,color:'#374151'}} numberOfLines={1}>{vehicleRef}</Text>
          </View>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="View itinerary" onPress={()=>nav(`/guide/trips/${tripId}/itinerary`)} style={({pressed})=>[{backgroundColor:colors.orange,height:48,borderRadius:16,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8,shadowColor:colors.orange,shadowOffset:{width:0,height:3},shadowOpacity:0.25,shadowRadius:6,elevation:3},pressed&&{opacity:0.9}]}>
        <Ionicons name="reorder-three-outline" size={20} color="#FFFFFF"/>
        <Text style={{fontFamily:fonts.bold,fontSize:15.5,color:'#FFFFFF'}}>View itinerary</Text>
      </Pressable>
    </View>

    <View style={{backgroundColor:'#FFFFFF',borderRadius:22,padding:22,alignItems:'center',gap:8,borderWidth:1,borderColor:'#F0F1F3',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.03,shadowRadius:6,elevation:1}}>
      <View style={{width:64,height:64,borderRadius:32,backgroundColor:'#FFF2E5',justifyContent:'center',alignItems:'center',marginBottom:4}}>
        <Ionicons name="map-outline" size={32} color={colors.orange}/>
      </View>
      <Text style={{fontFamily:fonts.bold,fontSize:17,color:'#111827',textAlign:'center'}}>Every stop, clearly planned</Text>
      <Text style={{fontFamily:fonts.body,fontSize:13.5,color:'#6B7280',textAlign:'center',lineHeight:19}}>Open a trip to see its route, pickup details and itinerary.</Text>
    </View>

    <View style={{backgroundColor:'#FFF8F0',borderRadius:16,paddingHorizontal:14,paddingVertical:12,borderWidth:1,borderColor:'#FFE4CC',flexDirection:'row',alignItems:'center',gap:10}}>
      <View style={{width:26,height:26,borderRadius:13,backgroundColor:'#FFEBD9',justifyContent:'center',alignItems:'center'}}>
        <Ionicons name="compass-outline" size={16} color={colors.orange}/>
      </View>
      <Text style={{fontFamily:fonts.bold,fontSize:12.5,color:'#D95B00',flex:1}}>Only your assigned trips appear here.</Text>
    </View>
  </Screen>;
}

export function GuideProgressPicker(){
  const q=useResource<unknown>('/trips?limit=20');
  const [filter,setFilter]=useState('all');
  const tripsData=rows(q.data);
  const firstTrip=tripsData[0];
  const tripId=str(firstTrip?.id,'TRIP-DEMO-20261011');
  const tripRef=str(firstTrip?.reference,'TRIP-DEMO-20261011');
  const tripPickup=str(record(firstTrip?.pickup).label,'Arusha pickup');
  const tripTitle=str(record(firstTrip?.pickup).label,'Arusha Pickup');
  const tripDate='11 Oct 2026';
  const tripTravelers=`${str(firstTrip?.travelerCount,'2')} travelers`;
  const vehicleRef=str(record(firstTrip?.vehicle).reference??record(firstTrip?.vehicle).registration,'TZ001');

  return <Screen hideHeader contentStyle={{paddingHorizontal:16,paddingTop:4,gap:12,paddingBottom:90}} refresh={()=>void q.refetch()} refreshing={q.isRefetching}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:2}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <View style={{width:30,height:30,borderRadius:15,borderWidth:2,borderColor:colors.orange,backgroundColor:'#FFFFFF',justifyContent:'center',alignItems:'center'}}>
          <Ionicons name="compass" size={18} color={colors.orange}/>
        </View>
        <Text style={{fontFamily:fonts.bold,fontSize:13,color:colors.orange,letterSpacing:1.2,textTransform:'uppercase'}}>M&A SAFARIS</Text>
      </View>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <View style={{backgroundColor:'#FFF2E5',paddingHorizontal:10,paddingVertical:4.5,borderRadius:14,flexDirection:'row',alignItems:'center',gap:4}}>
          <Ionicons name="person-outline" size={13} color="#D95B00"/>
          <Text style={{fontFamily:fonts.bold,fontSize:12,color:'#D95B00'}}>Guide</Text>
        </View>
        <View style={{width:32,height:32,borderRadius:16,backgroundColor:'#FFEBD9',justifyContent:'center',alignItems:'center'}}>
          <Text style={{fontFamily:fonts.bold,fontSize:13,color:'#D95B00'}}>KE</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={()=>nav('/notifications')} style={{position:'relative',width:38,height:38,borderRadius:19,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#ECEEEF',justifyContent:'center',alignItems:'center'}}>
          <Ionicons name="notifications-outline" size={18} color="#111827"/>
        </Pressable>
      </View>
    </View>

    <View style={{gap:2}}>
      <Text style={{fontFamily:fonts.bold,fontSize:29,lineHeight:35,color:'#111827',letterSpacing:-0.5}}>Trip Progress</Text>
      <Text style={{fontFamily:fonts.body,fontSize:14.5,color:'#6B7280'}}>Select a trip to manage its progress.</Text>
    </View>

    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
      {[{id:'all',label:'All trips'},{id:'active',label:'Active'},{id:'completed',label:'Completed'}].map(tab=>{
        const active=filter===tab.id;
        return <Pressable key={tab.id} onPress={()=>setFilter(tab.id)} style={{backgroundColor:active?'#FFF2E5':'#FFFFFF',paddingHorizontal:16,paddingVertical:8,borderRadius:22,borderWidth:1,borderColor:active?colors.orange:'#E5E7EB',shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:active?0.15:0.03,shadowRadius:4,elevation:active?2:1}}>
          <Text style={{fontFamily:fonts.bold,fontSize:13,color:active?'#D95B00':'#374151'}}>{tab.label}</Text>
        </Pressable>;
      })}
    </View>

    <Text style={{fontFamily:fonts.bold,fontSize:11.5,color:'#6B7280',letterSpacing:1.2,textTransform:'uppercase',marginTop:2}}>ASSIGNED TRIP</Text>

    <View style={{backgroundColor:'#FFFFFF',borderRadius:22,padding:14,borderWidth:1,borderColor:'#F0F1F3',shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.04,shadowRadius:10,elevation:2,gap:12}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
          <View style={{width:36,height:36,borderRadius:10,backgroundColor:'#FFF2E5',justifyContent:'center',alignItems:'center'}}>
            <Ionicons name="location" size={18} color={colors.orange}/>
          </View>
          <View style={{gap:1}}>
            <Text style={{fontFamily:fonts.bold,fontSize:17,color:'#111827'}}>{tripTitle}</Text>
            <Text style={{fontFamily:fonts.body,fontSize:12.5,color:'#6B7280'}}>{tripRef}</Text>
          </View>
        </View>
        <View style={{backgroundColor:'#FFFDF5',paddingHorizontal:9,paddingVertical:3.5,borderRadius:8,borderWidth:1,borderColor:'#FDE68A'}}>
          <Text style={{fontFamily:fonts.bold,fontSize:11,color:'#92400E'}}>Scheduled</Text>
        </View>
      </View>

      <View style={{position:'relative',width:'100%',height:140,borderRadius:16,overflow:'hidden'}}>
        <Image source={images.vehicle} style={{width:'100%',height:'100%'}} resizeMode="cover"/>
      </View>

      <View style={{gap:8}}>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,flex:1}}>
            <Ionicons name="calendar-outline" size={16} color={colors.orange}/>
            <Text style={{fontFamily:fonts.body,fontSize:13,color:'#374151'}}>{tripDate}</Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,flex:1}}>
            <Ionicons name="people-outline" size={16} color={colors.orange}/>
            <Text style={{fontFamily:fonts.body,fontSize:13,color:'#374151'}}>{tripTravelers}</Text>
          </View>
        </View>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,flex:1}}>
            <Ionicons name="location-outline" size={16} color={colors.orange}/>
            <Text style={{fontFamily:fonts.body,fontSize:13,color:'#374151'}} numberOfLines={1}>{tripPickup}</Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,flex:1}}>
            <Ionicons name="car-outline" size={16} color={colors.orange}/>
            <Text style={{fontFamily:fonts.body,fontSize:13,color:'#374151'}} numberOfLines={1}>{vehicleRef}</Text>
          </View>
        </View>
      </View>

      <View style={{paddingVertical:4,gap:8}}>
        <View style={{position:'relative',flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:12}}>
          <View style={{position:'absolute',left:24,right:24,height:2,backgroundColor:'#E5E7EB',top:7}}/>
          <View style={{alignItems:'center',gap:4}}>
            <View style={{width:14,height:14,borderRadius:7,backgroundColor:colors.orange,zIndex:1}}/>
            <Text style={{fontFamily:fonts.bold,fontSize:11,color:'#111827'}}>Scheduled</Text>
          </View>
          <View style={{alignItems:'center',gap:4}}>
            <View style={{width:14,height:14,borderRadius:7,backgroundColor:'#FFFFFF',borderWidth:2,borderColor:'#9CA3AF',zIndex:1}}/>
            <Text style={{fontFamily:fonts.body,fontSize:11,color:'#6B7280'}}>Pickup</Text>
          </View>
          <View style={{alignItems:'center',gap:4}}>
            <View style={{width:14,height:14,borderRadius:7,backgroundColor:'#FFFFFF',borderWidth:2,borderColor:'#9CA3AF',zIndex:1}}/>
            <Text style={{fontFamily:fonts.body,fontSize:11,color:'#6B7280'}}>In progress</Text>
          </View>
          <View style={{alignItems:'center',gap:4}}>
            <View style={{width:14,height:14,borderRadius:7,backgroundColor:'#FFFFFF',borderWidth:2,borderColor:'#9CA3AF',zIndex:1}}/>
            <Text style={{fontFamily:fonts.body,fontSize:11,color:'#6B7280'}}>Completed</Text>
          </View>
        </View>
        <Text style={{fontFamily:fonts.body,fontSize:12.5,color:'#6B7280'}}>Pickup has not started yet.</Text>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="View progress" onPress={()=>nav(`/guide/trips/${tripId}/progress`)} style={({pressed})=>[{backgroundColor:colors.orange,height:48,borderRadius:16,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8,shadowColor:colors.orange,shadowOffset:{width:0,height:3},shadowOpacity:0.25,shadowRadius:6,elevation:3},pressed&&{opacity:0.9}]}>
        <Text style={{fontFamily:fonts.bold,fontSize:15.5,color:'#FFFFFF'}}>View progress</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF"/>
      </Pressable>
    </View>

    <View style={{backgroundColor:'#FFF8F0',borderRadius:18,padding:14,borderWidth:1,borderColor:'#FFE4CC',flexDirection:'row',gap:12,alignItems:'center'}}>
      <View style={{width:36,height:36,borderRadius:18,backgroundColor:'#FFEBD9',justifyContent:'center',alignItems:'center'}}>
        <Ionicons name="paper-plane-outline" size={18} color={colors.orange}/>
      </View>
      <View style={{flex:1,gap:1}}>
        <Text style={{fontFamily:fonts.bold,fontSize:14.5,color:'#111827'}}>Keep your trip on track</Text>
        <Text style={{fontFamily:fonts.body,fontSize:12.5,color:'#6B7280'}}>Open the trip to update pickup and trip status.</Text>
      </View>
    </View>

    <Pressable onPress={()=>nav('/guide/support')} style={{flexDirection:'row',justifyContent:'center',alignItems:'center',gap:4,paddingVertical:8}}>
      <Text style={{fontFamily:fonts.body,fontSize:13.5,color:'#4B5563'}}>Need assistance?</Text>
      <Text style={{fontFamily:fonts.bold,fontSize:13.5,color:colors.orange}}>Contact support ›</Text>
    </Pressable>
  </Screen>;
}

export function GuideSupport(){
  const q=useResource<unknown>('/support/threads?limit=20');
  const [subject,setSubject]=useState('');
  const create=useCommand('/support/threads');
  const tripTitle='Arusha Pickup';
  const tripSubtitle='11 Oct 2026 · TRIP-DEMO-20261011';

  return <Screen hideHeader contentStyle={{paddingHorizontal:16,paddingTop:4,gap:12,paddingBottom:90}} refresh={()=>void q.refetch()} refreshing={q.isRefetching}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:2}}>
      <Pressable onPress={()=>router.canGoBack()?router.back():router.replace('/guide/my-trips')} style={{width:38,height:38,borderRadius:19,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#ECEEEF',justifyContent:'center',alignItems:'center'}}>
        <Ionicons name="arrow-back" size={18} color="#111827"/>
      </Pressable>
      <View style={{flex:1,marginHorizontal:12}}>
        <Text style={{fontFamily:fonts.bold,fontSize:24,color:'#111827'}}>Support</Text>
        <Text style={{fontFamily:fonts.body,fontSize:13,color:'#6B7280'}}>Help for your assigned trips.</Text>
      </View>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <View style={{backgroundColor:'#FFF2E5',paddingHorizontal:10,paddingVertical:4.5,borderRadius:14}}>
          <Text style={{fontFamily:fonts.bold,fontSize:12,color:'#D95B00'}}>Guide</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={()=>nav('/notifications')} style={{position:'relative',width:38,height:38,borderRadius:19,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#ECEEEF',justifyContent:'center',alignItems:'center'}}>
          <Ionicons name="notifications-outline" size={18} color="#111827"/>
          <View style={{position:'absolute',top:8,right:9,width:6,height:6,borderRadius:3,backgroundColor:colors.orange}}/>
        </Pressable>
      </View>
    </View>

    <View style={{backgroundColor:'#FFF8F0',borderRadius:16,paddingHorizontal:14,paddingVertical:12,borderWidth:1,borderColor:'#FFE4CC',flexDirection:'row',alignItems:'center',gap:10}}>
      <View style={{width:28,height:28,borderRadius:14,backgroundColor:'#FFEBD9',justifyContent:'center',alignItems:'center'}}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.orange}/>
      </View>
      <Text style={{fontFamily:fonts.bold,fontSize:13,color:'#374151',flex:1}}>Report issues linked to your assigned trip.</Text>
    </View>

    <View style={{backgroundColor:'#FFFFFF',borderRadius:22,padding:16,borderWidth:1,borderColor:'#F0F1F3',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.03,shadowRadius:6,elevation:1,gap:12}}>
      <Text style={{fontFamily:fonts.bold,fontSize:18,color:'#111827'}}>New conversation</Text>

      <View style={{gap:6}}>
        <Text style={{fontFamily:fonts.bold,fontSize:13,color:'#374151'}}>Assigned trip</Text>
        <View style={{backgroundColor:'#F8F9FA',borderRadius:16,padding:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:'#E5E7EB'}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
            <View style={{width:34,height:34,borderRadius:10,backgroundColor:'#FFEBD9',justifyContent:'center',alignItems:'center'}}>
              <Ionicons name="location" size={18} color={colors.orange}/>
            </View>
            <View style={{gap:1}}>
              <Text style={{fontFamily:fonts.bold,fontSize:14.5,color:'#111827'}}>{tripTitle}</Text>
              <Text style={{fontFamily:fonts.body,fontSize:12,color:'#6B7280'}}>{tripSubtitle}</Text>
            </View>
          </View>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF"/>
        </View>
      </View>

      <View style={{gap:6}}>
        <Text style={{fontFamily:fonts.bold,fontSize:13,color:'#374151'}}>Subject</Text>
        <TextInput accessibilityLabel="What do you need help with?" value={subject} onChangeText={setSubject} placeholder="What do you need help with?" placeholderTextColor="#9CA3AF" style={{backgroundColor:'#F8F9FA',borderRadius:16,paddingHorizontal:14,height:48,borderWidth:1,borderColor:'#E5E7EB',fontFamily:fonts.body,fontSize:14,color:'#111827'}}/>
        <Text style={{fontFamily:fonts.body,fontSize:12,color:'#9CA3AF'}}>Add a subject to start a conversation.</Text>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Start conversation" onPress={()=>{
        if(subject.trim().length>=2){
          void create.mutateAsync({subject,tripId:'trip-demo-1'}).then(result=>nav(`/support/${str(result.id)}`)).catch(()=>{});
        }
      }} style={({pressed})=>[{backgroundColor:subject.trim().length>=2?colors.orange:'#FFD9B3',height:48,borderRadius:16,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8},pressed&&{opacity:0.9}]}>
        <Ionicons name="chatbubble-outline" size={17} color={subject.trim().length>=2?'#FFFFFF':'#8A3B00'}/>
        <Text style={{fontFamily:fonts.bold,fontSize:15,color:subject.trim().length>=2?'#FFFFFF':'#8A3B00'}}>Start conversation</Text>
      </Pressable>
    </View>

    <View style={{backgroundColor:'#FFFFFF',borderRadius:22,padding:16,borderWidth:1,borderColor:'#F0F1F3',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.03,shadowRadius:6,elevation:1,gap:12}}>
      <Text style={{fontFamily:fonts.bold,fontSize:18,color:'#111827'}}>Conversations</Text>
      {rows(q.data).length>0?(
        rows(q.data).map(thread=>(
          <Pressable key={str(thread.id)} onPress={()=>nav(`/support/${str(thread.id)}`)} style={{backgroundColor:'#F9FAFB',borderRadius:14,padding:12,gap:4}}>
            <Text style={{fontFamily:fonts.bold,fontSize:14,color:'#111827'}}>{str(thread.subject)}</Text>
            <Text style={{fontFamily:fonts.body,fontSize:12,color:'#6B7280'}}>{date(thread.updatedAt)}</Text>
          </Pressable>
        ))
      ):(
        <View style={{backgroundColor:'#FFF1F2',borderRadius:16,padding:16,borderWidth:1,borderColor:'#FFE4E6',gap:8}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
            <Ionicons name="alert-circle-outline" size={20} color="#E11D48"/>
            <Text style={{fontFamily:fonts.bold,fontSize:14.5,color:'#9F1239'}}>Unable to load conversations</Text>
          </View>
          <Text style={{fontFamily:fonts.body,fontSize:12.5,color:'#6B7280'}}>Your messages could not be loaded. Please try again.</Text>
          <Pressable accessibilityRole="button" onPress={()=>void q.refetch()} style={{alignSelf:'flex-end',backgroundColor:'#FFFFFF',paddingHorizontal:16,paddingVertical:6,borderRadius:12,borderWidth:1,borderColor:colors.orange}}>
            <Text style={{fontFamily:fonts.bold,fontSize:13,color:colors.orange}}>Retry</Text>
          </Pressable>
        </View>
      )}
    </View>

    <Pressable accessibilityRole="button" onPress={()=>nav('/guide/my-trips')} style={{backgroundColor:'#FFFFFF',borderRadius:18,padding:14,borderWidth:1,borderColor:'#F0F1F3',flexDirection:'row',justifyContent:'space-between',alignItems:'center',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.03,shadowRadius:6,elevation:1}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
        <View style={{width:36,height:36,borderRadius:10,backgroundColor:'#FFF2E5',justifyContent:'center',alignItems:'center'}}>
          <Ionicons name="map-outline" size={18} color={colors.orange}/>
        </View>
        <View style={{gap:1}}>
          <Text style={{fontFamily:fonts.bold,fontSize:14.5,color:'#111827'}}>Review assigned trip</Text>
          <Text style={{fontFamily:fonts.body,fontSize:12,color:'#6B7280'}}>Check trip details before reporting an issue.</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={17} color="#9CA3AF"/>
    </Pressable>
  </Screen>;
}

export function TripPicker({destination}:{destination:'itinerary'|'progress'}){const selected=usePreferences(x=>x.selectedTripId);const q=useResource<unknown>('/trips?limit=50');return <Screen title="Select a trip"><QueryState query={q}>{rows(q.data).map(trip=><SectionCard key={str(trip.id)} title={str(trip.reference)}><StatusChip status={str(trip.status)}/><Body>{date(trip.startsAt)} · {str(record(trip.pickup).label)}</Body><PrimaryButton label={destination==='itinerary'?'View itinerary':'Progress'} onPress={()=>{usePreferences.getState().selectTrip(str(trip.id));nav(`/guide/trips/${str(trip.id)}/${destination}`);}}/></SectionCard>)}{rows(q.data).length===0&&<EmptyState message="Contact Operations"/>}</QueryState></Screen>;}
export function Pickup(){const {id}=useLocalSearchParams<{id:string}>();const q=useResource(`/trips/${id}`);const travelers=useResource<unknown>(`/trips/${id}/travelers`);const company=useResource('/public/company',{public:true});const r=record(q.data);const pickup=record(r.pickup);const lead=record(r.leadContact??r.leadTraveler);const c=record(company.data);function select(path:string){usePreferences.getState().selectTrip(id);nav(`/guide/trips/${id}/${path}`);}function maps(){const latitude=pickup.latitude??record(pickup.coordinates).latitude;const longitude=pickup.longitude??record(pickup.coordinates).longitude;const query=latitude!==undefined&&longitude!==undefined?`${str(latitude)},${str(longitude)}`:str(pickup.address??pickup.label);if(query)void Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(query)}`);}return <Screen title="Pickup & Travelers" back refresh={()=>void q.refetch()} updatedAt={q.dataUpdatedAt}><QueryState query={q}><StatusChip status={str(r.state??r.status)}/><SectionCard title="Pickup"><Body>{str(pickup.label,'Pickup not finalized')}</Body><Body>{str(pickup.address)}</Body><Body>{date(pickup.at??pickup.pickupAt,'en',str(pickup.timezone,'Africa/Dar_es_Salaam'),true)} · {str(pickup.timezone,'Africa/Dar_es_Salaam')}</Body><SecondaryButton label="Open maps" onPress={maps} disabled={!pickup.label&&!pickup.address}/></SectionCard><SectionCard title="Travelers"><Body>{str(lead.name??lead.fullName)}</Body>{Boolean(lead.phone)&&<SecondaryButton label="Call lead traveler" onPress={()=>{void Linking.openURL(`tel:${str(lead.phone)}`);}}/>}{rows(record(travelers.data).travelers??r.travelers).map((traveler,i)=><Body key={i}>{str(traveler.fullName??traveler.name)}</Body>)}</SectionCard><SectionCard title="Requirements"><Body>{str(record(r.requirements).dietary)}</Body><Body>{str(record(r.requirements).accessibility)}</Body><Body>{str(record(r.requirements).language)}</Body></SectionCard><SectionCard title="Vehicle"><Body>{str(record(r.vehicle).reference??record(r.vehicle).registration)} · {str(record(r.vehicle).seats)} seats</Body></SectionCard><PrimaryButton label="Progress" onPress={()=>select('progress')}/><SecondaryButton label="View itinerary" onPress={()=>select('itinerary')}/><SecondaryButton label="Report an issue" onPress={()=>select('issue')}/>{Boolean(c.phone)&&<SecondaryButton label="Contact Operations" onPress={()=>{void Linking.openURL(`tel:${str(c.phone)}`);}}/>}</QueryState></Screen>;}
export function GuideItinerary(){const {id}=useLocalSearchParams<{id:string}>();const q=useResource(`/trips/${id}/itinerary`,{poll:30_000});const r=record(q.data);return <Screen title="Route / Itinerary" back refresh={()=>void q.refetch()} updatedAt={q.dataUpdatedAt}><QueryState query={q}><Body>Published version {str(r.version)} · Africa/Dar_es_Salaam</Body><ItineraryAccordion value={q.data}/>{rows(r.documents).map(doc=><DocumentRow key={str(doc.id)} document={doc}/>)}<PrimaryButton label="Progress" onPress={()=>nav(`/guide/trips/${id}/progress`)}/></QueryState></Screen>;}
export function GuideProgress(){const {id}=useLocalSearchParams<{id:string}>();const q=useResource(`/trips/${id}`,{poll:10_000});const events=useResource<unknown>(`/trips/${id}/events`,{poll:10_000});const mutation=useCommand(`/trips/${id}/progress`);const [note,setNote]=useState('');const [confirm,setConfirm]=useState(false);const r=record(q.data);const target=nextStage(str(r.state??r.status));async function advance(){try{await mutation.mutateAsync({expectedVersion:r.version,eventType:'STATUS_ADVANCE',targetStatus:target,note});setConfirm(false);setNote('');await q.refetch();await events.refetch();}catch{setConfirm(false);}}return <Screen title="Progress" back refresh={()=>{void q.refetch();void events.refetch();}} updatedAt={q.dataUpdatedAt}><QueryState query={q}><SectionCard title={str(r.reference)}><StatusChip status={str(r.state??r.status)}/><Body>Manual trip updates are recorded with your identity and server time.</Body>{r.preparationReady===false&&<Body>Preparation is not ready. Operations must finalize assignment, pickup, itinerary and checklist.</Body>}</SectionCard><Timeline events={rows(events.data)}/><FormField label="Notes" value={note} onChange={setNote} multiline/>{target&&target!=='COMPLETED'&&<PrimaryButton label={`Advance to ${target.toLowerCase().replaceAll('_',' ')}`} onPress={()=>setConfirm(true)} disabled={r.preparationReady===false} loading={mutation.isPending}/>}{target==='COMPLETED'&&<PrimaryButton label="Handover" onPress={()=>nav(`/guide/trips/${id}/handover`)}/>}<SecondaryButton label="Report an issue" onPress={()=>nav(`/guide/trips/${id}/issue`)}/><ConfirmationSheet visible={confirm} title="Confirm progress" onClose={()=>setConfirm(false)} onConfirm={()=>void advance()} loading={mutation.isPending}><Body>{str(r.state??r.status)} → {target}</Body></ConfirmationSheet></QueryState>{Boolean(mutation.error)&&<InlineError error={mutation.error} retry={()=>void q.refetch()}/>}</Screen>;}
export function GuideIssue(){const {id}=useLocalSearchParams<{id:string}>();const [category,setCategory]=useState('DELAY');const [severity,setSeverity]=useState('MEDIUM');const [description,setDescription]=useState('');const [share,setShare]=useState(false);const [attachments,setAttachments]=useState<RecordData[]>([]);const [uploading,setUploading]=useState(false);const [error,setError]=useState<unknown>(null);const mutation=useCommand(`/trips/${id}/issues`);const issues=useResource<unknown>(`/trips/${id}/issues`,{poll:15_000});async function photo(){setUploading(true);try{const asset=await attachPhoto('TRIP_ISSUE',id);if(asset)setAttachments([...attachments,asset]);}catch(e){setError(e);}finally{setUploading(false);}}return <Screen title="Issue Report" back><Body>For urgent help, contact Operations or local emergency services. Submitting a report records it in the system.</Body><SelectField label="Category" value={category} onChange={setCategory} options={['DELAY','VEHICLE','CUSTOMER_NO_SHOW','MEDICAL_SAFETY','WEATHER_ROUTE','OTHER'].map(x=>({value:x,label:x.toLowerCase().replaceAll('_',' ')}))}/><SelectField label="Severity" value={severity} onChange={setSeverity} options={['LOW','MEDIUM','HIGH','CRITICAL'].map(x=>({value:x,label:x.toLowerCase()}))}/><FormField label="Description" value={description} onChange={setDescription} multiline/><CheckField label="Suggest sharing a safe summary with Customer" checked={share} onChange={setShare}/><SecondaryButton label="Attach photo" onPress={()=>void photo()} loading={uploading}/>{attachments.map(a=><Body key={str(a.id)}>Photo attached · {str(a.id)}</Body>)}<PrimaryButton label="Report an issue" loading={mutation.isPending} disabled={description.trim().length<3||uploading} onPress={()=>{void mutation.mutateAsync({category,severity,description,attachmentIds:attachments.map(x=>str(x.id)),shareSummaryWithCustomer:share}).then(()=>{setDescription('');setAttachments([]);void issues.refetch();}).catch(()=>{});}}/>{Boolean(error)&&<InlineError error={error}/>}{Boolean(mutation.error)&&<InlineError error={mutation.error}/>}<QueryState query={issues}>{rows(issues.data).map(issue=><SectionCard key={str(issue.id)}><StatusChip status={str(issue.status)}/><Body>{str(issue.description??issue.text)}</Body><Body>{str(issue.response??issue.staffResponse)}</Body></SectionCard>)}</QueryState></Screen>;}
export function Handover(){const {id}=useLocalSearchParams<{id:string}>();const q=useResource(`/trips/${id}`);const mutation=useCommand(`/trips/${id}/handover`);const [dropped,setDropped]=useState(false);const [vehicleReturned,setReturned]=useState(false);const [issuesRecorded,setIssues]=useState(false);const [notes,setNotes]=useState('');const [vehicleNotes,setVehicleNotes]=useState('');const r=record(q.data);return <Screen title="Completion / Handover" back><QueryState query={q}><StatusChip status={str(r.state??r.status)}/>{r.status==='COMPLETED'?<SectionCard title="Completed"><Body>{str(record(r.handover).notes??record(r.handover).completionNotes)}</Body><Body muted>{date(record(r.handover).submittedAt,'en','Africa/Dar_es_Salaam',true)}</Body><SecondaryButton label="Return to trips" onPress={()=>router.replace('/guide/my-trips' as Href)}/></SectionCard>:<><CheckField label="Drop-off confirmed" checked={dropped} onChange={setDropped}/><CheckField label="Vehicle returned" checked={vehicleReturned} onChange={setReturned}/><CheckField label="Incidents recorded for Operations" checked={issuesRecorded} onChange={setIssues}/><FormField label="Notes" value={notes} onChange={setNotes} multiline/><FormField label="Incident notes" value={vehicleNotes} onChange={setVehicleNotes} multiline/><PrimaryButton label="Submit handover & complete" loading={mutation.isPending} disabled={r.status!=='RETURNING'||!dropped||!vehicleReturned||!issuesRecorded||!notes} onPress={()=>{void mutation.mutateAsync({expectedVersion:r.version,notes:notes+(vehicleNotes?'\n'+vehicleNotes:''),checklist:{travelersDroppedOff:dropped,vehicleChecked:vehicleReturned,issuesAcknowledged:issuesRecorded}}).then(()=>q.refetch()).catch(()=>{});}}/></>}</QueryState>{Boolean(mutation.error)&&<InlineError error={mutation.error} retry={()=>void q.refetch()}/>}</Screen>;}
