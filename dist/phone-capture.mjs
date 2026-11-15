// Capture state is independent of birthday routes and never writes birthday data.
export class CaptureFlow {
  constructor(){this.epoch=0;this.phase='idle';this.image=null;this.error=null;}
  reset(){this.epoch++;this.phase='idle';this.image=null;this.error=null;}
  async prepare(capture){const epoch=++this.epoch;this.phase='loading';this.image=null;this.error=null;try{const image=await capture();if(epoch!==this.epoch)return false;if(typeof image!=='string'||!image.startsWith('data:image/'))throw new Error('没有获得可用的页面照片');this.image=image;this.phase='camera';return true;}catch(error){if(epoch!==this.epoch)return false;this.phase='error';this.error=error;return false;}}
  shutter(){if(this.phase!=='camera'||!this.image)return false;this.phase='locked';return true;}
}
export function fitCapture(w,h,width=1179,height=2556){if(!(w>0&&h>0))throw new Error('照片尺寸不可用');const scale=Math.min(width*.95/w,height*.62/h);const dw=w*scale,dh=h*scale;return{x:(width-dw)/2,y:(height-dh)/2+height*.03,width:dw,height:dh};}
