import { Minimatch } from "minimatch";

/**
 * Converts a relative glob pattern to an absolute path by prepending the base path.
 * Patterns without slashes or already absolute are returned unchanged.
 */
const convertPatternToAbsolutePath = (
  basePath: string,
  pattern: string,
): string => {
  // All patterns without slash are left as they are, if pattern contain
  // any slash we need to turn it into absolute path.
  const hasSlash = pattern.includes("/");
  const isAbsolute = /^!?\//.test(pattern);
  const isNegated = pattern.startsWith("!");
  let separator: string;

  if (!isAbsolute && hasSlash) {
    // Throw out meaningful characters from the beginning ("!", "./").
    const patternWithoutFirstCharacters = pattern
      .replace(/^!/, "")
      .replace(/^\.\//, "");

    separator = basePath.endsWith("/") ? "" : "/";

    if (isNegated) {
      return `!${basePath}${separator}${patternWithoutFirstCharacters}`;
    }

    return `${basePath}${separator}${patternWithoutFirstCharacters}`;
  }

  return pattern;
};

/** A function that tests whether an absolute file path matches the configured patterns. */
export type MatchFunction = (absolutePath: string) => boolean;

/**
 * Creates a matcher function from one or more glob patterns.
 * Supports negation patterns and case-insensitive matching.
 */
export const create = (
  basePath: string,
  patterns: string | string[],
  ignoreCase?: boolean,
): MatchFunction => {
  const normalizedPatterns: string[] =
    typeof patterns === "string" ? [patterns] : patterns;

  const matchers = normalizedPatterns
    .map((pattern) => convertPatternToAbsolutePath(basePath, pattern))
    .map(
      (pattern) =>
        new Minimatch(pattern, {
          matchBase: true,
          nocomment: true,
          nocase: ignoreCase || false,
          dot: true,
          windowsPathsNoEscape: true,
        }),
    );

  const performMatch: MatchFunction = (absolutePath: string): boolean => {
    let mode: "matching" | "negation" = "matching";
    let weHaveMatch = false;

    for (const [i, currentMatcher] of matchers.entries()) {
      if (currentMatcher.negate) {
        mode = "negation";
        if (i === 0) {
          // There are only negated patterns in the set,
          // so make everything matching by default and
          // start to reject stuff.
          weHaveMatch = true;
        }
      }

      if (
        mode === "negation" &&
        weHaveMatch &&
        !currentMatcher.match(absolutePath)
      ) {
        // One negation match is enough to know we can reject this one.
        return false;
      }

      if (mode === "matching" && !weHaveMatch) {
        weHaveMatch = currentMatcher.match(absolutePath);
      }
    }

    return weHaveMatch;
  };

  return performMatch;
};
