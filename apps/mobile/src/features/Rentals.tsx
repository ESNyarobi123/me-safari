import React,{useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {useForm,Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useResource,useCommand} from '../lib/api';
import {useSession} from '../lib/session';
import {useT} from '../lib/i18n';
import {num,record,rows,str,type RecordData} from '../lib/domain';
import {AnimatedCardPressable,Body,CheckField,Chips,DateField,FormField,InlineError,MoneyText,PrimaryButton,QueryState,Screen,SecondaryButton,SectionCard,SelectField,TravelerCounter,s} from '../ui/components';
import {colors,fonts,images} from '../ui/theme';
import {navigate as nav} from '../lib/navigation';

/**
 * SAFARI AI RENTALS — the car rental and chauffeur service of Me and Adventure Safaris.
 * Public browsing is open to everyone; an enquiry requires a signed-in customer and becomes
 * a trackable custom request handled by Operations.
 */
export const RENTAL_SERVICE_MODEL='CHAUFFEUR_DRIVEN';
export function vehicleLabel(vehicle:RecordData){return [str(vehicle.brand),str(vehicle.model),str(vehicle.variant)].filter(Boolean).join(' ');}
function rateOf(vehicle:RecordData){const rate=record(vehicle.fromPrice);return {minor:str(rate.amountMinor),currency:str(rate.currency,'TZS'),type:str(rate.rateType,'DAILY')};}
function enquiryPath(extra=''){return `/customer/rentals/enquiry${extra}`;}

export function VehicleCard({vehicle,onPress,index=0}:{vehicle:RecordData;onPress:()=>void;index?:number}){
  const t=useT();
  const rate=rateOf(vehicle);
  const selfDrive=vehicle.selfDriveAvailable===true;
  return <AnimatedCardPressable index={index} accessibilityLabel={vehicleLabel(vehicle)} onPress={onPress} style={{backgroundColor:'#FFFFFF',borderRadius:22,borderWidth:1,borderColor:'#ECEAE2',overflow:'hidden',shadowColor:'#5A3A18',shadowOffset:{width:0,height:6},shadowOpacity:0.08,shadowRadius:14,elevation:3}}>
    <View style={{position:'relative',width:'100%',height:168}}>
      <Image source={images.vehicle} accessibilityLabel={vehicleLabel(vehicle)} style={{width:'100%',height:'100%'}} resizeMode="cover"/>
      <View pointerEvents="none" style={{position:'absolute',left:0,right:0,bottom:0,height:48,backgroundColor:'rgba(12,13,11,0.28)'}}/>
      <View style={{position:'absolute',top:12,left:12,backgroundColor:'rgba(12,13,11,0.72)',paddingHorizontal:12,paddingVertical:5,borderRadius:14,borderWidth:1,borderColor:'rgba(255,255,255,0.18)'}}><Text style={{fontFamily:fonts.bold,fontSize:11.5,color:'#FFFFFF',letterSpacing:0.6}}>{str(vehicle.segment)}</Text></View>
      {selfDrive&&<View style={{position:'absolute',top:12,right:12,backgroundColor:colors.teal,paddingHorizontal:10,paddingVertical:5,borderRadius:14}}><Text style={{fontFamily:fonts.bold,fontSize:11,color:'#FFFFFF'}}>{t('Self-drive on approval')}</Text></View>}
    </View>
    <View style={{padding:14,gap:8}}>
      <View>
        <Text style={{fontFamily:fonts.bold,fontSize:16.5,color:'#111827'}} numberOfLines={1}>{vehicleLabel(vehicle)}</Text>
        <Text style={{fontFamily:fonts.body,fontSize:12.5,color:'#6B7280'}} numberOfLines={1}>{str(vehicle.category)}{vehicle.modelYear?` · ${str(vehicle.modelYear)}`:''}</Text>
      </View>
      <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>
        {[`${str(vehicle.seats)} ${t('seats')}`,str(vehicle.transmission).toLowerCase(),`${str(vehicle.luggageCapacity)} ${t('bags')}`].map(chip=><View key={chip} style={{backgroundColor:colors.cream,borderRadius:10,paddingHorizontal:9,paddingVertical:4}}><Text style={{fontFamily:fonts.bold,fontSize:11,color:colors.ink}}>{chip}</Text></View>)}
      </View>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderTopColor:'#F3F1EC',paddingTop:9}}>
        <View>
          <Text style={{fontFamily:fonts.bold,fontSize:10.5,color:'#6B7280',letterSpacing:0.6}}>{t('PER DAY').toUpperCase()}</Text>
          <MoneyText minor={rate.minor} currency={rate.currency}/>
        </View>
        <View style={{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#FFF2E5',paddingHorizontal:12,paddingVertical:6,borderRadius:12}}><Text style={{fontFamily:fonts.bold,fontSize:13,color:colors.orange}}>{t('Enquire')}</Text><Ionicons name="arrow-forward" size={14} color={colors.orange}/></View>
      </View>
    </View>
  </AnimatedCardPressable>;
}

export function ServiceLineCard({service,onPress,index=0}:{service:RecordData;onPress:()=>void;index?:number}){
  const t=useT();
  const useCases=Array.isArray(service.useCases)?service.useCases:Array.isArray(record(service.localized).useCases)?record(service.localized).useCases as unknown[]:[];
  return <AnimatedCardPressable index={index} accessibilityLabel={str(service.title)} onPress={onPress} style={{backgroundColor:'#FFFFFF',borderRadius:22,borderWidth:1,borderColor:'#ECEAE2',padding:16,gap:10,shadowColor:'#5A3A18',shadowOffset:{width:0,height:5},shadowOpacity:0.06,shadowRadius:12,elevation:2}}>
    <View style={[s.row,{gap:12,alignItems:'center'}]}>
      <View style={{width:44,height:44,borderRadius:22,backgroundColor:'#FFF2E5',borderWidth:1,borderColor:'rgba(255,123,0,0.2)',justifyContent:'center',alignItems:'center'}}><Ionicons name="car-sport" size={22} color={colors.orange}/></View>
      <View style={{flex:1}}>
        <Text style={{fontFamily:fonts.bold,fontSize:16.5,color:'#111827'}}>{str(service.title)}</Text>
        <Text style={{fontFamily:fonts.body,fontSize:12.5,color:'#6B7280'}}>{str(service.tagline)}</Text>
      </View>
      <View style={{width:30,height:30,borderRadius:15,backgroundColor:'#F7F5F0',justifyContent:'center',alignItems:'center'}}><Ionicons name="chevron-forward" size={16} color="#111827"/></View>
    </View>
    <Text style={{fontFamily:fonts.body,fontSize:13.5,color:'#374151',lineHeight:20}}>{str(service.description)}</Text>
    {useCases.length>0&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6}}>{useCases.map((useCase,i)=><View key={i} style={{backgroundColor:colors.tealLight,borderRadius:12,paddingHorizontal:10,paddingVertical:5}}><Text style={{fontFamily:fonts.bold,fontSize:11,color:colors.tealDark}}>{str(useCase)}</Text></View>)}</ScrollView>}
    <Text style={{fontFamily:fonts.bold,fontSize:12.5,color:colors.orange}}>{t('View this service')} →</Text>
  </AnimatedCardPressable>;
}

