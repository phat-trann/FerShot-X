import { FolderOpen, Clipboard, AppWindow, ArrowDownToLine, Archive, Keyboard, Pencil, Pipette, Ruler, ScanText, Sparkles, WandSparkles, Layers, Printer, Pin, Save, Merge, X, RotateCcw } from "lucide-react";
export interface IconProps { className?: string; size?: number }
export function IconFolderOpen({ className, size = 15 }: IconProps) { return <FolderOpen aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconClipboard({ className, size = 15 }: IconProps) { return <Clipboard aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconWindow({ className, size = 15 }: IconProps) { return <AppWindow aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconScroll({ className, size = 15 }: IconProps) { return <ArrowDownToLine aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconArchive({ className, size = 15 }: IconProps) { return <Archive aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconKeyboard({ className, size = 15 }: IconProps) { return <Keyboard aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconPencil({ className, size = 15 }: IconProps) { return <Pencil aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconColorPicker({ className, size = 15 }: IconProps) { return <Pipette aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconRuler({ className, size = 15 }: IconProps) { return <Ruler aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconScanText({ className, size = 15 }: IconProps) { return <ScanText aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconSparkles({ className, size = 15 }: IconProps) { return <Sparkles aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconMagicWand({ className, size = 15 }: IconProps) { return <WandSparkles aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconLayers({ className, size = 15 }: IconProps) { return <Layers aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconPrinter({ className, size = 15 }: IconProps) { return <Printer aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconPin({ className, size = 15 }: IconProps) { return <Pin aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconSave({ className, size = 15 }: IconProps) { return <Save aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconMerge({ className, size = 15 }: IconProps) { return <Merge aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconClose({ className, size = 15 }: IconProps) { return <X aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
export function IconRestore({ className, size = 15 }: IconProps) { return <RotateCcw aria-hidden="true" focusable="false" className={className} size={size} strokeWidth={1.75}/>; }
