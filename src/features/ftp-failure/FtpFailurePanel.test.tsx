// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FtpFailurePanel,
  resolveFtpFailureGuidance,
  sanitizeFtpFailureMessage,
} from "./index";

afterEach(() => {
  cleanup();
});

describe("FtpFailurePanel", () => {
  it("rejects prototype-property codes and arbitrary multi-word private transport text", () => {
    for (const code of ["constructor", "toString", "__proto__"]) {
      expect(resolveFtpFailureGuidance(code).normalizedCode).toBe("unknown");
    }
    const hidden = sanitizeFtpFailureMessage("password='two private words' [2001:db8::1]:21 /Users/private/capture.png");
    expect(hidden).not.toContain("private"); expect(hidden).not.toContain("2001:"); expect(hidden).not.toContain("capture.png");
    const fixed = "FTP transfer timed out. Retry keeps the same URL.";
    expect(sanitizeFtpFailureMessage(fixed)).toBe(fixed);
  });
  it("renders concise English recovery guidance for every known FTP failure code", () => {
    const codes = [
      "ftp_timeout",
      "ftp_connection",
      "ftp_authentication",
      "ftp_tls",
      "ftp_credentials",
      "ftp_failed",
    ] as const;

    for (const code of codes) {
      const guidance = resolveFtpFailureGuidance(code);
      expect(guidance.normalizedCode).toBe(code);
      expect(guidance.title.length).toBeGreaterThan(5);
      expect(guidance.recovery.length).toBeGreaterThan(20);
    }
  });

  it("explains ftp_timeout as a network or passive data-port timeout and never claims the password is wrong", () => {
    render(
      <FtpFailurePanel
        code="ftp_timeout"
        message="Passive data transfer timed out."
        busy={false}
      />,
    );

    const panel = screen.getByTestId("ftp-failure-panel");
    expect(panel.getAttribute("data-failure-code")).toBe("ftp_timeout");
    expect(screen.getByTestId("ftp-failure-code").textContent).toBe("ftp_timeout");

    const guidanceText = screen.getByTestId("ftp-failure-guidance").textContent ?? "";
    expect(guidanceText).toContain("PASV/EPSV");
    expect(guidanceText).toContain("does not mean your stored password is wrong");
  });

  it("falls back safely when code is null or unrecognized", () => {
    const { rerender } = render(
      <FtpFailurePanel code={null} message="" busy={false} />,
    );

    expect(screen.getByTestId("ftp-failure-panel").getAttribute("data-failure-code")).toBe(
      "unknown",
    );
    expect(screen.getByTestId("ftp-failure-code").textContent).toBe("ftp_error");
    expect(screen.getByTestId("ftp-failure-message").textContent).toBe(
      "Upload failed without additional status details.",
    );

    rerender(
      <FtpFailurePanel code="unexpected_custom_code" message="Transfer aborted" busy={false} />,
    );
    expect(screen.getByTestId("ftp-failure-panel").getAttribute("data-failure-code")).toBe(
      "unknown",
    );
    expect(screen.getByTestId("ftp-failure-guidance").textContent).toContain(
      "Retry the transfer or open FTP settings",
    );
  });

  it("redacts endpoints, URLs, IP addresses, and credentials from caller-supplied messages", () => {
    const rawMessage =
      "Failed connecting to ftp://alice:hunter2@files.example.com:2121/shots with password=supersecret at 192.168.1.44:21 or cdn.example.org:990";
    const sanitized = sanitizeFtpFailureMessage(rawMessage);

    expect(sanitized).not.toContain("hunter2");
    expect(sanitized).not.toContain("supersecret");
    expect(sanitized).not.toContain("files.example.com");
    expect(sanitized).not.toContain("192.168.1.44");
    expect(sanitized).not.toContain("cdn.example.org");

    render(
      <FtpFailurePanel
        code="ftp_connection"
        message={rawMessage}
        busy={false}
      />,
    );

    const renderedText = screen.getByTestId("ftp-failure-panel").textContent ?? "";
    expect(renderedText).not.toContain("hunter2");
    expect(renderedText).not.toContain("supersecret");
    expect(renderedText).not.toContain("files.example.com");
    expect(renderedText).not.toContain("192.168.1.44");
  });

  it("wires explicit retry and settings actions and disables them while busy", () => {
    const onRetry = vi.fn();
    const onOpenSettings = vi.fn();

    const { rerender } = render(
      <FtpFailurePanel
        code="ftp_authentication"
        message="Login rejected by server."
        busy={false}
        onRetry={onRetry}
        onOpenSettings={onOpenSettings}
      />,
    );

    const retryBtn = screen.getByTestId("ftp-failure-retry") as HTMLButtonElement;
    const settingsBtn = screen.getByTestId("ftp-failure-open-settings") as HTMLButtonElement;

    expect(retryBtn.disabled).toBe(false);
    expect(settingsBtn.disabled).toBe(false);

    fireEvent.click(retryBtn);
    fireEvent.click(settingsBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);

    rerender(
      <FtpFailurePanel
        code="ftp_authentication"
        message="Login rejected by server."
        busy={true}
        onRetry={onRetry}
        onOpenSettings={onOpenSettings}
      />,
    );

    expect(retryBtn.disabled).toBe(true);
    expect(retryBtn.getAttribute("aria-disabled")).toBe("true");
    expect(retryBtn.textContent).toBe("Retrying…");
    expect(settingsBtn.disabled).toBe(true);
    expect(settingsBtn.getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(retryBtn);
    fireEvent.click(settingsBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
