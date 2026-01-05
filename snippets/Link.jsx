/**
 * Link Component
 *
 * A locale-aware link component that automatically adjusts URLs based on the current locale.
 * When viewing a page in a localized directory (e.g., /ja/, /de/, /fr/), this component will
 * prepend the locale prefix to relative URLs so that links point to the localized version
 * of the target page.
 *
 * The source locale is en-US, which has no prefix (files at the root).
 * All other locales use a two-letter prefix (e.g., /ja/, /de/, /fr/, /es/, /zh/, etc.).
 *
 * @param {string} href - The URL path to link to (should start with "/" for relative paths)
 * @param {React.ReactNode} children - The link text/content
 * @param {string} className - Optional CSS classes to apply to the link
 * @param {object} props - Any additional props to pass to the anchor element
 *
 * @example
 * // Basic usage - will automatically prepend locale when on localized pages
 * <Link href="/guides/tooling/sdks/sdk-versioning/">Box SDK versioning strategy</Link>
 *
 * @example
 * // With custom styling
 * <Link href="/guides/box-ai/" className="text-blue-500 hover:underline">Learn about Box AI</Link>
 */

// Use React from global scope (provided by Mintlify)
const { useState, useEffect } = React;

// List of supported locale prefixes (excluding en-US which has no prefix)
// Add new locales here as they become available
const SUPPORTED_LOCALES = [
  'ja',  // Japanese
  // Future locales can be added here, e.g.:
  // 'de',  // German
  // 'fr',  // French
  // 'es',  // Spanish
  // 'zh',  // Chinese
  // 'ko',  // Korean
  // 'pt',  // Portuguese
];

/**
 * Extracts the locale prefix from a URL path if present.
 * @param {string} path - The URL pathname
 * @returns {string|null} The locale prefix (e.g., 'ja') or null if no locale prefix
 */
const getLocaleFromPath = (path) => {
  // Match pattern like /ja/ or /ja at the start of the path
  const match = path.match(/^\/([a-z]{2})(?:\/|$)/);
  if (match) {
    const potentialLocale = match[1];
    // Check if it's a supported locale
    if (SUPPORTED_LOCALES.includes(potentialLocale)) {
      return potentialLocale;
    }
  }
  return null;
};

/**
 * Checks if a URL already has a locale prefix.
 * @param {string} href - The href to check
 * @returns {boolean} True if the href starts with a locale prefix
 */
const hasLocalePrefix = (href) => {
  const match = href.match(/^\/([a-z]{2})(?:\/|$)/);
  if (match) {
    return SUPPORTED_LOCALES.includes(match[1]);
  }
  return false;
};

export const Link = ({ href, children, className, ...props }) => {
  const [localizedHref, setLocalizedHref] = useState(href);

  useEffect(() => {
    // Detect the current locale from the URL path
    const currentPath = window.location.pathname;
    const currentLocale = getLocaleFromPath(currentPath);

    // Only modify relative URLs (starting with /)
    // Don't modify if already has a locale prefix or is an external URL
    if (href && href.startsWith('/') && !hasLocalePrefix(href)) {
      if (currentLocale) {
        // We're on a localized page, prepend the locale
        setLocalizedHref(`/${currentLocale}${href}`);
      } else {
        // We're on an English page (no prefix needed)
        setLocalizedHref(href);
      }
    } else {
      // External URL or already has locale prefix
      setLocalizedHref(href);
    }
  }, [href]);

  return (
    <a href={localizedHref} className={className} {...props}>
      {children}
    </a>
  );
};

