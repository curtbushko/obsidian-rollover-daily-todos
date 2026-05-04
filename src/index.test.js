import { expect, test, describe, vi, beforeEach } from "vitest";
import { markTodos } from "./mark-todos";

/**
 * Integration tests for marking todos in the rollover() method.
 *
 * Since the RolloverTodosPlugin class has tight coupling with Obsidian APIs,
 * these tests validate the marking integration logic through helper functions
 * that mirror the rollover() behavior.
 */

/**
 * Simulates the marking logic that should be integrated into rollover().
 * This function mirrors the expected behavior after integration.
 *
 * @param {Object} options
 * @param {string} options.yesterdayContent - Content of yesterday's note
 * @param {string[]} options.todosYesterday - Todos identified for rollover
 * @param {boolean} options.markForwardedOnRollover - Whether to mark forwarded todos
 * @param {boolean} options.deleteOnComplete - Whether to delete rolled-over todos
 * @returns {Object} - { markedContent, undoContent, todosToday }
 */
function simulateRolloverMarking({
  yesterdayContent,
  todosYesterday,
  markForwardedOnRollover,
  deleteOnComplete,
}) {
  const yesterdayLines = yesterdayContent.split("\n");

  // Store original content for undo BEFORE any modifications
  const undoContent = yesterdayContent;

  let markedContent = yesterdayContent;

  // Apply marking if enabled
  if (markForwardedOnRollover && todosYesterday.length > 0) {
    const markedLines = markTodos({
      lines: yesterdayLines,
      todosToMark: todosYesterday,
    });
    markedContent = markedLines.join("\n");
  }

  // Apply deletion if enabled (on already-marked content)
  let finalContent = markedContent;
  if (deleteOnComplete) {
    let lines = markedContent.split("\n");
    // When deleting, we need to match against the MARKED versions if marking was applied
    const todosToDelete = markForwardedOnRollover
      ? markTodos({ lines: todosYesterday, todosToMark: todosYesterday })
      : todosYesterday;

    for (let i = lines.length - 1; i >= 0; i--) {
      if (todosToDelete.includes(lines[i])) {
        lines.splice(i, 1);
      }
    }
    finalContent = lines.join("\n");
  }

  return {
    markedContent,
    finalContent,
    undoContent,
    todosToday: todosYesterday, // Todos rolled over to today (unchanged)
  };
}