export const DEMO_RENTAL_SERVICES:RecordData[]=[
  {id:'srv-1',slug:'safari-4x4-expeditions',title:'4x4 Safari Land Cruisers',tagline:'Pop-up roof · Fridge · Unlimited game drives',description:'Extended-wheelbase Toyota Land Cruisers with professional naturalist chauffeurs across Serengeti, Ngorongoro & Tarangire.',useCases:['Big 5 Safaris','Photographic Tours','Crater Descent']},
  {id:'srv-2',slug:'vip-airport-executive',title:'VIP Airport & Executive Chauffeur',tagline:'Kilimanjaro (JRO) · Arusha · Dar es Salaam · Zanzibar',description:'Meet-and-greet airport transfers and executive city transport with flight tracking and bottled refreshments.',useCases:['Airport Meet & Greet','Diplomatic & VIP','Corporate Hire']},
  {id:'srv-3',slug:'group-coastal-shuttle',title:'Luxury Group & Coastal Transfers',tagline:'Private minibuses & coasters for families & retreats',description:'Air-conditioned group fleet with generous luggage bays for lodges, conferences and coastal transfers.',useCases:['Family Groups','Kilimanjaro Teams','Lodge Transfers']}
];
export const DEMO_RENTAL_VEHICLES:RecordData[]=[
  {id:'veh-1',slug:'land-cruiser-safari-extended',brand:'Toyota',model:'Land Cruiser 79',variant:'Extended Safari 4x4',segment:'SUV',category:'Pop-Up Roof Safari Spec',modelYear:2025,seats:7,transmission:'MANUAL',luggageCapacity:8,selfDriveAvailable:false,fromPrice:{amountMinor:'45000000',currency:'TZS',rateType:'DAILY'}},
  {id:'veh-2',slug:'land-cruiser-prado-txl',brand:'Toyota',model:'Land Cruiser Prado',variant:'TX-L Executive',segment:'SUV',category:'VIP Chauffeur & Transfer',modelYear:2025,seats:5,transmission:'AUTOMATIC',luggageCapacity:5,selfDriveAvailable:true,fromPrice:{amountMinor:'32000000',currency:'TZS',rateType:'DAILY'}},
  {id:'veh-3',slug:'alphard-executive-lounge',brand:'Toyota',model:'Alphard',variant:'Executive Lounge',segment:'VAN',category:'Luxury VIP Transfer',modelYear:2024,seats:6,transmission:'AUTOMATIC',luggageCapacity:6,selfDriveAvailable:false,fromPrice:{amountMinor:'28000000',currency:'TZS',rateType:'DAILY'}}
];

