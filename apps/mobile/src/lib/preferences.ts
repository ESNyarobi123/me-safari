import {create} from 'zustand';
import type {Locale} from './domain';
/** Local UI state only. No booking, trip, ledger or authorization records are stored here. */
export const usePreferences=create<{locale:Locale;selectedTripId:string|null;setLocale:(value:Locale)=>void;selectTrip:(id:string|null)=>void;clear:()=>void}>(set=>({locale:'en',selectedTripId:null,setLocale:locale=>set({locale}),selectTrip:selectedTripId=>set({selectedTripId}),clear:()=>set({selectedTripId:null})}));