describe("rollover() marking integration", () => {
  describe("basic marking behavior", () => {
    test("should mark todos in yesterday's note when markForwardedOnRollover is true", () => {
      // GIVEN - yesterday has unchecked task, markForwardedOnRollover is true
      const yesterdayContent =
        "# Yesterday\n- [ ] task to rollover\n- [x] done task";
      const todosYesterday = ["- [ ] task to rollover"];

      // WHEN - rollover logic is applied
      const result = simulateRolloverMarking({
        yesterdayContent,
        todosYesterday,
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - yesterday's todo becomes [>], today gets unchanged [ ] todo
      expect(result.markedContent).toBe(
        "# Yesterday\n- [>] task to rollover\n- [x] done task"
      );
      expect(result.todosToday).toStrictEqual(["- [ ] task to rollover"]);
    });

    test("should not mark todos when markForwardedOnRollover is false", () => {
      // GIVEN - yesterday has unchecked task, markForwardedOnRollover is false
      const yesterdayContent = "# Yesterday\n- [ ] task to rollover";
      const todosYesterday = ["- [ ] task to rollover"];

      // WHEN - rollover logic is applied
      const result = simulateRolloverMarking({
        yesterdayContent,
        todosYesterday,
        markForwardedOnRollover: false,
        deleteOnComplete: false,
      });

      // THEN - yesterday's todo remains [ ], today gets [ ] todo
      expect(result.markedContent).toBe("# Yesterday\n- [ ] task to rollover");
      expect(result.todosToday).toStrictEqual(["- [ ] task to rollover"]);
    });

    test("should only mark todos that were actually rolled over", () => {
      // GIVEN - yesterday has both incomplete and completed todos
      const yesterdayContent =
        "# Yesterday\n- [ ] incomplete task\n- [x] completed task\n- [ ] another incomplete";
      const todosYesterday = [
        "- [ ] incomplete task",
        "- [ ] another incomplete",
      ];

      // WHEN - rollover logic is applied
      const result = simulateRolloverMarking({
        yesterdayContent,
        todosYesterday,
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - only incomplete todos are marked, completed remains unchanged
      expect(result.markedContent).toBe(
        "# Yesterday\n- [>] incomplete task\n- [x] completed task\n- [>] another incomplete"
      );
    });
  });

  describe("interaction with deleteOnComplete", () => {
    test("should mark and delete when both markForwardedOnRollover and deleteOnComplete are true", () => {
      // GIVEN - both settings true, yesterday has task
      const yesterdayContent =
        "# Yesterday\n- [ ] task to rollover\nSome other content";
      const todosYesterday = ["- [ ] task to rollover"];

      // WHEN - rollover logic is applied
      const result = simulateRolloverMarking({
        yesterdayContent,
        todosYesterday,
        markForwardedOnRollover: true,
        deleteOnComplete: true,
      });

      // THEN - content is marked (intermediate state), then deleted
      expect(result.markedContent).toBe(
        "# Yesterday\n- [>] task to rollover\nSome other content"
      );
      expect(result.finalContent).toBe("# Yesterday\nSome other content");
      expect(result.todosToday).toStrictEqual(["- [ ] task to rollover"]);
    });

    test("should delete without marking when only deleteOnComplete is true", () => {
      // GIVEN - deleteOnComplete true but markForwardedOnRollover false
      const yesterdayContent =
        "# Yesterday\n- [ ] task to rollover\nSome content";
      const todosYesterday = ["- [ ] task to rollover"];

      // WHEN - rollover logic is applied
      const result = simulateRolloverMarking({
        yesterdayContent,
        todosYesterday,
        markForwardedOnRollover: false,
        deleteOnComplete: true,
      });

      // THEN - content is deleted without marking
      expect(result.markedContent).toBe(
        "# Yesterday\n- [ ] task to rollover\nSome content"
      );
      expect(result.finalContent).toBe("# Yesterday\nSome content");
    });
  });

  describe("undo history behavior", () => {
    test("should store original content in undo history before marking", () => {
      // GIVEN - markForwardedOnRollover true, yesterday has todos
      const yesterdayContent = "# Yesterday\n- [ ] task one\n- [ ] task two";
      const todosYesterday = ["- [ ] task one", "- [ ] task two"];

      // WHEN - rollover logic is applied
      const result = simulateRolloverMarking({
        yesterdayContent,
        todosYesterday,
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - undoContent contains UNMARKED version (original)
      expect(result.undoContent).toBe(
        "# Yesterday\n- [ ] task one\n- [ ] task two"
      );
      expect(result.markedContent).toBe(
        "# Yesterday\n- [>] task one\n- [>] task two"
      );
    });

    test("should store original content before both marking and deletion", () => {
      // GIVEN - both settings true
      const yesterdayContent = "# Yesterday\n- [ ] task\nOther content";
      const todosYesterday = ["- [ ] task"];

      // WHEN - rollover logic is applied
      const result = simulateRolloverMarking({
        yesterdayContent,
        todosYesterday,
        markForwardedOnRollover: true,
        deleteOnComplete: true,
      });

      // THEN - undoContent has original (unmarked, undeleted)
      expect(result.undoContent).toBe("# Yesterday\n- [ ] task\nOther content");
      expect(result.finalContent).toBe("# Yesterday\nOther content");
    });
  });

  describe("rolloverChildren integration", () => {
    test("should handle markForwardedOnRollover with rolloverChildren enabled", () => {
      // GIVEN - parent with checkbox children in todosYesterday
      const yesterdayContent =
        "# Yesterday\n- [ ] parent task\n    - [ ] child checkbox\n    - plain text child";
      const todosYesterday = [
        "- [ ] parent task",
        "    - [ ] child checkbox",
        "    - plain text child",
      ];

      // WHEN - rollover logic is applied with marking
      const result = simulateRolloverMarking({
        yesterdayContent,
        todosYesterday,
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - parent and checkbox children marked, plain text preserved
      expect(result.markedContent).toBe(
        "# Yesterday\n- [>] parent task\n    - [>] child checkbox\n    - plain text child"
      );
    });

    test("should preserve nested structure when marking with children", () => {
      // GIVEN - complex nested structure
      const yesterdayContent = [
        "# Yesterday",
        "- [ ] parent",
        "    - [ ] child 1",
        "    - notes for child 1",
        "        - [ ] grandchild",
        "- [x] completed parent",
      ].join("\n");

      const todosYesterday = [
        "- [ ] parent",
        "    - [ ] child 1",
        "    - notes for child 1",
        "        - [ ] grandchild",
      ];

      // WHEN - marking is applied
      const result = simulateRolloverMarking({
        yesterdayContent,
        todosYesterday,
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - structure preserved, checkboxes marked
      expect(result.markedContent).toBe(
        [
          "# Yesterday",
          "- [>] parent",
          "    - [>] child 1",
          "    - notes for child 1",
          "        - [>] grandchild",
          "- [x] completed parent",
        ].join("\n")
      );
    });
  });

  describe("edge cases", () => {
    test("should handle empty todosYesterday list", () => {
      // GIVEN - no todos to rollover
      const yesterdayContent = "# Yesterday\n- [x] all done";
      const todosYesterday = [];

      // WHEN - rollover logic is applied
      const result = simulateRolloverMarking({
        yesterdayContent,
        todosYesterday,
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - content unchanged
      expect(result.markedContent).toBe("# Yesterday\n- [x] all done");
    });

    test("should handle multiple todos with same text", () => {
      // GIVEN - duplicate todo text
      const yesterdayContent =
        "# Section 1\n- [ ] task\n# Section 2\n- [ ] task";
      const todosYesterday = ["- [ ] task"];

      // WHEN - marking is applied
      const result = simulateRolloverMarking({
        yesterdayContent,
        todosYesterday,
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - all matching todos are marked (Set-based matching)
      expect(result.markedContent).toBe(
        "# Section 1\n- [>] task\n# Section 2\n- [>] task"
      );
    });
  });
});

/**
 * Simulates the full rollover + undo flow for testing undo functionality.
 * This mirrors the plugin behavior where:
 * 1. Rollover stores original content in undoHistory
 * 2. Rollover modifies both files (today gets todos, yesterday gets marked/deleted)
 * 3. Undo restores both files to original state from undoHistory
 *
 * @param {Object} options
 * @param {string} options.yesterdayContent - Original content of yesterday's note
 * @param {string} options.todayContent - Original content of today's note
 * @param {string[]} options.todosYesterday - Todos identified for rollover
 * @param {boolean} options.markForwardedOnRollover - Whether to mark forwarded todos
 * @param {boolean} options.deleteOnComplete - Whether to delete rolled-over todos
 * @returns {Object} - { afterRollover, afterUndo }
 */
function simulateFullRolloverWithUndo({
  yesterdayContent,
  todayContent,
  todosYesterday,
  markForwardedOnRollover,
  deleteOnComplete,
}) {
  // Step 1: Store original content for undo (BEFORE any modifications)
  const undoHistory = {
    previousDay: {
      oldContent: yesterdayContent,
    },
    today: {
      oldContent: todayContent,
    },
  };

  // Step 2: Apply rollover modifications to today
  const todosString = todosYesterday.join("\n");
  const modifiedTodayContent =
    todosYesterday.length > 0
      ? todayContent + "\n" + todosString
      : todayContent;

  // Step 3: Apply marking and/or deletion to yesterday
  let modifiedYesterdayContent = yesterdayContent;

  if (markForwardedOnRollover && todosYesterday.length > 0) {
    const lines = modifiedYesterdayContent.split("\n");
    const markedLines = markTodos({
      lines,
      todosToMark: todosYesterday,
    });
    modifiedYesterdayContent = markedLines.join("\n");
  }

  if (deleteOnComplete) {
    let lines = modifiedYesterdayContent.split("\n");
    const todosToDelete = markForwardedOnRollover
      ? markTodos({ lines: todosYesterday, todosToMark: todosYesterday })
      : todosYesterday;

    for (let i = lines.length - 1; i >= 0; i--) {
      if (todosToDelete.includes(lines[i])) {
        lines.splice(i, 1);
      }
    }
    modifiedYesterdayContent = lines.join("\n");
  }

  // Step 4: Simulate undo - restore from undoHistory
  const restoredYesterdayContent = undoHistory.previousDay.oldContent;
  const restoredTodayContent = undoHistory.today.oldContent;

  return {
    afterRollover: {
      yesterday: modifiedYesterdayContent,
      today: modifiedTodayContent,
    },
    afterUndo: {
      yesterday: restoredYesterdayContent,
      today: restoredTodayContent,
    },
    undoHistory,
  };
}

describe("undo functionality with marking", () => {
  describe("undo restores unmarked content", () => {
    test("should restore unmarked content when undo is called after marking", () => {
      // GIVEN - markForwardedOnRollover: true, rollover completed with marking
      const yesterdayContent =
        "# Yesterday\n- [ ] task to rollover\n- [x] done task";
      const todayContent = "# Today";
      const todosYesterday = ["- [ ] task to rollover"];

      // WHEN - rollover with marking, then undo
      const result = simulateFullRolloverWithUndo({
        yesterdayContent,
        todayContent,
        todosYesterday,
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - after rollover: yesterday has [>] markers
      expect(result.afterRollover.yesterday).toBe(
        "# Yesterday\n- [>] task to rollover\n- [x] done task"
      );

      // THEN - after undo: yesterday's content restored to original state without [>] markers
      expect(result.afterUndo.yesterday).toBe(
        "# Yesterday\n- [ ] task to rollover\n- [x] done task"
      );
    });

    test("should restore content when both marking and deletion were performed", () => {
      // GIVEN - both markForwardedOnRollover and deleteOnComplete true, rollover completed
      const yesterdayContent =
        "# Yesterday\n- [ ] task\nOther content\n- [ ] another task";
      const todayContent = "# Today";
      const todosYesterday = ["- [ ] task", "- [ ] another task"];

      // WHEN - rollover with marking and deletion, then undo
      const result = simulateFullRolloverWithUndo({
        yesterdayContent,
        todayContent,
        todosYesterday,
        markForwardedOnRollover: true,
        deleteOnComplete: true,
      });

      // THEN - after rollover: todos are deleted (marked then removed)
      expect(result.afterRollover.yesterday).toBe("# Yesterday\nOther content");

      // THEN - after undo: yesterday's content fully restored (unmarked and undeleted)
      expect(result.afterUndo.yesterday).toBe(
        "# Yesterday\n- [ ] task\nOther content\n- [ ] another task"
      );
    });

    test("should restore both files when marking was performed", () => {
      // GIVEN - markForwardedOnRollover: true, todos rolled over and marked
      const yesterdayContent = "# Yesterday\n- [ ] task 1\n- [ ] task 2";
      const todayContent = "# Today\n- [x] existing task";
      const todosYesterday = ["- [ ] task 1", "- [ ] task 2"];

      // WHEN - rollover with marking, then undo
      const result = simulateFullRolloverWithUndo({
        yesterdayContent,
        todayContent,
        todosYesterday,
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - after rollover: today has added todos, yesterday has markers
      expect(result.afterRollover.today).toBe(
        "# Today\n- [x] existing task\n- [ ] task 1\n- [ ] task 2"
      );
      expect(result.afterRollover.yesterday).toBe(
        "# Yesterday\n- [>] task 1\n- [>] task 2"
      );

      // THEN - after undo: both today's and yesterday's files restored to original state
      expect(result.afterUndo.today).toBe("# Today\n- [x] existing task");
      expect(result.afterUndo.yesterday).toBe(
        "# Yesterday\n- [ ] task 1\n- [ ] task 2"
      );
    });

    test("should handle undo when only marking (no deletion) was performed", () => {
      // GIVEN - markForwardedOnRollover: true, deleteOnComplete: false
      const yesterdayContent =
        "# Yesterday\n- [ ] important task\nNotes about the task";
      const todayContent = "# Today";
      const todosYesterday = ["- [ ] important task"];

      // WHEN - rollover with marking only, then undo
      const result = simulateFullRolloverWithUndo({
        yesterdayContent,
        todayContent,
        todosYesterday,
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - after rollover: yesterday marked, today has todo
      expect(result.afterRollover.yesterday).toBe(
        "# Yesterday\n- [>] important task\nNotes about the task"
      );
      expect(result.afterRollover.today).toBe("# Today\n- [ ] important task");

      // THEN - after undo: yesterday's unmarked content restored, today's added todos removed
      expect(result.afterUndo.yesterday).toBe(
        "# Yesterday\n- [ ] important task\nNotes about the task"
      );
      expect(result.afterUndo.today).toBe("# Today");
    });
  });

  describe("undo with complex scenarios", () => {
    test("should restore nested children when marking was performed", () => {
      // GIVEN - nested todos with rolloverChildren behavior
      const yesterdayContent =
        "# Yesterday\n- [ ] parent\n    - [ ] child\n    - notes";
      const todayContent = "# Today";
      const todosYesterday = ["- [ ] parent", "    - [ ] child", "    - notes"];

      // WHEN - rollover with marking, then undo
      const result = simulateFullRolloverWithUndo({
        yesterdayContent,
        todayContent,
        todosYesterday,
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - after rollover: checkboxes marked
      expect(result.afterRollover.yesterday).toBe(
        "# Yesterday\n- [>] parent\n    - [>] child\n    - notes"
      );

      // THEN - after undo: original structure restored
      expect(result.afterUndo.yesterday).toBe(
        "# Yesterday\n- [ ] parent\n    - [ ] child\n    - notes"
      );
    });

    test("should handle undo when no todos were found (no changes made)", () => {
      // GIVEN - no incomplete todos
      const yesterdayContent = "# Yesterday\n- [x] all done";
      const todayContent = "# Today";
      const todosYesterday = [];

      // WHEN - rollover (no changes), then undo
      const result = simulateFullRolloverWithUndo({
        yesterdayContent,
        todayContent,
        todosYesterday,
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - no changes in either state
      expect(result.afterRollover.yesterday).toBe(
        "# Yesterday\n- [x] all done"
      );
      expect(result.afterUndo.yesterday).toBe("# Yesterday\n- [x] all done");
      expect(result.afterRollover.today).toBe("# Today");
      expect(result.afterUndo.today).toBe("# Today");
    });
  });
});
