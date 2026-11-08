/**
 * Better Auth sends the browser back to `errorCallbackURL?error=<code>` when a
 * provider sign-in cannot finish. The codes people actually hit get plain
 * language; unknown codes are sanitized and shown generically so the URL can
 * never inject arbitrary text into the page.
 */
const RESTART =
  "This sign-in attempt expired or was opened in a different browser. Try again.";
const MESSAGES: Record<string, string> = {
  account_not_linked:
    "An account with this email already exists. Sign in with your email and password instead.",
  unable_to_link_account:
    "This provider account could not be linked. Sign in with your email and password instead.",
  email_not_found:
    "The provider did not share an email address for this account. Make your email visible on the provider, or use another sign-in method.",
  email_doesn_t_match:
    "The provider account uses a different email than the one you signed in with.",
  email_doesnt_match:
    "The provider account uses a different email than the one you signed in with.",
  access_denied: "The sign-in was cancelled before it finished.",
  state_mismatch: RESTART,
  state_not_found: RESTART,
  please_restart_the_process: RESTART,
  invalid_callback_request: RESTART,
  no_code: "The provider returned an incomplete sign-in. Try again.",
  invalid_code: "The provider returned an invalid sign-in code. Try again.",
  unable_to_get_user_info:
    "The provider did not return your account details. Try again.",
  unable_to_create_user: "Your account could not be created. Try again.",
  unable_to_create_session:
    "You were signed in, but a session could not be started. Try again.",
  user_not_found: "No account matched this sign-in. Try again or create one.",
  signup_disabled:
    "New accounts cannot be created with this provider right now.",
};

export function socialSignInError(code: string | undefined): string | null {
  if (!code) return null;
  const normalized = code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 64);
  if (!normalized.replace(/_/g, "")) return null;
  return (
    MESSAGES[normalized] ??
    `Sign-in did not complete (${normalized}). Try again.`
  );
}
