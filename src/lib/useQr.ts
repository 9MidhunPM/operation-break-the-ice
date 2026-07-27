import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function useQr(value: string, width = 360) {
  const [src,setSrc]=useState('')
  useEffect(()=>{let alive=true;QRCode.toDataURL(value,{width,margin:1,errorCorrectionLevel:'M'}).then((url)=>alive&&setSrc(url)).catch(()=>alive&&setSrc(''));return()=>{alive=false}},[value,width])
  return src
}
