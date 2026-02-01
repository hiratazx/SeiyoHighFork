/**
 * Developer-only logging utility.
 * 
 * Console output is completely suppressed for non-developer users.
 * This keeps the browser console clean for regular players while
 * preserving full debug output for admins.
 * 
 * Usage:
 *   import { devLog, devWarn, devInfo } from '../lib/devLog';
 *   devLog('Pipeline step:', stepName);
 *   devWarn('Cache miss, rebuilding...');
 */

let isDeveloperMode = false;

/**
 * Initialize developer mode. Call this once on app mount
 * with the isDeveloper value from Inertia shared props.
 */
export function setDeveloperMode(isDev: boolean): void {
  isDeveloperMode = isDev;
  if (isDev) {
    console.log('%c🔧 Developer Mode Enabled', 'background: #2ecc71; color: white; padding: 4px 8px; border-radius: 4px;');
  }
}

/**
 * Check if developer mode is currently active.
 */
export function isDeveloper(): boolean {
  return isDeveloperMode;
}

/**
 * Developer-only console.log - silent for regular users.
 */
export function devLog(...args: unknown[]): void {
  if (isDeveloperMode) {
    console.log(...args);
  }
}

/**
 * Developer-only console.warn - silent for regular users.
 */
export function devWarn(...args: unknown[]): void {
  if (isDeveloperMode) {
    console.warn(...args);
  }
}

/**
 * Developer-only console.info - silent for regular users.
 */
export function devInfo(...args: unknown[]): void {
  if (isDeveloperMode) {
    console.info(...args);
  }
}

/**
 * Developer-only console.debug - silent for regular users.
 */
export function devDebug(...args: unknown[]): void {
  if (isDeveloperMode) {
    console.debug(...args);
  }
}

/**
 * Developer-only console.group - silent for regular users.
 */
export function devGroup(label: string): void {
  if (isDeveloperMode) {
    console.group(label);
  }
}

/**
 * Developer-only console.groupCollapsed - silent for regular users.
 */
export function devGroupCollapsed(label: string): void {
  if (isDeveloperMode) {
    console.groupCollapsed(label);
  }
}

/**
 * Developer-only console.groupEnd - silent for regular users.
 */
export function devGroupEnd(): void {
  if (isDeveloperMode) {
    console.groupEnd();
  }
}

/**
 * Developer-only console.table - silent for regular users.
 */
export function devTable(data: unknown, columns?: string[]): void {
  if (isDeveloperMode) {
    console.table(data, columns);
  }
}
