export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; width: number; height: number }
export type AnnotationTool = "select" | "arrow" | "rectangle" | "ellipse" | "pen" | "text" | "counter" | "blur";
export interface AnnotationStyle { color: string; strokeWidth: number; opacity: number }
export interface Annotation {
  id: string;
  tool: Exclude<AnnotationTool, "select">;
  points: readonly Point[];
  style: AnnotationStyle;
  text?: string;
  counter?: number;
  counterAngle?: number;
  blurRadius?: number;
}
export interface EditorViewProps {
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  annotations: readonly Annotation[];
  tool: AnnotationTool;
  onAnnotationCreate: (annotation: Annotation) => void;
  onAnnotationSelect: (id: string | null) => void;
}
