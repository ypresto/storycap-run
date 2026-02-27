/**
 * Parses story patterns like "Button/*" or "Button/Primary"
 * into vitest file filters and test name pattern.
 *
 * In @storybook/addon-vitest, test names are story export names
 * (e.g., "Primary"), NOT "Title > Name". File paths contain
 * the component directory name.
 *
 * Pattern format: "Title/Name" where * is a wildcard.
 * - Title part → vitest file path filter (substring match)
 * - Name part → vitest testNamePattern (regex match)
 *
 * Exclude patterns use negative lookahead in the regex.
 * Note: file-level exclusion (title part of exclude) is not supported;
 * only name-based exclusion is applied.
 */
export function parseStoryPatterns(
  include: string[],
  exclude: string[],
): {
  fileFilters: string[];
  testNamePattern: RegExp | undefined;
} {
  if (include.length === 0 && exclude.length === 0)
    return { fileFilters: [], testNamePattern: undefined };

  const fileFilters: string[] = [];
  const includeNameParts: string[] = [];
  const excludeNameParts: string[] = [];

  for (const pattern of include) {
    const sepIndex = pattern.lastIndexOf('/');
    if (sepIndex === -1) {
      fileFilters.push(pattern);
      continue;
    }

    const titlePart = pattern.slice(0, sepIndex);
    const namePart = pattern.slice(sepIndex + 1);

    if (titlePart !== '*') {
      fileFilters.push(titlePart);
    }

    if (namePart !== '*') {
      includeNameParts.push(patternToRegex(namePart));
    }
  }

  for (const pattern of exclude) {
    const sepIndex = pattern.lastIndexOf('/');
    if (sepIndex === -1) {
      // No separator: treat as file-level exclude (not supported in vitest filters)
      continue;
    }

    const namePart = pattern.slice(sepIndex + 1);

    if (namePart !== '*') {
      excludeNameParts.push(patternToRegex(namePart));
    }
  }

  const hasIncludeNames = includeNameParts.length > 0;
  const hasExcludeNames = excludeNameParts.length > 0;

  if (!hasIncludeNames && !hasExcludeNames) {
    return { fileFilters, testNamePattern: undefined };
  }

  // Build regex: ^(?!(?:exclude1|exclude2)$)(?:include1|include2)$
  let regexStr = '^';
  if (hasExcludeNames) {
    regexStr += `(?!(?:${excludeNameParts.join('|')})$)`;
  }
  if (hasIncludeNames) {
    regexStr += `(?:${includeNameParts.join('|')})$`;
  }

  return { fileFilters, testNamePattern: new RegExp(regexStr) };
}

function patternToRegex(pattern: string): string {
  return escapeRegex(pattern).replaceAll('\\*', '.*');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