export function RentalsHome(){
  const t=useT();
  const overview=useResource<RecordData>('/public/rentals/overview',{public:true});
  const vehicles=useResource<unknown>('/public/rentals/vehicles?limit=50&sort=price_asc',{public:true});
  const data=record(overview.data);
  const policy=record(record(data.policy).policy);
  const fleet=record(data.fleet);
  const services=rows(data.services).length>0?rows(data.services):DEMO_RENTAL_SERVICES;
  const featured=rows(data.featured).length>0?rows(data.featured):DEMO_RENTAL_VEHICLES;
  const allVehicles=rows(vehicles.data).length>0?rows(vehicles.data):DEMO_RENTAL_VEHICLES;
  const cheapest=allVehicles.find(v=>str(record(v.fromPrice).amountMinor));
  return <Screen hideHeader contentStyle={{paddingHorizontal:16,paddingTop:4,gap:14,paddingBottom:120}} refresh={()=>{void overview.refetch();void vehicles.refetch();}} refreshing={overview.isRefetching} updatedAt={overview.dataUpdatedAt} bottomNav activeTab="rentals">
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:2}}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Back')} onPress={()=>nav('/discover')} style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{width:38,height:38,borderRadius:19,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#ECEEEF',justifyContent:'center',alignItems:'center'}}><Ionicons name="arrow-back" size={19} color="#111827"/></View><Text style={{fontFamily:fonts.bold,fontSize:13,color:colors.orange,letterSpacing:1.2,textTransform:'uppercase'}}>M&A SAFARIS</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Rental policy')} onPress={()=>nav('/rentals/policy')} style={{width:40,height:40,borderRadius:20,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#ECEEEF',justifyContent:'center',alignItems:'center'}}><Ionicons name="document-text-outline" size={19} color="#111827"/></Pressable>
    </View>
    <View style={{position:'relative',backgroundColor:colors.black,borderRadius:26,overflow:'hidden',padding:20,gap:10,borderWidth:1,borderColor:'rgba(255,255,255,0.14)',shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.16,shadowRadius:16,elevation:5}}>
      <Image source={images.vehicle} style={[{position:'absolute',top:0,left:0,right:0,bottom:0},{opacity:0.42}]} resizeMode="cover"/>
      <View pointerEvents="none" style={[{position:'absolute',top:0,left:0,right:0,bottom:0},{backgroundColor:'rgba(12,13,11,0.42)'}]}/>
      <View style={{flexDirection:'row',alignItems:'center',gap:6, alignSelf:'flex-start',backgroundColor:'rgba(255,123,0,0.22)',borderWidth:1,borderColor:'rgba(255,123,0,0.45)',paddingHorizontal:10,paddingVertical:4,borderRadius:12}}>
        <Ionicons name="car-sport" size={13} color="#FFB56B"/>
        <Text style={{fontFamily:fonts.bold,fontSize:11,color:'#FFB56B',letterSpacing:1.4,textTransform:'uppercase'}}>{t('Car rental & chauffeur services')}</Text>
      </View>
      <Text style={{fontFamily:fonts.editorial,fontSize:28,lineHeight:34,color:'#FFFFFF'}}>{t('Safari AI Rentals')}</Text>
      <Text style={{fontFamily:fonts.body,fontSize:14,lineHeight:21,color:'rgba(255,255,255,0.88)'}}>{t('Seamless rides, timeless memories.')}</Text>
      <View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginTop:2}}>
        <View style={{backgroundColor:'rgba(255,255,255,0.16)',borderRadius:12,paddingHorizontal:10,paddingVertical:6}}><Text style={{fontFamily:fonts.bold,fontSize:11.5,color:'#FFFFFF'}}>{num(fleet.totalVehicles)||12} {t('vehicles')}</Text></View>
        <View style={{backgroundColor:'rgba(255,255,255,0.16)',borderRadius:12,paddingHorizontal:10,paddingVertical:6}}><Text style={{fontFamily:fonts.bold,fontSize:11.5,color:'#FFFFFF'}}>{t('Chauffeur-driven')}</Text></View>
        <View style={{backgroundColor:'rgba(255,255,255,0.16)',borderRadius:12,paddingHorizontal:10,paddingVertical:6}}><Text style={{fontFamily:fonts.bold,fontSize:11.5,color:'#FFFFFF'}}>{t('Airport transfers')}</Text></View>
      </View>
      <View style={{flexDirection:'row',gap:10,marginTop:6}}>
        <View style={{flex:1}}><PrimaryButton label="Browse fleet" onPress={()=>nav('/rentals/fleet')}/></View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Our services')} onPress={()=>nav('/rentals/services')} style={{flex:1,minHeight:52,borderRadius:16,borderWidth:1,borderColor:'rgba(255,255,255,0.35)',backgroundColor:'rgba(255,255,255,0.14)',justifyContent:'center',alignItems:'center',paddingHorizontal:14}}>
          <Text style={{fontFamily:fonts.bold,fontSize:15,color:'#FFFFFF'}}>{t('Our services')}</Text>
        </Pressable>
      </View>
    </View>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end',marginTop:2}}>
      <Text style={{fontFamily:fonts.bold,fontSize:20,color:'#111827'}}>{t('Featured vehicles')}</Text>
      <Pressable accessibilityRole="button" onPress={()=>nav('/rentals/fleet')} style={{flexDirection:'row',alignItems:'center',gap:2}}><Text style={{fontFamily:fonts.bold,fontSize:13.5,color:colors.orange}}>{t('See full fleet')}</Text><Ionicons name="chevron-forward" size={14} color={colors.orange}/></Pressable>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12,paddingRight:8}}>{featured.map((vehicle,i)=><View key={str(vehicle.id,String(i))} style={{width:280}}><VehicleCard index={i} vehicle={vehicle} onPress={()=>nav(`/rentals/vehicles/${str(vehicle.slug)}`)}/></View>)}</ScrollView>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end',marginTop:2}}>
      <Text style={{fontFamily:fonts.bold,fontSize:20,color:'#111827'}}>{t('Signature services')}</Text>
      <Pressable accessibilityRole="button" onPress={()=>nav('/rentals/services')} style={{flexDirection:'row',alignItems:'center',gap:2}}><Text style={{fontFamily:fonts.bold,fontSize:13.5,color:colors.orange}}>{t('View all')}</Text><Ionicons name="chevron-forward" size={14} color={colors.orange}/></Pressable>
    </View>
    {services.map((service,i)=><ServiceLineCard key={str(service.id,String(i))} index={i} service={service} onPress={()=>nav(`/rentals/fleet?service=${str(service.slug)}`)}/>)}
    {cheapest&&<SectionCard title="Fleet from"><View style={[s.row,{justifyContent:'space-between',alignItems:'center'}]}><View><Text style={{fontFamily:fonts.bold,fontSize:15,color:'#111827'}}>{vehicleLabel(cheapest)}</Text><Body muted>{t('Entry rate, per day')}</Body></View><MoneyText minor={rateOf(cheapest).minor} currency={rateOf(cheapest).currency} large/></View><SecondaryButton label="See the full fleet" onPress={()=>nav('/rentals/fleet')}/></SectionCard>}
    {str(policy.summary)&&<SectionCard title="Good to know"><Body>{str(policy.summary)}</Body><Body muted>{str(policy.longTermDiscount)}</Body><SecondaryButton label="Rental policy" onPress={()=>nav('/rentals/policy')}/></SectionCard>}
    <SectionCard title="Talk to Safari AI Rentals" dark><Body style={{color:'#FFFFFF'}}>{t('Tell us your dates, route and group size and Operations prepares a written quotation.')}</Body><PrimaryButton label="Request a vehicle" onPress={()=>nav('/rentals/fleet')}/></SectionCard>
  </Screen>;
}

