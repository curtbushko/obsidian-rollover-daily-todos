# Phase 3: Plugin Marking Logic

## PRD Reference

Covers user stories: #1, #5, #6, #7, #8 from prd-mark-forwarded-on-rollover.md

Implements modules:
- Rollover Logic (index.js rollover() method)

## Tasks

- [ ] Implement marking logic in rollover(): when `markForwardedOnRollover` is true, replace `[ ]` with `[>]` in yesterday's note for rolled-over todos
- [ ] Handle child todos: when `rolloverChildren` is enabled, mark child checkbox items with `[>]` but leave plain text unchanged
- [ ] Write tests for marking logic: basic marking, child handling, interaction with `deleteOnComplete`
- [ ] Verify undo functionality works correctly (existing mechanism should handle it)

## Notes

- Store original content in undo history BEFORE marking (follows existing pattern from deleteOnComplete)
- Iterate through lines and replace checkbox portion only: `[ ]` → `[>]`
- Preserve indentation and rest of line
- Match exact todo lines from the extracted todos list
- Both `deleteOnComplete` and `markForwardedOnRollover` can be enabled simultaneously (orthogonal)
