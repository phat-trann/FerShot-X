import { RefreshCw, Settings2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import type { JSX } from "react";

import "./FtpFailurePanel.css";

export interface FtpFailurePanelProps {
  readonly code: string | null;
  readonly message: string;
  readonly busy: boolean;
  readonly onRetry?: () => void;
  readonly onOpenSettings?: () => void;
}

export type KnownFtpFailureCode =
  | "ftp_timeout"
  | "ftp_connection"
  | "ftp_authentication"
  | "ftp_tls"
  | "ftp_credentials"
  | "ftp_failed";

export interface FtpFailureGuidance {
  readonly normalizedCode: KnownFtpFailureCode | "unknown";
  readonly badge: string;
  readonly title: string;
  readonly recovery: string;
}

const GUIDANCE_BY_CODE: Record<KnownFtpFailureCode, FtpFailureGuidance> = {
  ftp_timeout: {
    normalizedCode: "ftp_timeout",
    badge: "ftp_timeout",
    title: "FTP transfer timed out",
    recovery:
      "The server or passive data port (PASV/EPSV) did not respond in time. A timeout is a network or firewall transfer delay and does not mean your stored password is wrong. Retry the upload or check your VPN/network and the server's passive data-port firewall rules.",
  },
  ftp_connection: {
    normalizedCode: "ftp_connection",
    badge: "ftp_connection",
    title: "Could not reach the FTP server",
    recovery:
      "The network connection could not be established or was closed unexpectedly. Check your internet/VPN connection, verify the host and port in FTP settings, and retry.",
  },
  ftp_authentication: {
    normalizedCode: "ftp_authentication",
    badge: "ftp_authentication",
    title: "FTP server rejected sign-in",
    recovery:
      "The server rejected the username or Keychain password. Open FTP settings to verify the account username or update the stored Keychain password, then retry.",
  },
  ftp_tls: {
    normalizedCode: "ftp_tls",
    badge: "ftp_tls",
    title: "FTPS / TLS negotiation failed",
    recovery:
      "Secure TLS negotiation with the server could not complete. Open FTP settings to review your FTPS security mode or certificate configuration, then retry.",
  },
  ftp_credentials: {
    normalizedCode: "ftp_credentials",
    badge: "ftp_credentials",
    title: "FTP credentials are missing or incomplete",
    recovery:
      "A required FTP profile field or Keychain password entry is not configured yet. Open FTP settings to complete the profile and save your password to Keychain.",
  },
  ftp_failed: {
    normalizedCode: "ftp_failed",
    badge: "ftp_failed",
    title: "FTP upload could not complete",
    recovery:
      "The FTP operation did not complete. Retry the upload or open FTP settings to verify the target remote directory and permissions.",
  },
};

const UNKNOWN_GUIDANCE: FtpFailureGuidance = {
  normalizedCode: "unknown",
  badge: "ftp_error",
  title: "FTP upload encountered an error",
  recovery:
    "The upload did not complete. Retry the transfer or open FTP settings to review your connection configuration.",
};

export function resolveFtpFailureGuidance(code: string | null | undefined): FtpFailureGuidance {
  const normalized = typeof code === "string" ? code.trim().toLowerCase() : "";
  if (Object.prototype.hasOwnProperty.call(GUIDANCE_BY_CODE, normalized)) {
    return GUIDANCE_BY_CODE[normalized as KnownFtpFailureCode];
  }
  return UNKNOWN_GUIDANCE;
}

const SAFE_NATIVE_STATUS = new Set([
  "FTP transfer timed out. Retry keeps the same URL.",
  "FTP server could not be reached. Check the address and connection.",
  "FTP login failed. Check username and your saved password.",
  "FTP TLS certificate could not be verified.",
  "FTP transfer failed. Check connection and folder permissions. Retry keeps the same URL.",
  "FTP password is unavailable in Keychain. Save it again in FTP settings.",
  "Transfer interrupted by app exit. Retry uses the original URL.",
]);
/** Only native fixed strings are displayable; arbitrary transport text cannot be reliably redacted. */
export function sanitizeFtpFailureMessage(message: string): string {
  const value = message.trim();
  if (!value) return "Upload failed without additional status details.";
  return SAFE_NATIVE_STATUS.has(value) ? value : "Additional transport details are hidden. Use the error code and local logs to report this issue.";
}

export function FtpFailurePanel({
  code,
  message,
  busy,
  onRetry,
  onOpenSettings,
}: FtpFailurePanelProps): JSX.Element {
  const guidance = resolveFtpFailureGuidance(code);
  const safeMessage = sanitizeFtpFailureMessage(message);
  const hasActions = Boolean(onRetry || onOpenSettings);

  return (
    <section
      className="fsx-ftp-failure"
      role="alert"
      aria-live="polite"
      aria-busy={busy}
      data-testid="ftp-failure-panel"
      data-failure-code={guidance.normalizedCode}
    >
      <header className="fsx-ftp-failure__header">
        <h3 className="fsx-ftp-failure__title">{guidance.title}</h3>
        <span className="fsx-ftp-failure__code" data-testid="ftp-failure-code">
          {guidance.badge}
        </span>
      </header>

      <p className="fsx-ftp-failure__message" data-testid="ftp-failure-message">
        {safeMessage}
      </p>

      <p className="fsx-ftp-failure__guidance" data-testid="ftp-failure-guidance">
        {guidance.recovery}
      </p>

      {hasActions ? (
        <div className="fsx-ftp-failure__actions">
          {onRetry ? (
            <Button icon={RefreshCw} variant="default"
              type="button"
              className="fsx-ftp-failure__btn fsx-ftp-failure__btn--primary"
              disabled={busy}
              aria-disabled={busy}
              onClick={() => {
                if (!busy) {
                  onRetry();
                }
              }}
              data-testid="ftp-failure-retry"
            >
              {busy ? "Retrying…" : "Retry upload"}
            </Button>
          ) : null}
          {onOpenSettings ? (
            <Button icon={Settings2} variant="secondary"
              type="button"
              className="fsx-ftp-failure__btn"
              disabled={busy}
              aria-disabled={busy}
              onClick={() => {
                if (!busy) {
                  onOpenSettings();
                }
              }}
              data-testid="ftp-failure-open-settings"
            >
              Open FTP settings
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
