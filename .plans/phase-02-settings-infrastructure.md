# Phase 2: Settings Infrastructure

## PRD Reference

Covers user stories: #2, #10, #11, #12 from prd-mark-forwarded-on-rollover.md

Implements modules:

- Settings (DEFAULT_SETTINGS in index.js)
- Settings UI (RolloverSettingTab.js)

## Tasks

- [x] Add `markForwardedOnRollover: false` to DEFAULT_SETTINGS in index.js
- [x] Add toggle setting to RolloverSettingTab.js with description: "Mark incomplete todos with [>] in the previous day's note when rolled over."
- [x] Write tests verifying default value is `false` and setting loads/saves correctly

## Notes

- Follow existing toggle pattern from other boolean settings (deleteOnComplete, removeEmptyTodos)
- Default must be `false` to maintain backward compatibility
- No migration needed - simply adding a new optional setting
