/** Opening zoom is a preset; explicit Fit remains a separate viewport calculation. */
export function initialEditorZoom(width:number,height:number,availableWidth:number,availableHeight:number){return width<=availableWidth*.8&&height<=availableHeight*.8?1:.8;}

/** Full visibility wins when chrome or a resized window cannot contain the preset. */
export function openingEditorScale(width:number,height:number,referenceWidth:number,referenceHeight:number,viewportWidth:number,viewportHeight:number){
 const preset=initialEditorZoom(width,height,referenceWidth,referenceHeight),fit=Math.min(viewportWidth/width,viewportHeight/height);
 return Math.min(preset,fit<1?.8:1,fit);
}
