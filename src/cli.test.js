import { expect, test, describe, beforeEach, afterEach, vi } from "vitest";
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { rollover } from "./cli.js";

/**
 * Integration tests for CLI rollover marking functionality.
 * Tests the markForwardedOnRollover setting integration.
 */

describe("CLI rollover() marking integration", () => {
  const testVaultPath = join(process.cwd(), "test-vault-cli-marking");
  const dailyFolder = "daily";
  const dailyFolderPath = join(testVaultPath, dailyFolder);

  // Get today's and yesterday's date strings
  function getDateStrings() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const format = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

    return {
      today: format(today),
      yesterday: format(yesterday),
    };
  }

  beforeEach(() => {
    // Create test vault structure
    mkdirSync(dailyFolderPath, { recursive: true });
  });

  afterEach(() => {
    // Clean up test vault
    rmSync(testVaultPath, { recursive: true, force: true });
  });

  describe("markForwardedOnRollover behavior", () => {
    test("should mark todos in yesterday's note when markForwardedOnRollover is true", async () => {
      // GIVEN - yesterday's note with unchecked task, markForwardedOnRollover: true
      const { today, yesterday } = getDateStrings();

      const yesterdayContent =
        "# Yesterday\n- [ ] task to rollover\n- [x] done task";
      writeFileSync(join(dailyFolderPath, `${yesterday}.md`), yesterdayContent);
      writeFileSync(join(dailyFolderPath, `${today}.md`), "# Today");

      // WHEN - rollover() is called with markForwardedOnRollover: true
      await rollover(testVaultPath, {
        folder: dailyFolder,
        format: "YYYY-MM-DD",
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - yesterday's note contains '- [>] task to rollover'
      const yesterdayResult = readFileSync(
        join(dailyFolderPath, `${yesterday}.md`),
        "utf-8"
      );
      expect(yesterdayResult).toBe(
        "# Yesterday\n- [>] task to rollover\n- [x] done task"
      );
    });

    test("should not mark todos when markForwardedOnRollover is false", async () => {
      // GIVEN - yesterday's note with unchecked task, markForwardedOnRollover: false
      const { today, yesterday } = getDateStrings();

      const yesterdayContent = "# Yesterday\n- [ ] task to rollover";
      writeFileSync(join(dailyFolderPath, `${yesterday}.md`), yesterdayContent);
      writeFileSync(join(dailyFolderPath, `${today}.md`), "# Today");

      // WHEN - rollover() is called with markForwardedOnRollover: false
      await rollover(testVaultPath, {
        folder: dailyFolder,
        format: "YYYY-MM-DD",
        markForwardedOnRollover: false,
        deleteOnComplete: false,
      });

      // THEN - yesterday's note still contains '- [ ] task to rollover' (unchanged)
      const yesterdayResult = readFileSync(
        join(dailyFolderPath, `${yesterday}.md`),
        "utf-8"
      );
      expect(yesterdayResult).toBe("# Yesterday\n- [ ] task to rollover");
    });

    test("should mark todos by default when markForwardedOnRollover is not specified", async () => {
      // GIVEN - yesterday's note with unchecked task, no markForwardedOnRollover setting
      const { today, yesterday } = getDateStrings();

      const yesterdayContent = "# Yesterday\n- [ ] task";
      writeFileSync(join(dailyFolderPath, `${yesterday}.md`), yesterdayContent);
      writeFileSync(join(dailyFolderPath, `${today}.md`), "# Today");

      // WHEN - rollover() is called without markForwardedOnRollover setting
      await rollover(testVaultPath, {
        folder: dailyFolder,
        format: "YYYY-MM-DD",
        deleteOnComplete: false,
      });

      // THEN - yesterday's note remains unchanged (default is false for backward compatibility)
      const yesterdayResult = readFileSync(
        join(dailyFolderPath, `${yesterday}.md`),
        "utf-8"
      );
      expect(yesterdayResult).toBe("# Yesterday\n- [ ] task");
    });
  });

  describe("markForwardedOnRollover with deleteOnComplete interaction", () => {
    test("should mark then delete when both markForwardedOnRollover and deleteOnComplete are true", async () => {
      // GIVEN - yesterday's note with task, both settings true
      const { today, yesterday } = getDateStrings();

      const yesterdayContent =
        "# Yesterday\n- [ ] task to rollover\nSome other content";
      writeFileSync(join(dailyFolderPath, `${yesterday}.md`), yesterdayContent);
      writeFileSync(join(dailyFolderPath, `${today}.md`), "# Today");

      // WHEN - rollover() is called with both settings true
      await rollover(testVaultPath, {
        folder: dailyFolder,
        format: "YYYY-MM-DD",
        markForwardedOnRollover: true,
        deleteOnComplete: true,
      });

      // THEN - yesterday's note has the todo deleted (after marking internally)
      const yesterdayResult = readFileSync(
        join(dailyFolderPath, `${yesterday}.md`),
        "utf-8"
      );
      expect(yesterdayResult).toBe("# Yesterday\nSome other content");
    });

    test("should delete matching marked todos when both settings enabled", async () => {
      // GIVEN - yesterday's note with multiple todos, both settings true
      const { today, yesterday } = getDateStrings();

      const yesterdayContent =
        "# Yesterday\n- [ ] task one\n- [ ] task two\nOther content\n- [ ] task three";
      writeFileSync(join(dailyFolderPath, `${yesterday}.md`), yesterdayContent);
      writeFileSync(join(dailyFolderPath, `${today}.md`), "# Today");

      // WHEN - rollover() is called with both settings true
      await rollover(testVaultPath, {
        folder: dailyFolder,
        format: "YYYY-MM-DD",
        markForwardedOnRollover: true,
        deleteOnComplete: true,
      });

      // THEN - all rolled over todos are deleted (marking happened first internally)
      const yesterdayResult = readFileSync(
        join(dailyFolderPath, `${yesterday}.md`),
        "utf-8"
      );
      expect(yesterdayResult).toBe("# Yesterday\nOther content");
    });

    test("should delete without marking when only deleteOnComplete is true", async () => {
      // GIVEN - yesterday's note with task, only deleteOnComplete true
      const { today, yesterday } = getDateStrings();

      const yesterdayContent = "# Yesterday\n- [ ] task\nContent";
      writeFileSync(join(dailyFolderPath, `${yesterday}.md`), yesterdayContent);
      writeFileSync(join(dailyFolderPath, `${today}.md`), "# Today");

      // WHEN - rollover() is called with only deleteOnComplete true
      await rollover(testVaultPath, {
        folder: dailyFolder,
        format: "YYYY-MM-DD",
        markForwardedOnRollover: false,
        deleteOnComplete: true,
      });

      // THEN - task is deleted (no marking)
      const yesterdayResult = readFileSync(
        join(dailyFolderPath, `${yesterday}.md`),
        "utf-8"
      );
      expect(yesterdayResult).toBe("# Yesterday\nContent");
    });
  });

  describe("todos rolled to today", () => {
    test("should roll todos to today as unchanged [ ] format, never [>]", async () => {
      // GIVEN - yesterday's note with unchecked task, marking enabled
      const { today, yesterday } = getDateStrings();

      const yesterdayContent = "# Yesterday\n- [ ] task to rollover";
      writeFileSync(join(dailyFolderPath, `${yesterday}.md`), yesterdayContent);
      writeFileSync(join(dailyFolderPath, `${today}.md`), "# Today");

      // WHEN - rollover() is called with markForwardedOnRollover: true
      await rollover(testVaultPath, {
        folder: dailyFolder,
        format: "YYYY-MM-DD",
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - today's note has '- [ ] task to rollover' (unchanged, NOT [>])
      const todayResult = readFileSync(
        join(dailyFolderPath, `${today}.md`),
        "utf-8"
      );
      expect(todayResult).toContain("- [ ] task to rollover");
      expect(todayResult).not.toContain("- [>] task to rollover");
    });
  });

  describe("marking with rolloverChildren", () => {
    test("should mark parent and child checkboxes when rolloverChildren enabled", async () => {
      // GIVEN - yesterday's note with parent and children, rolloverChildren: true
      const { today, yesterday } = getDateStrings();

      const yesterdayContent =
        "# Yesterday\n- [ ] parent task\n    - [ ] child checkbox\n    - plain text child";
      writeFileSync(join(dailyFolderPath, `${yesterday}.md`), yesterdayContent);
      writeFileSync(join(dailyFolderPath, `${today}.md`), "# Today");

      // WHEN - rollover() with markForwardedOnRollover and rolloverChildren true
      await rollover(testVaultPath, {
        folder: dailyFolder,
        format: "YYYY-MM-DD",
        markForwardedOnRollover: true,
        rolloverChildren: true,
        deleteOnComplete: false,
      });

      // THEN - parent and checkbox children marked [>], plain text preserved
      const yesterdayResult = readFileSync(
        join(dailyFolderPath, `${yesterday}.md`),
        "utf-8"
      );
      expect(yesterdayResult).toBe(
        "# Yesterday\n- [>] parent task\n    - [>] child checkbox\n    - plain text child"
      );
    });
  });

  describe("preserve existing states", () => {
    test("should preserve completed and already-forwarded todos unchanged", async () => {
      // GIVEN - yesterday's note has completed [x] and already-forwarded [>] todos
      const { today, yesterday } = getDateStrings();

      const yesterdayContent =
        "# Yesterday\n- [x] completed task\n- [>] already forwarded\n- [ ] unchecked task";
      writeFileSync(join(dailyFolderPath, `${yesterday}.md`), yesterdayContent);
      writeFileSync(join(dailyFolderPath, `${today}.md`), "# Today");

      // WHEN - rollover() is called with markForwardedOnRollover: true
      await rollover(testVaultPath, {
        folder: dailyFolder,
        format: "YYYY-MM-DD",
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - completed and already-forwarded todos remain unchanged, only [ ] becomes [>]
      const yesterdayResult = readFileSync(
        join(dailyFolderPath, `${yesterday}.md`),
        "utf-8"
      );
      expect(yesterdayResult).toBe(
        "# Yesterday\n- [x] completed task\n- [>] already forwarded\n- [>] unchecked task"
      );

      // AND - only the unchecked todo is rolled to today (not completed or already-forwarded)
      const todayResult = readFileSync(
        join(dailyFolderPath, `${today}.md`),
        "utf-8"
      );
      expect(todayResult).toContain("- [ ] unchecked task");
      expect(todayResult).not.toContain("completed task");
      expect(todayResult).not.toContain("already forwarded");
    });

    test("should not double-mark an already forwarded todo", async () => {
      // GIVEN - yesterday's note has a todo that was already marked [>] in a previous rollover
      const { today, yesterday } = getDateStrings();

      const yesterdayContent = "# Yesterday\n- [>] already forwarded task";
      writeFileSync(join(dailyFolderPath, `${yesterday}.md`), yesterdayContent);
      writeFileSync(join(dailyFolderPath, `${today}.md`), "# Today");

      // WHEN - rollover() is called (simulating a second run)
      await rollover(testVaultPath, {
        folder: dailyFolder,
        format: "YYYY-MM-DD",
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - the [>] task remains unchanged (not rolled, not modified)
      const yesterdayResult = readFileSync(
        join(dailyFolderPath, `${yesterday}.md`),
        "utf-8"
      );
      expect(yesterdayResult).toBe("# Yesterday\n- [>] already forwarded task");

      // AND - today's note should NOT have the already-forwarded task
      const todayResult = readFileSync(
        join(dailyFolderPath, `${today}.md`),
        "utf-8"
      );
      expect(todayResult).toBe("# Today");
    });
  });

  describe("edge cases", () => {
    test("should not modify yesterday's note when no todos found", async () => {
      // GIVEN - yesterday's note with no unchecked todos
      const { today, yesterday } = getDateStrings();

      const yesterdayContent = "# Yesterday\n- [x] all done";
      writeFileSync(join(dailyFolderPath, `${yesterday}.md`), yesterdayContent);
      writeFileSync(join(dailyFolderPath, `${today}.md`), "# Today");

      // WHEN - rollover() with markForwardedOnRollover: true
      await rollover(testVaultPath, {
        folder: dailyFolder,
        format: "YYYY-MM-DD",
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - yesterday's note unchanged
      const yesterdayResult = readFileSync(
        join(dailyFolderPath, `${yesterday}.md`),
        "utf-8"
      );
      expect(yesterdayResult).toBe("# Yesterday\n- [x] all done");
    });

    test("should handle marking only once (no double marking)", async () => {
      // GIVEN - yesterday's note with todo
      const { today, yesterday } = getDateStrings();

      const yesterdayContent = "# Yesterday\n- [ ] task";
      writeFileSync(join(dailyFolderPath, `${yesterday}.md`), yesterdayContent);
      writeFileSync(join(dailyFolderPath, `${today}.md`), "# Today");

      // WHEN - rollover() with markForwardedOnRollover: true
      await rollover(testVaultPath, {
        folder: dailyFolder,
        format: "YYYY-MM-DD",
        markForwardedOnRollover: true,
        deleteOnComplete: false,
      });

      // THEN - yesterday's note has [>] only once
      const yesterdayResult = readFileSync(
        join(dailyFolderPath, `${yesterday}.md`),
        "utf-8"
      );
      expect(yesterdayResult).toBe("# Yesterday\n- [>] task");
      expect(yesterdayResult.match(/\[>\]/g)?.length).toBe(1);
    });
  });
});
