/**
 * Type guard for Node.js system errors (ErrnoException).
 * Narrows `unknown` catch variables to `NodeJS.ErrnoException`,
 * allowing safe access to `.code`, `.errno`, `.syscall`, etc.
 */
export const isErrnoException = (
  error: unknown,
): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error;
