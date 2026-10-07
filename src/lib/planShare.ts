import { isValidPlan, type Plan } from './plans';

const SHARE_PARAM = 'plan';

/** btoa/atob are Latin1-only - routing through TextEncoder/TextDecoder first makes this safe for any
 *  UTF-8 plan content (e.g. non-ASCII characters an answers field might one day hold). The
 *  +/ -> -/_ swap (and stripped padding) makes the result safe to drop straight into a URL query
 *  value with no further percent-encoding. */
function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Builds a full shareable URL encoding every plan input as a query param - the link is
 *  self-contained (no server-side id), so whoever opens it reproduces the exact plan with no
 *  account or storage needed on either end. */
export function buildShareUrl(plan: Plan): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set(SHARE_PARAM, toBase64Url(JSON.stringify(plan)));
  return url.toString();
}

/** Whether the URL carried a `plan` param at all, distinct from whether it decoded to something
 *  valid - callers (see PlanToolbar) need both: strip the param either way (so a bad link doesn't
 *  linger in the address bar), but only surface an error when one was actually present. */
export type SharedPlanResult = { present: false } | { present: true; plan: Plan | null };

/** Pulls a shared plan out of the current URL's query string, if present. Does not mutate the URL -
 *  see clearSharedPlanFromLocation. */
export function readSharedPlanFromLocation(): SharedPlanResult {
  const encoded = new URLSearchParams(window.location.search).get(SHARE_PARAM);
  if (!encoded) {
    return { present: false };
  }
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(encoded));
    return { present: true, plan: isValidPlan(parsed) ? parsed : null };
  } catch {
    return { present: true, plan: null };
  }
}

/** Strips the share param back out, restoring the base URL. Uses replaceState (not a navigation) so
 *  a link carrying someone's financial details doesn't linger in browser history once it's loaded. */
export function clearSharedPlanFromLocation(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(SHARE_PARAM);
  window.history.replaceState(null, '', url.toString());
}