export function RentalServices(){
  const t=useT();
  const services=useResource<unknown>('/public/rentals/services',{public:true});
  const policy=useResource<RecordData>('/public/rentals/policy',{public:true});
  const terms=record(record(policy.data).policy);
  return <Screen headerCenter="Safari AI Rentals services" back refresh={()=>void services.refetch()} updatedAt={services.dataUpdatedAt}>
    <Body muted>{t('Five signature service lines, all chauffeur-driven by default.')}</Body>
    <QueryState query={services}>{rows(services.data).map((service,i)=><ServiceLineCard key={str(service.id,String(i))} service={service} onPress={()=>nav(`/rentals/fleet?service=${str(service.slug)}`)}/>)}</QueryState>
    {str(terms.serviceModel)&&<SectionCard title="How we operate"><Body>{str(terms.summary)}</Body><Body>{str(terms.selfDrive)}</Body><SecondaryButton label="Read the full policy" onPress={()=>nav('/rentals/policy')}/></SectionCard>}
    {Boolean(services.error)&&<InlineError error={services.error} retry={()=>void services.refetch()}/>}
  </Screen>;
}

const SEGMENTS=[{value:'',label:'All'},{value:'SUV',label:'SUV'},{value:'CROSSOVER',label:'Crossover'},{value:'SEDAN',label:'Sedan'},{value:'VAN',label:'Van'},{value:'MINIBUS',label:'Minibus'},{value:'VINTAGE',label:'Vintage'},{value:'PICKUP',label:'Pickup'}];
const SORTS=[{value:'price_asc',label:'Price low to high'},{value:'price_desc',label:'Price high to low'}];

