import { useState } from 'react'

export function CharacterArt({image,name,emoji,color,className=''}:{image?:string;name:string;emoji:string;color:string;className?:string}){
  const [failed,setFailed]=useState(false)
  if(!image||failed)return <div className={`art-fallback ${className}`} style={{'--accent':color} as React.CSSProperties}><span>{emoji}</span><b>{name}</b></div>
  return <img className={className} src={image} alt={name} onError={()=>setFailed(true)} />
}
