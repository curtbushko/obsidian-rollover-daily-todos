# Phase 4: CLI Implementation

## PRD Reference

Covers user story: #9 from prd-mark-forwarded-on-rollover.md

Implements modules:
- CLI (cli.js)

## Tasks

- [ ] Load `markForwardedOnRollover` setting from data.json in CLI settings loading
- [ ] Implement marking logic in CLI rollover function, mirroring plugin behavior exactly
- [ ] Write CLI tests for marking logic

## Notes

- CLI reads settings from `.obsidian/plugins/obsidian-rollover-daily-todos/data.json`
- Mirror the exact marking logic from plugin (Phase 3)
- CLI uses Node.js fs module (writeFileSync) instead of Obsidian vault API
- Ensure parity: same input should produce same output in both plugin and CLI
