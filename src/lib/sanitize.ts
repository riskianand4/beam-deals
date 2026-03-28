/**
 * Maps raw auth/db error messages to safe, user-facing messages.
 */
export function sanitizeErrorMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Invalid email or password.";
  if (lower.includes("email not confirmed")) return "Please verify your email before signing in.";
  if (lower.includes("user already registered")) return "An account with this email already exists.";
  if (lower.includes("password") && lower.includes("leak")) return "This password has been found in a data breach. Please choose a different one.";
  if (lower.includes("rate limit") || lower.includes("too many")) return "Too many attempts. Please wait a moment and try again.";
  if (lower.includes("row-level security")) return "You don't have permission to perform this action.";
  if (lower.includes("duplicate key")) return "This record already exists.";
  if (lower.includes("network") || lower.includes("fetch")) return "Network error. Please check your connection.";
  return "Something went wrong. Please try again.";
}

/**
 * Sanitizes a URL to prevent javascript: protocol XSS.
 */
export function sanitizeHref(href: string): string {
  const trimmed = href.trim();
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed) || /^vbscript:/i.test(trimmed)) {
    return "#";
  }
  return trimmed;
}
