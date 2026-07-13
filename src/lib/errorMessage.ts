/** Extracts a readable message from anything a catch block might see —
 * a real Error, a Supabase-style {message,details,hint,code} object thrown
 * across a realm boundary where `instanceof Error` can lie, or a bare value. */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;

  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }

  if (typeof err === "string") return err;

  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
