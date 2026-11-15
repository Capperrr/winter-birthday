(()=>{
'use strict';
const $=id=>document.getElementById(id);
const STORAGE='winter-guided-journey-v2';
const base='https://raw.githubusercontent.com/Capperrr/winter-birthday/main/dist/assets/';
const photo={
  dazhou:base+'journey-dazhou.webp',
  school:base+'journey-dazhou.webp',
  university:base+'journey-chongqing.webp',
  southampton:base+'journey-southampton.webp',
  shenzhen:'https://raw.dongdongzu.com/external/images/tianlimingcheng/111.png',
  shenzhenAlt:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1700&q=85',
  interior:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1700&q=85',
  reception:'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1700&q=85'
};
const photos=[{src:photo.dazhou},{src:photo.school},{src:photo.university},{src:photo.southampton},{src:photo.shenzhen,alt:photo.shenzhenAlt}];
const stages=[
  {label:'达州 · 生活的地方',place:'四川 · 达州西外',where:'DAZHOU · CHINA',kicker:'CHAPTER 01 · THE CITY',title:'这里，是你熟悉的日常。',words:'天府新城、罗浮广场。
在认识我以前，这些街区已经陪你走过很多日子。',credit:'达州城市资料影像 · Nyx Ning / CC BY-SA 3.0',href:'https://commons.wikimedia.org/',note:'达州城市资料影像，非天府新城或罗浮广场的精确实景。',hotspots:[['天府新城','家附近生活圈；具体建筑位置尚待确认。'],['罗浮广场','同样是家附近的商圈。等你以后亲自带我去看。']]},
  {label:'达州 · 高中',place:'四川 · 新达一中',where:'SCHOOL DAYS · DAZHOU',kicker:'CHAPTER 02 · SCHOOL DAYS',title:'你的高中时代。',words:'我不知道你每天走过哪一条校园路。
但我知道，你曾在这里慢慢长大。',credit:'达州城市环境资料图 · 学校实景待补充',href:'https://www.dazhou.gov.cn/',note:'尚未获得可核验的学校校园照片，暂以达州城市环境作为背景；绝不冒充校门。',hotspots:[['校园的一段路','不知道你最喜欢哪里，我想有一天听你讲。'],['那时的自己','留下问题：你会想把怎样的高中生活介绍给我？']]},
  {label:'重庆 · 本科',place:'重庆工商大学 · 南岸校区',where:'CHONGQING · CHINA',kicker:'CHAPTER 03 · UNIVERSITY',title:'后来，你去了重庆。',words:'商务英语、南岸校区，还有很好的英语成绩。
但我更想知道，除了课本，你在那里喜欢过什么风景。',credit:'南岸校区正门实景 · 不可思议的诚 / CC BY-SA 4.0',href:'https://commons.wikimedia.org/wiki/File:%E9%87%8D%E5%BA%86%E5%B7%A5%E5%95%86%E5%A4%A7%E5%AD%A6_%E5%8D%97%E5%B2%B8%E6%A0%A1%E5%8C%BA%E6%AD%A3%E9%97%A8.jpg',note:'真实院校的公共区域摄影，不暗示照片拍摄于她就读年份。',hotspots:[['校园风景','她在重庆工商大学南岸校区读本科，专业是商务英语。'],['通往远方','学英语也热爱生活与旅行；接下来，她去了英国。']]},
  {label:'英国 · 硕士',place:'University of Southampton',where:'SOUTHAMPTON · UK',kicker:'CHAPTER 04 · ACROSS THE SEA',title:'然后，是更远的世界。',words:'雅思 7.5，英语一直很好。
可我最想听的，是你在南安普顿看到的天空和那些普通的日子。',credit:'Highfield 校区影像 · Roger Davies / CC BY-SA 2.0',href:'https://commons.wikimedia.org/wiki/File:Highfield_Campus_at_the_University_of_Southampton_-_geograph.org.uk_-_3168891.jpg',note:'照片是南安普顿大学主校区公共空间，尚未确认她实际就读的具体楼宇。',hotspots:[['英国的天气','我没有在那里陪你淋过雨，却想知道你喜欢那里的哪一种天气。'],['旅行的心情','你热爱旅行，硕士生活也不应该只有课堂。']]},
  {label:'深圳 · 工作与相识',place:'深圳 · 南山 · 天利中央广场二期 C 座',where:'SHENZHEN · CHINA',kicker:'CHAPTER 05 · WHEN OUR STORIES MET',title:'最后，走到我认识你的地方。',words:'在这里，你工作了大约两年。
也是从这里开始，我终于走进你的故事。',credit:'楼宇参考：天利名城第三方资料照片 · 建筑外观待核实',href:'https://www.tianlimingcheng.cn/',note:'C座及九楼地址已核实；建筑外观取自第三方参考，非精确入口复刻。',hotspots:[['确认 C 座','你工作的启德教育南山办公室位于天利中央广场二期 C 座九楼。'],['走近入口','按“走进大堂”继续。']]}
];
const shenzhen=[
 {title:'最后，走到我认识你的地方。',kicker:'CHAPTER 05 · SHENZHEN',place:'天利中央广场二期 · C 座',words:'沿着深圳南山的街道，找到她工作过的那栋楼。',photo:photo.shenzhen,alt:photo.shenzhenAlt,note:'外观参考来自第三方楼宇资料；入口位置与形态仍需实地照片确认。',credit:'天利名城实景资料 · 第三方楼宇网站',href:'https://www.tianlimingcheng.cn/',hotspots:[['天利中央广场二期','南山区海德三道195号，C座。'],['启德教育 · 九楼','楼上才是她工作的地方，别把启德招牌放在一楼。']]},
 {title:'走近 C 座玻璃门。',kicker:'SHENZHEN · THE ENTRANCE',place:'天利中央商务广场 · C 座入口',words:'门外是深圳，门里有一个我还没遇见你时的世界。',photo:photo.shenzhen,alt:photo.shenzhenAlt,note:'基于大楼环境的视觉参考；不是C座入口精确摄影复原。',credit:'楼宇外景资料 · 第三方参考',href:'https://www.tianlimingcheng.cn/',hotspots:[['认出 C 座','这里要进入的是C座，不是B座。'],['玻璃门','通过镜头推进过渡到大堂，而非在灰盒空间自由乱走。']]},
 {title:'电梯在大厅的那一边。',kicker:'SHENZHEN · THE LOBBY',place:'C 座 · 大堂',words:'走进大堂，先找到楼层信息。
启德教育，在九楼。',photo:photo.interior,note:'大堂使用通用办公室摄影作为艺术化示意，不是C座内部实拍。',credit:'通用办公室实景风格示意 · Unsplash',href:'https://unsplash.com/',hotspots:[['查看楼层索引','EIC EDUCATION · 9F'],['电梯在哪里？','现在可以呼叫电梯，亲手按下九楼。']]},
 {title:'九楼。',kicker:'SHENZHEN · THE ELEVATOR',place:'C 座 · 电梯间',words:'我不知道你曾经按下这个按钮多少次。
今天，让我陪你按一次。',photo:photo.interior,note:'电梯交互是艺术化重建，未采集真实电梯内景。',credit:'办公室空间摄影示意 · Unsplash',href:'https://unsplash.com/',hotspots:[]},
 {title:'这里，就是启德九楼。',kicker:'SHENZHEN · NINTH FLOOR',place:'启德教育 · 9F',words:'你在这里工作，也在这里认识了 Gwen。
这是我终于能够走近的那段生活。',photo:photo.reception,note:'九楼内部没有可验证的真实照片；此为可信办公室风格示意，非实景复刻。',credit:'办公空间风格示意 · Unsplash',href:'https://unsplash.com/',hotspots:[['启德教育 · 九楼','这个地址是真实的；空间布局仍需要图片参考才能精确重建。'],['留给你的信','一封给25岁 Winter 的生日信，藏在这一站的最后。']]}
];
let chapter=0,sub=0,letter=false,detail=-1,busy=false,soundOn=false,audio=null;
let stored;try{stored=JSON.parse(sessionStorage.getItem(STORAGE)||'null')}catch{}
if(stored && Number.isInteger(stored.chapter)&&stored.chapter>=0&&stored.chapter<=4){chapter=stored.chapter;sub=chapter===4?Math.max(0,Math.min(4,stored.sub|0)):0;letter=!!stored.letter&&chapter===4&&sub===4;}
let photoSwitch=0,toastTimer;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
function save(){try{sessionStorage.setItem(STORAGE,JSON.stringify({chapter,sub,letter}))}catch{}}
function beep(freq=490,duration=.045){if(!soundOn)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume();const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='sine';oscillator.frequency.value=freq;gain.gain.value=.016;gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);oscillator.connect(gain).connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+duration)}catch{}}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3000)}
function setImage(src,alt){
 const next=$('photo-new'),old=$('photo-old');
 const fallback=alt||photo.shenzhenAlt;
 let done=false;
 const img=new Image();img.referrerPolicy='no-referrer';
 img.onload=()=>{
  if(done)return;done=true;
  const previous=next.style.backgroundImage;
  old.style.backgroundImage=previous;old.style.opacity='1';
  next.style.opacity='0';next.style.backgroundImage='url("'+src.replace(/"/g,'%22')+'")';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{next.style.opacity='1';old.style.opacity='0'}));
 };
 img.onerror=()=>{if(!done&&fallback&&fallback!==src){setImage(fallback,null)}else if(!done){done=true;next.style.backgroundImage='linear-gradient(125deg,#24414b,#82959b 49%,#354c4e)';next.style.opacity='1'}};
 img.src=src;
}
function chapterData(){return chapter<4?stages[chapter]:shenzhen[sub]}
function paint(){
 const data=chapterData();detail=-1;busy=false;
 $('fraction').textContent=String(chapter+1).padStart(2,'0');
 $('kicker').textContent=data.kicker;
 $('scene-title').textContent=data.title;
 $('place').textContent=data.place;
 $('narration').textContent=data.words;
 $('local-label').textContent=chapter<4?stages[chapter].where:'SHENZHEN · CHINA';
 $('truth-label').textContent=data.note;
 $('credit').textContent=data.credit+' ↗';$('credit').href=data.href;
 $('scene-detail').hidden=true;
 setImage(chapter<4?photos[chapter].src:data.photo,chapter<4?photos[chapter].alt:data.alt);
 $('letter-screen').hidden=!letter;
 $('floor-indicator').hidden=!(chapter===4&&sub===3&&!letter);
 $('floor-nine').disabled=false;$('floor-nine').classList.remove('pressed');
 const hs=$('hotspots');hs.replaceChildren();
 const places=data.hotspots||[];for(const [i,spot] of places.entries()){
  const button=document.createElement('button');button.type='button';button.className='hotspot';button.textContent=spot[0];button.dataset.index=String(i);
  button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>{beep(530);detail=i;$('scene-detail').hidden=false;$('scene-detail').textContent=spot[1];hs.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===button)))});
  hs.append(button);
 }
 hs.hidden=letter;
 $('previous').disabled=chapter===0&&sub===0&&!letter;
 $('next').disabled=chapter===4&&sub===3;
 $('next-label').textContent=letter?'再走一次':chapter===4?['走近 C 座入口','进入写字楼大堂','去乘九楼电梯','请先按下 9F','打开最后的信'][sub]:
 ['下一站 · 新达一中','下一站 · 重庆工商大学','下一站 · 南安普顿大学','最后一站 · 深圳启德'][chapter];
 $('next').hidden=chapter===4&&sub===3;
 $('floor-desc').textContent='亲手按下九楼';
 $('floor-number').textContent='1';
 $('floor-indicator').classList.remove('departing');
 $('elevator-doors').className='elevator-doors';
 $('progress-line').style.width=((chapter+((chapter===4?sub:0)/5))/4.95*100).toFixed(1)+'%';
 save();
}
function advance(){
 if(busy)return;
 if(letter){restart();return}
 if(chapter<4){chapter++;sub=0}
 else if(sub===3){toast('请先按下电梯里的 9F');return}
 else if(sub===4){letter=true}
 else sub++;
 beep(410);paint();
}
function previous(){
 if(busy)return;
 if(letter){letter=false}
 else if(chapter===4&&sub>0)sub--;
 else if(chapter>0){chapter--;sub=chapter===4?4:0}
 else return;
 beep(390);paint();
}
function restart(){chapter=0;sub=0;letter=false;beep(600);paint()}
$('next').addEventListener('click',advance);$('previous').addEventListener('click',previous);$('replay').addEventListener('click',restart);
$('sound').addEventListener('click',()=>{soundOn=!soundOn;$('sound').textContent=soundOn?'声音开启':'声音关闭';$('sound').setAttribute('aria-pressed',String(soundOn));beep(520)});
$('floor-nine').addEventListener('click',()=>{
 if(busy||chapter!==4||sub!==3)return;
 busy=true;$('floor-nine').classList.add('pressed');$('floor-nine').disabled=true;
 $('floor-desc').textContent='正在上升…';$('elevator-doors').classList.add('closed');beep(630,.13);
 let floor=1;let timer=setInterval(()=>{floor=Math.min(9,floor+1);$('floor-number').textContent=String(floor);if(floor===9){clearInterval(timer);setTimeout(()=>{busy=false;sub=4;$('elevator-doors').classList.add('opened');paint();toast('叮。九楼到了。')},reduced.matches?40:550)}},reduced.matches?55:200);
});
document.addEventListener('keydown',event=>{
 if(event.target.closest('button,a,textarea,input'))return;
 if(event.key==='ArrowRight'||event.key==='Enter'){event.preventDefault();advance()}
 if(event.key==='ArrowLeft'){event.preventDefault();previous()}
});
$('stage').addEventListener('pointermove',event=>{
 if(reduced.matches)return;
 const bounds=$('stage').getBoundingClientRect();
 const x=(event.clientX-bounds.width*.5)/bounds.width,y=(event.clientY-bounds.height*.5)/bounds.height;
 $('stage').style.setProperty('--pan-x',Math.max(-10,Math.min(10,-x*14))+'px');
 $('stage').style.setProperty('--pan-y',Math.max(-7,Math.min(7,-y*10))+'px');
});
const initial=chapter;paint();if(initial!==0)toast('已恢复这次旅程的进度 · 点击“重新旅行”从达州开始');
})();
