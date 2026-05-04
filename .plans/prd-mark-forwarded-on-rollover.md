# Mark Forwarded on Rollover

## Problem Statement

When using the rollover daily todos plugin, incomplete tasks are copied from yesterday's note to today's note. However, there's no visual indication in yesterday's note that these tasks were forwarded. Users have to manually check or remember which tasks moved forward, making it difficult to review historical notes and understand task flow.

## Solution

Add a toggleable option `markForwardedOnRollover` that, when enabled, marks incomplete todos with `[>]` in the previous day's note after they are rolled over to today. The `[>]` marker follows the Obsidian Tasks plugin convention for "forwarded/deferred" tasks, providing clear visual feedback that a task was moved to a future date.

## User Stories

1. As a daily note user, I want rolled-over tasks marked with `[>]` in yesterday's note, so that I can see which tasks were forwarded when reviewing old notes.

2. As a daily note user, I want `[>]` marking to be optional, so that I can keep my existing workflow if I prefer unmarked tasks.

3. As a daily note user, I want tasks already marked `[>]` to be excluded from future rollovers, so that I don't get duplicate tasks if I re-run rollover.

4. As a daily note user, I want `[>]` to be semantically separate from "done" markers, so that forwarded tasks are clearly distinguishable from completed tasks in my notes.

5. As a daily note user, I want nested child todos (when `rolloverChildren` is enabled) to also be marked `[>]`, so that the entire task hierarchy shows as forwarded.

6. As a daily note user, I want plain text children (non-checkbox items) to remain unchanged, so that only actual todos get the forwarded marker.

7. As a daily note user, I want to use both `deleteOnComplete` and `markForwardedOnRollover` together, so that done tasks are deleted while incomplete tasks are marked as forwarded.

8. As a daily note user, I want the undo feature to restore `[>]` markers back to `[ ]`, so that I can reverse the rollover completely if needed.

9. As a CLI user, I want `markForwardedOnRollover` to work in the command-line tool, so that I get consistent behavior whether using Obsidian or the CLI.

10. As a new user, I want `markForwardedOnRollover` to default to `false`, so that the plugin behavior doesn't change unexpectedly after an update.

11. As a settings user, I want a clear description of what `markForwardedOnRollover` does, so that I understand the feature before enabling it.

12. As a daily note user, I want the `[>]` marker to be hardcoded (not configurable), so that the feature is simple and follows established Obsidian conventions.

## Implementation Decisions

### New Setting

- **Name**: `markForwardedOnRollover`
- **Type**: boolean
- **Default**: `false`
- **UI Description**: "Mark incomplete todos with [>] in the previous day's note when rolled over."

### Marking Logic

The marking logic operates on the previous day's note after todos are extracted for rollover:

1. Read yesterday's note content
2. For each todo being rolled over, replace `[ ]` with `[>]` in yesterday's note
3. When `rolloverChildren` is enabled, also mark child todos (items with checkboxes) with `[>]`
4. Plain text children (no checkbox) remain unchanged
5. Write modified content back to yesterday's note

### Forwarded Task Exclusion

Tasks marked `[>]` must be excluded from future rollovers:

- The TodoParser must filter out `[>]` tasks similar to how it filters done tasks
- This is a separate check from `doneStatusMarkers` - the `>` character is hardcoded
- Logic: a task is excluded if its checkbox contains any character in `doneStatusMarkers` OR if it contains `>`

### Interaction with Other Settings

| Setting | Interaction |
|---------|-------------|
| `deleteOnComplete` | Orthogonal - operates on done tasks `[x]`, `[X]`, `[-]` while `markForwardedOnRollover` operates on incomplete tasks `[ ]` |
| `removeEmptyTodos` | Compatible - empty todos are filtered before marking |
| `rolloverChildren` | Compatible - child checkbox items also get marked `[>]` |
| `rolloverOnFileCreate` | Compatible - marking happens regardless of trigger method |
| `doneStatusMarkers` | Separate - `>` is never added to this setting |

### Undo Support

The existing undo mechanism stores previous file state before modification. No changes needed - restoring the file state will automatically revert `[>]` back to `[ ]`.

### CLI Parity

The CLI must implement identical marking logic:
- Load `markForwardedOnRollover` from settings JSON
- Apply marking logic to yesterday's note when enabled
- Mirror the plugin behavior exactly

## Testing Decisions

### What Makes a Good Test

Tests should verify external behavior, not implementation details:
- Given specific input (note content, settings), verify expected output (modified content, todos extracted)
- Test edge cases and interactions between settings
- Don't test internal method calls or private state

### Modules to Test

**1. TodoParser - Forwarded Task Exclusion**
- `[>]` tasks are excluded from rollover
- `[>]` exclusion works independently of `doneStatusMarkers`
- Tasks with `>` in `doneStatusMarkers` are still excluded (belt and suspenders)
- Edge cases: `[> ]` (space after), `[>>]` (double), `[>x]` (combined markers)

**2. Rollover Marking Logic**
- `[ ]` becomes `[>]` when `markForwardedOnRollover: true`
- No changes when `markForwardedOnRollover: false`
- Child todos with checkboxes are marked
- Plain text children are not modified
- Multiple todos in one note are all marked
- Interaction with `deleteOnComplete` (both can be enabled)

**3. Settings**
- Default value is `false`
- Setting persists correctly
- Setting loads correctly on plugin/CLI start

**4. CLI**
- Marking works identically to plugin
- Setting is loaded from data.json

### Prior Art for Tests

Follow patterns from existing tests:
- Use Vitest with AAA pattern (Arrange-Act-Assert)
- Test filtering logic with various checkbox contents
- Test edge cases with Unicode and special characters
- Use real file content strings, not mocks

## Out of Scope

- **Configurable forward marker**: The `>` character is hardcoded. Users cannot customize it to `→`, `f`, or other characters.
- **Bulk retroactive marking**: This feature only marks tasks during rollover, not existing tasks in old notes.
- **Forward marker in `doneStatusMarkers` UI**: The `>` exclusion is hardcoded and not exposed in settings.
- **Date stamping**: No date is added to indicate when a task was forwarded.
- **Forward tracking**: No linking between the forwarded task in yesterday and the new task in today.

## Further Notes

### Obsidian Tasks Convention

The `[>]` marker is a recognized convention in the Obsidian ecosystem, particularly the Obsidian Tasks plugin. It renders distinctly with most themes and integrates with task management workflows.

### Backward Compatibility

- Default `false` ensures existing users see no behavior change
- No migration needed - simply adding a new optional setting
- Existing `deleteOnComplete` users unaffected

### Iteration Order for Marking

When marking todos in yesterday's note, iterate through the lines carefully:
- Match exact todo lines (same content as extracted)
- Replace only the checkbox portion `[ ]` → `[>]`
- Preserve the rest of the line including indentation
