/**
 * Default settings for the Rollover Daily Todos plugin.
 * This module is exported separately to allow for testing without Obsidian dependencies.
 */
export const DEFAULT_SETTINGS = {
  templateHeading: "none",
  deleteOnComplete: false,
  removeEmptyTodos: false,
  rolloverChildren: false,
  rolloverOnFileCreate: true,
  doneStatusMarkers: "xX-",
  leadingNewLine: true,
  markForwardedOnRollover: false,
};
