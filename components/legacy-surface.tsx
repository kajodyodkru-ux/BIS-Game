'use client';
import {useEffect} from 'react';
export default function LegacySurface({src,children}:{src:string;children:React.ReactNode}){
 useEffect(()=>{const script=document.createElement('script');script.type='module';script.src=src;document.body.appendChild(script);return ()=>{script.remove()}},[src]);
 return children;
}
