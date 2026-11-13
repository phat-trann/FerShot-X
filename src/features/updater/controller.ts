export type Phase="idle"|"unconfigured"|"checking"|"current"|"available"|"downloading"|"downloaded"|"installing"|"installed"|"restarting"|"error";
export type Action="check"|"download"|"install"|"restart"|"apply";
export interface UpdateState{phase:Phase;availableVersion:string|null;downloaded:number;total:number|null;error:"check"|"download"|"install"|"restart"|"busy"|"storage"|null}
export const INITIAL_UPDATE:UpdateState={phase:"idle",availableVersion:null,downloaded:0,total:null,error:null};
export interface Candidate{version:string;download:(onEvent:(event:{event:string;data?:{contentLength?:number;chunkLength?:number}})=>void)=>Promise<void>;install:()=>Promise<void>;close:()=>Promise<void>}
export interface UpdateServices{configured:()=>Promise<boolean>;claim:(manual:boolean)=>Promise<boolean>;check:()=>Promise<Candidate|null>;publish:(state:UpdateState)=>void;prepare:()=>Promise<void>;begin:()=>Promise<void>;end:()=>Promise<void>;restart:()=>Promise<void>}
/** One controller/resource in main for every Settings/tray request. */
export class UpdateController{
 state={...INITIAL_UPDATE};private busy=false;private update:Candidate|null=null;private downloaded=false;
 constructor(private services:UpdateServices){}
 private set(patch:Partial<UpdateState>){this.state={...this.state,...patch};this.services.publish(this.state);}
 async run(action:Action,manual=true){
  if(!manual&&(action!=="check"||this.state.phase==="downloaded"))return;
  if(this.busy||["installed","restarting"].includes(this.state.phase)&&action!=="restart"&&action!=="apply")return;
  this.busy=true;let operation:UpdateState["error"]="check",guard=false;
  try{
   if(action==="check"){
    if(!await this.services.configured()){this.set({phase:"unconfigured",error:null});return;}
    operation="storage";if(!await this.services.claim(manual))return;
    operation="check";this.set({phase:"checking",error:null,availableVersion:null,downloaded:0,total:null});
    if(this.update)await this.update.close().catch(()=>{});this.update=null;this.downloaded=false;
    const next=await this.services.check();this.update=next;
    if(next&&(next.version.length>64||!/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.+-]+)?$/.test(next.version))){await next.close();this.update=null;throw new Error("Invalid release version");}
    this.set({phase:next?"available":"current",availableVersion:next?.version??null,downloaded:0,total:null});
   }else {
   if((action==="download"||action==="apply")&&this.update&&!this.downloaded){
    operation="download";this.set({phase:"downloading",downloaded:0,total:null,error:null});let last=0;
    await this.update.download(event=>{if(event.event==="Started")this.set({total:event.data?.contentLength??null});else if(event.event==="Progress"){const downloaded=this.state.downloaded+(event.data?.chunkLength??0);this.state={...this.state,downloaded};if(Date.now()-last>100){last=Date.now();this.set({downloaded});}}});
    this.downloaded=true;this.set({phase:"downloaded"});
   }
   if((action==="install"||action==="apply")&&this.update&&this.downloaded){
    operation="busy";await this.services.prepare();await this.services.begin();guard=true;
    operation="install";this.set({phase:"installing",error:null});await this.update.install();await this.update.close().catch(()=>{});this.update=null;guard=false;this.set({phase:"installed"});
   }
   if((action==="restart"||action==="apply")&&this.state.phase==="installed"){
    operation="restart";this.set({phase:"restarting",error:null});try{await this.services.prepare();await this.services.restart();}catch{this.set({phase:"installed",error:"restart"});}
   }
   }
  }catch{
   if(guard)await this.services.end().catch(()=>{});
   if(operation==="install"&&this.update){await this.update.close().catch(()=>{});this.update=null;this.downloaded=false;}
   this.set({phase:"error",error:operation});
  }finally{this.busy=false;}
 }
}
