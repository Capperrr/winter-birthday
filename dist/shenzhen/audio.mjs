export class MaterialAudio {
  constructor(){this.context=null;this.enabled=true;this.nodes=new Set();this.motor=null;}
  async unlock(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.context||=new C();await this.context.resume();}catch(_){}}
  tone(f,duration=.09,gain=.035,type='sine',slide=0){
    const c=this.context;if(!c||c.state!=='running'||!this.enabled)return;
    const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,c.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),c.currentTime+duration);
    g.gain.setValueAtTime(gain,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+duration);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect();};
  }
  cue(type){if(type==='step'){this.tone(90,.055,.012,'triangle',-40);return;}if(type==='ding'){this.tone(659,.6,.035);this.tone(988,.42,.015);return;}if(type==='metal'){this.tone(1160,.12,.025,'triangle',-400);return;}if(type==='paper'){this.tone(430,.10,.014,'triangle',-200);return;}this.tone(230,.065,.025,'triangle',-80);}
  setMotor(on){
    if(!on||!this.enabled){if(this.motor){try{this.motor.o.stop();}catch(_){}this.motor.g.disconnect();this.motor=null;}return;}
    const c=this.context;if(this.motor||!c||c.state!=='running')return;
    const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=53;g.gain.value=.009;o.connect(g).connect(c.destination);o.start();this.motor={o,g};
  }
  mute(value){this.enabled=!value;if(value){this.setMotor(false);for(const o of this.nodes)try{o.stop();}catch(_){}}}
  suspend(){this.setMotor(false);this.context?.suspend().catch(()=>{});}
  dispose(){this.setMotor(false);for(const o of this.nodes)try{o.stop();}catch(_){}this.nodes.clear();this.context?.close().catch(()=>{});this.context=null;}
}
