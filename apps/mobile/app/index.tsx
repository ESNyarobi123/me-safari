import React from 'react';
import {Redirect,type Href} from 'expo-router';
import {useSession} from '../src/lib/session';
import {roleHome} from '../src/lib/domain';
import {Screen,Skeleton} from '../src/ui/components';
export default function Bootstrap(){const {restoring,role,user}=useSession();if(restoring)return <Screen title="M&A Safaris"><Skeleton/></Screen>;return <Redirect href={(user&&role?roleHome[role]:'/discover') as Href}/>;}