export function RentalFleet(){
  const t=useT();
  const params=useLocalSearchParams<{service?:string;segment?:string}>();
  const [search,setSearch]=useState('');
  const [segment,setSegment]=useState(params.segment??'');
  const [service,setService]=useState(params.service??'');
  const [sort,setSort]=useState('price_asc');
  const [chauffeurOnly,setChauffeurOnly]=useState(false);
  const query=`/public/rentals/vehicles?limit=50&sort=${sort}&search=${encodeURIComponent(search)}&segment=${encodeURIComponent(segment)}&service=${encodeURIComponent(service)}${chauffeurOnly?'&chauffeur=true':''}`;
  const vehicles=useResource<unknown>(query,{public:true});
  const services=useResource<unknown>('/public/rentals/services',{public:true});
  const list=rows(vehicles.data);
  const serviceOptions=[{value:'',label:'All services'},...rows(services.data).map(x=>({value:str(x.slug),label:str(x.title)}))];
  return <Screen headerCenter="Fleet" back refresh={()=>void vehicles.refetch()} refreshing={vehicles.isRefetching} updatedAt={vehicles.dataUpdatedAt} contentStyle={{paddingHorizontal:16,paddingTop:8,gap:12}}>
    <View style={{backgroundColor:'#FFFFFF',borderRadius:22,borderWidth:1,borderColor:'#F0F1F3',padding:12,gap:10,shadowColor:'#000',shadowOffset:{width:0,height:3},shadowOpacity:0.04,shadowRadius:10,elevation:2}}>
      <View style={{flexDirection:'row',alignItems:'center',backgroundColor:'#F8F9FA',borderRadius:16,paddingHorizontal:14,height:48}}>
        <Ionicons name="search-outline" size={19} color="#6B7280"/>
        <TextInput accessibilityLabel={t('Search make or model')} value={search} onChangeText={setSearch} placeholder={t('Search make or model')} placeholderTextColor="#9CA3AF" style={{flex:1,fontFamily:fonts.body,fontSize:14,color:'#111827',marginHorizontal:8,paddingVertical:6}}/>
        {search.length>0&&<Pressable accessibilityLabel={t('Clear search')} onPress={()=>setSearch('')} style={{padding:4}}><Ionicons name="close-circle" size={18} color="#9CA3AF"/></Pressable>}
      </View>
      <Chips items={SEGMENTS} value={segment} onChange={setSegment}/>
      <SelectField label="Service line" value={service} onChange={setService} options={serviceOptions}/>
      <SelectField label="Sort" value={sort} onChange={setSort} options={SORTS}/>
      <CheckField label="Chauffeur-driven only" checked={chauffeurOnly} onChange={setChauffeurOnly}/>
    </View>
    <Text style={{fontFamily:fonts.bold,fontSize:12,color:'#6B7280',letterSpacing:1.2,textTransform:'uppercase'}}>{list.length} {list.length===1?t('vehicle'):t('vehicles')} · {t('rates per day in TZS')}</Text>
    <QueryState query={vehicles}>
      {list.map((vehicle,i)=><VehicleCard key={str(vehicle.id,String(i))} vehicle={vehicle} onPress={()=>router.push(`/rentals/vehicles/${str(vehicle.slug)}`)}/>)}
      {list.length===0&&<SectionCard><Text style={{fontFamily:fonts.bold,fontSize:17,color:'#111827'}}>{t('No vehicles match those filters')}</Text><Body muted>{t('Clear the filters, or send us your requirements and we will source the right vehicle.')}</Body><SecondaryButton label="Clear filters" onPress={()=>{setSearch('');setSegment('');setService('');setChauffeurOnly(false);}}/></SectionCard>}
    </QueryState>
    {Boolean(vehicles.error)&&<InlineError error={vehicles.error} retry={()=>void vehicles.refetch()}/>}
  </Screen>;
}

