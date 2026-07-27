import { useEffect, useState } from 'react'
export function useNow(interval=500){const [now,setNow]=useState(Date.now());useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),interval);return()=>clearInterval(id)},[interval]);return now}
export function formatRemaining(ms:number){const sec=Math.max(0,Math.ceil(ms/1000));const m=Math.floor(sec/60);const s=sec%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
