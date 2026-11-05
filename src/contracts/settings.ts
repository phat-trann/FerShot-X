export interface AppSettings {
  saveFormat: "png" | "jpeg";
  jpegQuality: number;
  downscaleRetina: boolean;
  showPreview: boolean;
}
export const DEFAULT_SETTINGS: Readonly<AppSettings> = {
  saveFormat: "png", jpegQuality: 90, downscaleRetina: false, showPreview: true,
};
export interface SettingsPanelProps {
  value: Readonly<AppSettings>;
  onChange: (next: AppSettings) => void;
}