export function RentalVehicleDetail(){
  const t=useT();
  const {slug}=useLocalSearchParams<{slug:string}>();
  const user=useSession(x=>x.user);
  const vehicle=useResource<RecordData>(`/public/rentals/vehicles/${slug}`,{public:true});
  const data=record(vehicle.data);
  const rate=rateOf(data);
  const features=Array.isArray(data.features)?data.features.map(x=>str(x)).filter(Boolean):[];
  const services=Array.isArray(data.serviceSlugs)?data.serviceSlugs.map(x=>str(x)):[];
  const rates=rows(data.rates);
  const enquiryUrl=enquiryPath(`?vehicleId=${str(data.slug||slug)}`);
  return <Screen headerCenter={vehicleLabel(data)||'Vehicle'} back refresh={()=>void vehicle.refetch()} updatedAt={vehicle.dataUpdatedAt} sticky={str(data.id)?<View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:16}}><View><Text style={{fontFamily:fonts.bold,fontSize:10.5,color:'#6B7280',letterSpacing:0.8}}>{t('PER DAY').toUpperCase()}</Text><MoneyText minor={rate.minor} currency={rate.currency} large/></View><View style={{flex:1}}><PrimaryButton label="Request this vehicle" onPress={()=>nav(user?enquiryUrl:`/login?returnTo=${encodeURIComponent(enquiryUrl)}`)}/></View></View>:undefined}>
    <QueryState query={vehicle}>
      <View style={{position:'relative',width:'100%',height:250,borderRadius:24,overflow:'hidden',backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line}}>
        <Image source={data.photoUrl?{uri:str(data.photoUrl)}:images.vehicle} accessibilityLabel={vehicleLabel(data)} style={{width:'100%',height:'100%'}} resizeMode="cover"/>
        <View style={{position:'absolute',top:14,left:14,backgroundColor:'rgba(12,13,11,0.65)',paddingHorizontal:12,paddingVertical:5,borderRadius:14}}><Text style={{fontFamily:fonts.bold,fontSize:11.5,color:'#FFFFFF'}}>{str(data.segment)}</Text></View>
        <View style={{position:'absolute',bottom:14,left:14,backgroundColor:'rgba(255,255,255,0.94)',paddingHorizontal:12,paddingVertical:6,borderRadius:14}}><Text style={{fontFamily:fonts.bold,fontSize:11.5,color:colors.tealDark}}>{t('Chauffeur-driven')}</Text></View>
      </View>
      <View style={{gap:6}}>
        <Text style={{fontFamily:fonts.bold,fontSize:26,lineHeight:32,color:'#111827'}}>{vehicleLabel(data)}</Text>
        <View style={[s.row,{gap:6}]}><Ionicons name="pricetag-outline" size={15} color={colors.orange}/><Text style={{fontFamily:fonts.bold,fontSize:14,color:colors.orange}}>{str(data.category)}{data.modelYear?` · ${str(data.modelYear)}`:''}</Text></View>
        <Body muted>{str(data.description)}</Body>
      </View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
        {[[t('Seats'),str(data.seats)],[t('Doors'),str(data.doors)],[t('Bags'),str(data.luggageCapacity)],[t('Transmission'),str(data.transmission)],[t('Fuel'),str(data.fuel)]].map(([label,value])=><View key={label} style={{width:'31%',backgroundColor:'#FFFFFF',borderRadius:16,borderWidth:1,borderColor:'#F0F1F3',padding:12,gap:2}}><Text style={{fontFamily:fonts.bold,fontSize:10.5,color:'#6B7280',letterSpacing:0.7,textTransform:'uppercase'}}>{label}</Text><Text style={{fontFamily:fonts.bold,fontSize:15,color:'#111827'}}>{value}</Text></View>)}
      </View>
      <SectionCard title="Published rates">{rates.map((row,i)=><View key={str(row.id,String(i))} style={[s.row,{justifyContent:'space-between',alignItems:'center'}]}><View><Text style={{fontFamily:fonts.bold,fontSize:15,color:'#111827'}}>{str(row.rateType)}</Text><Body muted>{str(row.note,'')}{num(row.minimumDays)>1?` · ${t('minimum')} ${num(row.minimumDays)} ${t('days')}`:''}</Body></View><MoneyText minor={row.amountMinor} currency={str(row.currency,'TZS')}/></View>)}{rates.length===0&&<Body muted>{t('Ask Operations for the current rate.')}</Body>}</SectionCard>
      {features.length>0&&<SectionCard title="What is included">{features.map((feature,i)=><Body key={i}>• {feature}</Body>)}</SectionCard>}
      {services.length>0&&<SectionCard title="Available for">{services.map(serviceSlug=><View key={serviceSlug} style={{backgroundColor:colors.cream,borderRadius:12,paddingHorizontal:12,paddingVertical:8}}><Text style={{fontFamily:fonts.bold,fontSize:13,color:colors.ink}}>{serviceSlug.replaceAll('safari-ai-','').replace(/^./,x=>x.toUpperCase())}</Text></View>)}</SectionCard>}
      <SectionCard title={data.selfDriveAvailable===true?'Chauffeur or self-drive':'Chauffeur-driven'} ><Body>{data.selfDriveAvailable===true?t('Self-drive is available for this vehicle on written approval, with a valid licence and satisfied insurance requirements.'):t('This vehicle is provided with a Safari AI approved driver.' )}</Body><SecondaryButton label="Rental policy" onPress={()=>nav('/rentals/policy')}/></SectionCard>
      <SectionCard title="Need a different vehicle?" dark><Body style={{color:'#FFFFFF'}}>{t('Tell us the route and group size and we will match the right vehicle.')}</Body><PrimaryButton label="Browse the fleet" onPress={()=>nav('/rentals/fleet')}/></SectionCard>
    </QueryState>
    {Boolean(vehicle.error)&&<InlineError error={vehicle.error} retry={()=>void vehicle.refetch()}/>}
  </Screen>;
}

