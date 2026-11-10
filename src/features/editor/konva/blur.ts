import Konva from "konva";
import type { Rect } from "../../../contracts/editor";
/** Nondestructive raster cache for a blur element. Original pixels never change. */
export function createBlurPatch(source:CanvasImageSource,rect:Rect,radius:number):HTMLCanvasElement{
 const width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));
 if(width*height>4194304)throw new Error("Blur region exceeds four megapixels.");
 const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
 const context=canvas.getContext("2d");if(!context)throw new Error("Blur canvas unavailable.");
 context.drawImage(source,rect.x,rect.y,rect.width,rect.height,0,0,width,height);
 const pixels=context.getImageData(0,0,width,height),filter=new Konva.Image({image:source,blurRadius:Math.max(1,Math.min(64,radius))});
 const blur=Konva.Filters.Blur as (this:Konva.Image,pixels:ImageData)=>void;blur.call(filter,pixels);context.putImageData(pixels,0,0);filter.destroy();return canvas;
}
