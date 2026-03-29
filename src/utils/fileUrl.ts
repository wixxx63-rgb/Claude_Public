/**
 * Converts a native file system path to a valid file:// URL.
 * Handles Windows backslash paths (C:\...) and Unix paths (/...).
 */
export function fileUrl(filePath: string): string {
  // Normalize all backslashes to forward slashes
  const normalized = filePath.replace(/\\/g, '/')
  // Unix absolute paths start with / → file:///path
  // Windows absolute paths start with a drive letter → file:///C:/...
  return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`
}