export function RentalPolicyScreen(){
  const t=useT();
  const policy=useResource<RecordData>('/public/rentals/policy',{public:true});
  const terms=record(record(policy.data).policy);
  const sections:[string,string][]=[
    ['Service model',str(terms.serviceModel)==='CHAUFFEUR_DRIVEN'?'Chauffeur-driven':str(terms.serviceModel)],
    ['Summary',str(terms.summary)],['Self-drive',str(terms.selfDrive)],['Length of hire',str(terms.lengthOfHire)],
    ['Long-term hire',str(terms.longTermDiscount)],['Security deposit',str(terms.deposit)],['Fuel',str(terms.fuel)],
    ['Route approval',str(terms.route)],['Cancellation & rescheduling',str(terms.cancellation)],['Insurance',str(terms.insurance)],
  ].filter(([,value])=>Boolean(value)) as [string,string][];
  const prohibited=Array.isArray(terms.prohibitedUse)?terms.prohibitedUse.map(x=>str(x)).filter(Boolean):[];
  const contact=record(terms.contact);
  return <Screen headerCenter="Rental policy" back refresh={()=>void policy.refetch()} updatedAt={policy.dataUpdatedAt}>
    <SectionCard title="Safari AI Rentals terms"><Body muted>{t('Version')} {num(record(policy.data).version)}{terms.effectiveFrom?` · ${t('effective from')} ${str(terms.effectiveFrom)}`:''}</Body></SectionCard>
    <QueryState query={policy}>
      {sections.map(([label,value])=><SectionCard key={label} title={label}><Body>{value}</Body></SectionCard>)}
      {prohibited.length>0&&<SectionCard title="Not permitted">{prohibited.map((item,i)=><Body key={i}>• {item}</Body>)}</SectionCard>}
      {rows(contact.whatsapp).length>0&&<SectionCard title="Contact">{rows(contact.whatsapp).map((number,i)=><Body key={i}>WhatsApp {str(number)}</Body>)}{rows(contact.phone).map((number,i)=><Body key={`p${i}`}>{t('Phone')} {str(number)}</Body>)}{str(contact.email)&&<Body>{str(contact.email)}</Body>}</SectionCard>}
      <SectionCard title="Request a vehicle" dark><Body style={{color:'#FFFFFF'}}>{t('Send your dates and route and Operations issues a written quotation before any payment.')}</Body><PrimaryButton label="Start an enquiry" onPress={()=>nav('/rentals/fleet')}/></SectionCard>
    </QueryState>
    {Boolean(policy.error)&&<InlineError error={policy.error} retry={()=>void policy.refetch()}/>}
  </Screen>;
}

const enquirySchema=z.object({
  vehicleId:z.string().max(100).optional(),serviceSlug:z.string().optional(),
  pickupLocation:z.string().min(2).max(2000),dropOffLocation:z.string().max(2000),
  startDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Use YYYY-MM-DD.'),days:z.string().regex(/^\d{1,3}$/,'Enter the number of days.'),
  intendedRoute:z.string().max(2000),notes:z.string().max(2000),
  contactName:z.string().min(2).max(120),contactPhone:z.string().min(5).max(40),contactEmail:z.string().email().max(254).or(z.literal('')),
});

