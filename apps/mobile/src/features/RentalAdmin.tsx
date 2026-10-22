import React,{useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {router,useLocalSearchParams,type Href} from 'expo-router';
import {command,useResource} from '../lib/api';
import {queryClient} from '../lib/session';
import {num,record,rows,str,type RecordData} from '../lib/domain';
import {Body,Chips,EmptyState,FormField,InlineError,MoneyText,PrimaryButton,QueryState,Screen,SecondaryButton,SectionCard,SelectField,StatusChip,s} from '../ui/components';
import {EntityForm,type FieldSpec} from './Forms';
import {vehicleLabel} from './Rentals';
import {navigate as nav} from '../lib/navigation';

/**
 * ADMIN — Safari AI Rentals back office: fleet, service lines and the published rental policy.
 * Every mutation is versioned and audited by the API; these screens simply surface it.
 */
const SEGMENTS=['SUV','CROSSOVER','SEDAN','MINIBUS','VAN','VINTAGE','PICKUP'].map(x=>({value:x,label:x}));
const STATUSES=['AVAILABLE','ON_REQUEST','MAINTENANCE','RETIRED'].map(x=>({value:x,label:x.replace('_',' ')}));

export function RentalFleetAdmin(){
  const [status,setStatus]=useState('');
  const [search,setSearch]=useState('');
  const q=useResource<unknown>(`/admin/rentals/vehicles?limit=50&status=${status}&search=${encodeURIComponent(search)}`);
  const [selected,setSelected]=useState('');
  const [reason,setReason]=useState('');
  const [error,setError]=useState<unknown>(null);
  const list=rows(q.data);
  const current=list.find(v=>str(v.id)===selected);
  return <Screen title="Safari AI Rentals fleet" back refresh={()=>void q.refetch()} refreshing={q.isRefetching} updatedAt={q.dataUpdatedAt}>
    <Body muted>Car rental and chauffeur inventory, with the published daily rate for each vehicle.</Body>
    <View style={s.row}>
      <SecondaryButton label="Service lines" onPress={()=>nav('/admin/rentals/services')}/>
      <SecondaryButton label="Rental policy" onPress={()=>nav('/admin/rentals/policy')}/>
    </View>
    <PrimaryButton label="Add vehicle" onPress={()=>nav('/admin/rentals/new')}/>
    <FormField label="Search" value={search} onChange={setSearch}/>
    <Chips value={status} onChange={setStatus} items={[{value:'',label:'All'},...STATUSES]}/>
    <QueryState query={q}>
      {list.map(vehicle=><SectionCard key={str(vehicle.id)} title={vehicleLabel(vehicle)}>
        <View style={[s.row,{justifyContent:'space-between'}]}><StatusChip status={str(vehicle.status)}/><Text style={s.label}>{str(vehicle.segment)} · {str(vehicle.seats)} seats</Text></View>
        <Body muted>{str(vehicle.slug)} · {str(vehicle.category)}{vehicle.selfDriveAvailable===true?' · self-drive on approval':''}</Body>
        <View style={[s.row,{justifyContent:'space-between'}]}><Body>Published daily rate</Body><MoneyText minor={record(vehicle.fromPrice).amountMinor} currency={str(record(vehicle.fromPrice).currency,'TZS')}/></View>
        <SecondaryButton label="Edit" onPress={()=>nav(`/admin/rentals/${str(vehicle.id)}`)}/>
        {str(vehicle.status)!=='RETIRED'&&<SecondaryButton label={selected===str(vehicle.id)?'Cancel retire':'Retire vehicle'} onPress={()=>setSelected(selected===str(vehicle.id)?'':str(vehicle.id))}/>}
      </SectionCard>)}
      {list.length===0&&<EmptyState title="No rental vehicles" message="Add the first vehicle to publish Safari AI Rentals rates."/>}
    </QueryState>
    {current&&<SectionCard title={`Retire ${vehicleLabel(current)}`}><Body muted>Retiring keeps the history and removes the vehicle from the public fleet.</Body><FormField label="Reason" value={reason} onChange={setReason} multiline/><PrimaryButton label="Confirm retire" disabled={reason.trim().length<10} onPress={()=>{void command(`/admin/rentals/vehicles/${str(current.id)}/retire`,{expectedVersion:num(current.version),reason}).then(()=>{setReason('');setSelected('');void q.refetch();}).catch(setError);}}/></SectionCard>}
    {Boolean(error)&&<InlineError error={error}/>}
  </Screen>;
}

const vehicleFields:FieldSpec[]=[
  {key:'slug',label:'Slug',required:true},{key:'brand',label:'Brand',required:true},{key:'model',label:'Model',required:true},{key:'variant',label:'Variant'},
  {key:'modelYear',label:'Model year',kind:'number'},{key:'category',label:'Category',required:true},
  {key:'segment',label:'Body type',kind:'select',required:true,options:SEGMENTS,default:'SUV'},
  {key:'seats',label:'Seats',kind:'number',required:true,default:'5'},{key:'doors',label:'Doors',kind:'number',default:'4'},
  {key:'luggageCapacity',label:'Luggage capacity',kind:'number',default:'3'},{key:'transmission',label:'Transmission',kind:'select',default:'AUTOMATIC',options:[{value:'AUTOMATIC',label:'Automatic'},{value:'MANUAL',label:'Manual'}]},
  {key:'fuel',label:'Fuel',kind:'select',default:'DIESEL',options:['PETROL','DIESEL','HYBRID','ELECTRIC'].map(x=>({value:x,label:x}))},
  {key:'chauffeurDriven',label:'Chauffeur-driven',kind:'boolean',default:'true'},{key:'selfDriveAvailable',label:'Self-drive on written approval',kind:'boolean',default:'false'},
  {key:'serviceSlugs',label:'Service lines (comma separated)',kind:'csv',default:'safari-ai-transfers'},
  {key:'status',label:'Status',kind:'select',default:'AVAILABLE',options:STATUSES},
  {key:'sortOrder',label:'Sort order',kind:'number',default:'0'},{key:'photo',label:'Photo URL'},{key:'description',label:'Description',kind:'paragraph'},
  {key:'rateType',label:'Rate type',kind:'select',default:'DAILY',options:['DAILY','WEEKLY','MONTHLY'].map(x=>({value:x,label:x}))},
  {key:'rateCurrency',label:'Rate currency',kind:'select',default:'TZS',options:['TZS','USD','EUR','GBP'].map(x=>({value:x,label:x}))},
  {key:'rateAmountMinor',label:'Rate (minor units)',kind:'number'},{key:'rateMinimumDays',label:'Minimum days',kind:'number',default:'1'},{key:'rateNote',label:'Rate note'},
];
export function RentalVehicleEditor({fresh=false}:{fresh?:boolean}){
  const {id}=useLocalSearchParams<{id:string}>();
  return <EntityForm title={fresh?'Add rental vehicle':'Rental vehicle'} readPath={fresh?undefined:`/admin/rentals/vehicles/${id}`} writePath={fresh?'/admin/rentals/vehicles':`/admin/rentals/vehicles/${id}`} method={fresh?'POST':'PATCH'} fields={vehicleFields}
    transform={body=>{const {rateType,rateCurrency,rateAmountMinor,rateMinimumDays,rateNote,status,...rest}=body as RecordData;const amount=str(rateAmountMinor);const rate=amount&&/^\d+$/.test(amount)?{rateType:str(rateType,'DAILY'),currency:str(rateCurrency,'TZS'),amountMinor:amount,minimumDays:num(rateMinimumDays,1),...(str(rateNote)?{note:str(rateNote)}:{})}:undefined;return {...rest,...(rate?{rate}:{}),...(fresh?{status:str(status,'AVAILABLE')}:{})};}}
    afterSave={result=>router.replace(`/admin/rentals/${str(result.id??id)}` as Href)}/>;
}

export function RentalServiceLinesAdmin(){
  const [status,setStatus]=useState('');
  const q=useResource<unknown>(`/admin/rentals/services?limit=50&status=${status}`);
  const [error,setError]=useState<unknown>(null);
  const [editor,setEditor]=useState('');
  const [draft,setDraft]=useState<RecordData>({});
  const services=rows(q.data);
  const selected=services.find(x=>str(x.id)===editor);
  function publish(line:RecordData,next:string){void command(`/admin/rentals/services/${str(line.id)}`,{expectedVersion:num(line.version),status:next},'PATCH').then(()=>q.refetch()).catch(setError);}
  return <Screen title="Safari AI service lines" back refresh={()=>void q.refetch()} updatedAt={q.dataUpdatedAt}>
    <Body muted>The signature Safari AI Rentals service lines shown to travellers.</Body>
    <Chips value={status} onChange={setStatus} items={[{value:'',label:'All'},{value:'DRAFT',label:'Draft'},{value:'PUBLISHED',label:'Published'},{value:'ARCHIVED',label:'Archived'}]}/>
    <QueryState query={q}>
      {services.map(service=><SectionCard key={str(service.id)} title={str(service.title)}>
        <StatusChip status={str(service.status)}/>
        <Body>{str(service.tagline)}</Body>
        <Body muted>{str(service.slug)} · v{str(service.version)}</Body>
        <View style={s.row}>{Array.isArray(service.useCases)&&(service.useCases as unknown[]).map((useCase,i)=><Body key={i}>• {str(useCase)}</Body>)}</View>
        <View style={s.row}>
          <SecondaryButton label={editor===str(service.id)?'Close editor':'Edit'} onPress={()=>{setEditor(editor===str(service.id)?'':str(service.id));setDraft({title:str(service.title),tagline:str(service.tagline),description:str(service.description),useCases:(Array.isArray(service.useCases)?(service.useCases as unknown[]).map(x=>str(x)).join(', '):''),icon:str(service.icon),sortOrder:str(service.sortOrder)});}}/>
          {str(service.status)!=='PUBLISHED'&&<SecondaryButton label="Publish" onPress={()=>publish(service,'PUBLISHED')}/>}
          {str(service.status)==='PUBLISHED'&&<SecondaryButton label="Archive" onPress={()=>publish(service,'ARCHIVED')}/>}
        </View>
        {editor===str(service.id)&&<View style={s.stack}>{(['title','tagline','description','useCases','icon','sortOrder'] as const).map(key=><FormField key={key} label={{title:'Title',tagline:'Tagline',description:'Description',useCases:'Use cases (comma separated)',icon:'Icon',sortOrder:'Sort order'}[key]} value={str(draft[key])} onChange={v=>setDraft({...draft,[key]:v})} multiline={key==='description'} keyboard={key==='sortOrder'?'numeric':'default'}/>)}<PrimaryButton label="Save service line" onPress={()=>{void command(`/admin/rentals/services/${str(service.id)}`,{expectedVersion:num(service.version),title:str(draft.title),tagline:str(draft.tagline),description:str(draft.description),useCases:str(draft.useCases).split(',').map(x=>x.trim()).filter(Boolean),icon:str(draft.icon)||undefined,sortOrder:num(draft.sortOrder)},'PATCH').then(()=>{setEditor('');void q.refetch();}).catch(setError);}}/></View>}
      </SectionCard>)}
      {services.length===0&&<EmptyState title="No service lines" message="Seed or create the Safari AI Rentals signature services."/>}
    </QueryState>
    <SectionCard title="New service line"><Body muted>Create the line as a draft, then publish it to the public catalogue.</Body><SecondaryButton label="Create draft" onPress={()=>nav('/admin/rentals/services/new')}/></SectionCard>
    {Boolean(error)&&<InlineError error={error}/>}
  </Screen>;
}

export function RentalServiceLineEditor(){
  return <EntityForm title="New Safari AI service" writePath="/admin/rentals/services" method="POST"
    fields={[{key:'slug',label:'Slug',required:true},{key:'title',label:'Title',required:true},{key:'tagline',label:'Tagline',required:true},{key:'description',label:'Description',required:true,kind:'paragraph'},{key:'useCases',label:'Use cases (comma separated)',kind:'csv'},{key:'icon',label:'Icon'},{key:'sortOrder',label:'Sort order',kind:'number',default:'0'}]}
    afterSave={()=>router.replace('/admin/rentals/services' as Href)}/>;
}

const POLICY_SECTIONS:[key:string,label:string][]=[
  ['summary','Summary'],['selfDrive','Self-drive'],['lengthOfHire','Length of hire'],['longTermDiscount','Long-term hire'],
  ['deposit','Security deposit'],['fuel','Fuel'],['route','Route approval'],['cancellation','Cancellation & rescheduling'],
  ['insurance','Insurance'],['note','Internal note'],
];
export function RentalPolicyAdmin(){
  const q=useResource<RecordData>('/admin/rentals/policy');
  const published=record(record(q.data).published);
  const draft=record(record(q.data).draft);
  const base=record(Object.keys(draft).length?draft.policy:published.policy);
  const [values,setValues]=useState<Record<string,string>>({});
  const [prohibited,setProhibited]=useState('');
  const [error,setError]=useState<unknown>(null);
  const [pending,setPending]=useState(false);
  useEffect(()=>{if(!q.data)return;const source=record(Object.keys(draft).length?draft.policy:published.policy);setValues(Object.fromEntries(POLICY_SECTIONS.map(([key])=>[key,str(source[key])])));setProhibited(Array.isArray(source.prohibitedUse)?(source.prohibitedUse as unknown[]).map(x=>str(x)).join(', '):'');},[q.data]);
  const latest=Object.keys(draft).length?draft:published;
  function payload(){return {...base,...Object.fromEntries(POLICY_SECTIONS.map(([key])=>[key,str(values[key])])),prohibitedUse:prohibited.split(',').map(x=>x.trim()).filter(Boolean)};}
  return <Screen title="Safari AI rental policy" back refresh={()=>void q.refetch()} updatedAt={q.dataUpdatedAt}>
    <QueryState query={q}>
      <SectionCard title="Status"><Body>Published version {str(published.version,'—')}</Body><Body muted>Draft version {Object.keys(draft).length?str(draft.version):'none'}</Body>{Boolean(published.publishedAt)&&<Body muted>Published {str(published.publishedAt)}</Body>}</SectionCard>
      {POLICY_SECTIONS.map(([key,label])=><FormField key={key} label={label} value={str(values[key])} onChange={v=>setValues({...values,[key]:v})} multiline={key!=='lengthOfHire'&&key!=='fuel'}/>)}
      <FormField label="Not permitted (comma separated)" value={prohibited} onChange={setProhibited} multiline/>
      <PrimaryButton label="Save draft" loading={pending} onPress={()=>{setPending(true);void command('/admin/rentals/policy/draft',{expectedVersion:num(latest.version),policy:payload()}).then(()=>q.refetch()).catch(setError).finally(()=>setPending(false));}}/>
      <SecondaryButton label="Publish draft" disabled={!Object.keys(draft).length||pending} onPress={()=>{void command('/admin/rentals/policy/publish',{expectedVersion:num(draft.version)}).then(()=>q.refetch()).catch(setError);}}/>
      <Body muted>Publishing supersedes the previous version. Travellers see the published version only.</Body>
    </QueryState>
    {Boolean(error)&&<InlineError error={error}/>}
  </Screen>;
}
