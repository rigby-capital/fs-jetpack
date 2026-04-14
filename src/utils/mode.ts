// Logic for unix file mode operations.

// Converts mode to string 3 characters long.
/** Converts a numeric or string file mode to a 3-character octal string (e.g. "755"). */
export const normalizeFileMode = (mode: number | string): string => {
  const modeAsString: string =
    typeof mode === "number" ? mode.toString(8) : mode;
  return modeAsString.slice(Math.max(0, modeAsString.length - 3));
};
