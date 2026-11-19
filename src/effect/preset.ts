import { PARAM_SPECS, type Settings } from './params';

/**
 * The default preset. Values come from the schema defaults; paste the JSON
 * exported from the spike page into OVERRIDES once tuned against references.
 */
const OVERRIDES: Partial<Settings> = {};

export const DEFAULT_PRESET: Settings = Object.freeze({
  ...(Object.fromEntries(PARAM_SPECS.map((s) => [s.key, s.default])) as Settings),
  ...OVERRIDES,
});