export function RentalEnquiry(){
  const t=useT();
  const params=useLocalSearchParams<{vehicleId?:string;service?:string}>();
  const user=useSession(x=>x.user);
  const vehicles=useResource<unknown>('/public/rentals/vehicles?limit=50',{public:true});
  const services=useResource<unknown>('/public/rentals/services',{public:true});
  const [vehicleId,setVehicleId]=useState(params.vehicleId??'');
  const [serviceSlug,setServiceSlug]=useState(params.service??'safari-ai-transfers');
  const [passengers,setPassengers]=useState(2);
  const [withChauffeur,setWithChauffeur]=useState(true);
  const [submitted,setSubmitted]=useState<RecordData|null>(null);
  const mutation=useCommand('/rentals/enquiries');
  const form=useForm({resolver:zodResolver(enquirySchema),defaultValues:{vehicleId:params.vehicleId??'',serviceSlug:params.service??'safari-ai-transfers',pickupLocation:'',dropOffLocation:'',startDate:'',days:'3',intendedRoute:'',notes:'',contactName:user?.name??'',contactPhone:user?.phone??'',contactEmail:user?.email??''}});
  const selected=rows(vehicles.data).find(v=>str(v.slug)===vehicleId||str(v.id)===vehicleId);
  const days=num(form.watch('days'));
  const dailyMinor=num(record(selected?.fromPrice).amountMinor);
  const estimateMinor=dailyMinor>0&&days>0?String(dailyMinor*days):'';
  const currency=str(record(selected?.fromPrice).currency,'TZS');
  const submit=form.handleSubmit(async values=>{
    try{
      const result=await mutation.mutateAsync({...(vehicleId?{vehicleId}:{}) ,serviceSlug:values.serviceSlug||undefined,pickupLocation:values.pickupLocation,dropOffLocation:values.dropOffLocation||undefined,startDate:values.startDate,days:Number(values.days),passengers,withChauffeur,intendedRoute:values.intendedRoute||undefined,notes:values.notes||undefined,contactName:values.contactName,contactPhone:values.contactPhone,contactEmail:values.contactEmail||undefined});
      setSubmitted(record(result));
    }catch{}
  });
  if(submitted)return <Screen headerCenter="Enquiry received" back>
    <SectionCard title="Safari AI Rentals enquiry submitted"><Body>{t('Operations reviews availability and sends a written quotation. No payment is taken from this screen.')}</Body><Body muted>{t('Request reference')}: {str(submitted.id)}</Body>{str(submitted.estimatedTotalMinor)&&<View style={[s.row,{justifyContent:'space-between'}]}><Body>{t('Indicative total')} · {num(submitted.days)} {t('days')}</Body><MoneyText minor={submitted.estimatedTotalMinor} currency={currency}/></View>}{submitted.longTermDiscountEligible===true&&<Body style={{color:colors.tealDark}}>{t('This booking is over 10 days, so a long-term rate may be available on approval.')}</Body>}</SectionCard>
    <PrimaryButton label="Track this request" onPress={()=>nav(`/customer/requests/${str(submitted.id)}`)}/>
    <SecondaryButton label="Back to Safari AI Rentals" onPress={()=>nav('/rentals')}/>
  </Screen>;
  return <Screen headerCenter="Request a vehicle" back>
    <Body muted>{t('Tell us where, when and how many travellers. Operations confirms the vehicle and rate in writing.')}</Body>
    <SectionCard title="Vehicle"><SelectField label="Vehicle" value={vehicleId} onChange={v=>{setVehicleId(v);form.setValue('vehicleId',v);}} options={[{value:'',label:'Let Safari AI Rentals recommend'},...rows(vehicles.data).map(v=>({value:str(v.slug),label:`${vehicleLabel(v)} · ${str(v.segment)}`}))]}/><SelectField label="Service line" value={serviceSlug} onChange={v=>{setServiceSlug(v);form.setValue('serviceSlug',v);}} options={rows(services.data).map(x=>({value:str(x.slug),label:str(x.title)}))}/>{selected&&<View style={[s.row,{justifyContent:'space-between'}]}><Body muted>{t('Daily rate')}</Body><MoneyText minor={record(selected.fromPrice).amountMinor} currency={currency}/></View>}</SectionCard>
    <SectionCard><TravelerCounter label="Passengers" value={passengers} min={1} max={80} onChange={setPassengers}/><CheckField label="Chauffeur-driven" checked={withChauffeur} onChange={setWithChauffeur}/></SectionCard>
    {(['days','pickupLocation','dropOffLocation','intendedRoute','notes','contactName','contactPhone','contactEmail'] as const).map(name=><Controller key={name} name={name} control={form.control} render={({field,fieldState})=><FormField label={{days:'Number of days',pickupLocation:'Pick-up location',dropOffLocation:'Drop-off location',intendedRoute:'Intended route',notes:'Notes',contactName:'Contact name',contactPhone:'Contact phone',contactEmail:'Contact email'}[name]} value={field.value} onChange={field.onChange} error={fieldState.error?.message} multiline={name==='intendedRoute'||name==='notes'} keyboard={name==='contactPhone'?'phone-pad':name==='contactEmail'?'email-address':name==='days'?'numeric':'default'} placeholder={name==='pickupLocation'?'Kilimanjaro International Airport':undefined}/>}/>)}

    <Controller name="startDate" control={form.control} render={({field,fieldState})=><DateField label="Pick-up date" value={field.value} onChange={field.onChange} error={fieldState.error?.message}/>}/>
    {estimateMinor&&<SectionCard title="Indicative estimate"><View style={[s.row,{justifyContent:'space-between'}]}><Body>{num(days)} {t('days')} × <MoneyText minor={dailyMinor} currency={currency}/></Body></View><MoneyText minor={estimateMinor} currency={currency} large/><Body muted>{t('Indicative only. The written quotation from Operations is the binding rate.')}</Body>{days>10&&<Body style={{color:colors.tealDark}}>{t('Over 10 days — ask about the long-term rate.')}</Body>}</SectionCard>}
    {Boolean(mutation.error)&&<InlineError error={mutation.error}/>}
    <PrimaryButton label="Submit enquiry" onPress={()=>void submit()} loading={mutation.isPending} disabled={!user?.emailVerified}/>
    {!user?.emailVerified&&<SectionCard title="Verify email"><Body>{t('Email verification is required before submitting a request.')}</Body><SecondaryButton label="Verify email" onPress={()=>nav('/verify-email')}/></SectionCard>}
  </Screen>;
}
