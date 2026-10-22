import {router,type Href} from 'expo-router';
import {useSession} from './session';
export function contextPath(path:string){return useSession.getState().role==='ADMIN'&&path.startsWith('/operations/')?'/admin/operations/'+path.slice('/operations/'.length):path;}
export function navigate(path:string){router.push(contextPath(path) as Href);}
export function replace(path:string){router.replace(contextPath(path) as Href);}
