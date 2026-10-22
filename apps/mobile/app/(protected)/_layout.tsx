import React from 'react';
import {Stack} from 'expo-router';
import {useSession} from '../../src/lib/session';
import {Screen,Skeleton} from '../../src/ui/components';
export default function Protected(){const {restoring}=useSession();if(restoring)return <Screen><Skeleton/></Screen>;return <Stack screenOptions={{headerShown:false,animation:'none'}}/>;}
