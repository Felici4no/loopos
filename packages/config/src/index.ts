/**
 * @loopos/config
 *
 * Shared configuration constants for all LoopOS packages.
 * Add environment-specific configs, feature flags, and constants here.
 */

export const APP_NAME = 'LoopOS';
export const APP_VERSION = '0.1.0';

export const MODULES = {
  TODAY: 'today',
  BODY: 'body',
  RHYTHM: 'rhythm',
  READING: 'reading',
  LISTS: 'lists',
} as const;

export type Module = (typeof MODULES)[keyof typeof MODULES];
