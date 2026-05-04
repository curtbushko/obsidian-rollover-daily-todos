# Phase 1: TodoParser Exclusion

## PRD Reference

Covers user stories: #3, #4 from prd-mark-forwarded-on-rollover.md

Implements modules:
- TodoParser (get-todos.js) - add `[>]` exclusion logic

## Tasks

- [x] Add `[>]` exclusion logic to TodoParser `#isTodo()` method, separate from `doneStatusMarkers`
- [x] Write tests for `[>]` task exclusion (basic case: `[>]` tasks are not returned by getTodos)
- [x] Write edge case tests: `[> ]` (space after), `[>>]` (double), mixed markers

## Notes

- The `>` character is hardcoded, not configurable
- Exclusion logic is separate from `doneStatusMarkers` - do NOT add `>` to that array
- Logic: a task is excluded if checkbox contains any `doneStatusMarkers` character OR contains `>`
- Follow existing test patterns in get-todos.test.js using Vitest AAA pattern
