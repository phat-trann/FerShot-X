export interface FtpSettings { host: string; port: number; username: string; remoteDir: string; monthlyFolders?: boolean; publicBaseUrl: string; secure: boolean; namingMode: "random" | "timestamp" }
export type UploadStatus = "pending" | "uploading" | "success" | "failed";
export interface FtpQueueItem { id: string; sourceId: string; name: string; remotePath: string; url: string; status: UploadStatus; createdAt: number; updatedAt: number; error: string | null; errorCode?: string | null }
export interface LocalCacheEntry { id: string; name: string; width: number; height: number; byteSize: number; createdAt: number; expiresAt: number }
export const LOCAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
