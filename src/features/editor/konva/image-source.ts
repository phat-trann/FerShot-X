/** Only bounded embedded PNGs can enter a resumable image layer; never external URLs. */
export function validateEmbeddedPng(src:string){
 if(typeof src!=="string"||src.length>12*1024*1024||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(src))throw new Error("Invalid inserted image.");
 const header=Uint8Array.from(atob(src.slice(22,66)),c=>c.charCodeAt(0));
 if(header.length<24||![137,80,78,71,13,10,26,10].every((byte,index)=>header[index]===byte)||String.fromCharCode(...header.slice(12,16))!=="IHDR")throw new Error("Invalid inserted PNG.");
 const view=new DataView(header.buffer),width=view.getUint32(16),height=view.getUint32(20);
 if(!width||!height||width>16384||height>16384||width*height>16777216)throw new Error("Inserted image exceeds pixel limits.");
}
