// Global Privacy Control detection.
//
// GPC is a browser-level signal (https://globalprivacycontrol.org) that tells
// a site the visitor is opting out of the sale/sharing of their personal info.
// On the client it surfaces as `navigator.globalPrivacyControl`; on the server
// it arrives as the `Sec-GPC: 1` request header.
//
// This module is detection-only — it exposes the signal but does not change any
// runtime behavior. Wire it up to tracking/analytics suppression later.

declare global {
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

/** True if the current browser is sending the GPC signal. SSR-safe (returns false). */
export function isGpcEnabledClient(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.globalPrivacyControl === true;
}

/** True if the incoming request carries the `Sec-GPC: 1` header. */
export function isGpcEnabledRequest(headers: Headers | Record<string, string | undefined>): boolean {
  const value =
    headers instanceof Headers
      ? headers.get("sec-gpc")
      : headers["sec-gpc"] ?? headers["Sec-GPC"];
  return value === "1";
}
