import { expect, test, describe } from "vitest";
import { markTodos } from "./mark-todos";

describe("markTodos", () => {
  test("should mark single todo with [>]", () => {
    // GIVEN - lines with single todo and todosToMark containing that line
    const lines = ["- [ ] task"];
    const todosToMark = ["- [ ] task"];

    // WHEN - markTodos() is called
    const result = markTodos({ lines, todosToMark });

    // THEN - returns lines with '- [>] task'
    expect(result).toStrictEqual(["- [>] task"]);
  });

  test("should preserve indentation when marking todos", () => {
    // GIVEN - lines with indented todos
    const lines = ["    - [ ] nested task"];
    const todosToMark = ["    - [ ] nested task"];

    // WHEN - markTodos() is called
    const result = markTodos({ lines, todosToMark });

    // THEN - returns '    - [>] nested task' with indentation preserved
    expect(result).toStrictEqual(["    - [>] nested task"]);
  });

  test("should only mark todos in the todosToMark list", () => {
    // GIVEN - multiple todos but only some in todosToMark list
    const lines = ["- [ ] task one", "- [ ] task two", "- [ ] task three"];
    const todosToMark = ["- [ ] task two"];

    // WHEN - markTodos() is called
    const result = markTodos({ lines, todosToMark });

    // THEN - only todos in todosToMark are marked with [>]
    expect(result).toStrictEqual([
      "- [ ] task one",
      "- [>] task two",
      "- [ ] task three",
    ]);
  });

  test("should preserve rest of line content", () => {
    // GIVEN - todo line with extra content
    const lines = ["- [ ] task with extra content"];
    const todosToMark = ["- [ ] task with extra content"];

    // WHEN - markTodos() is called
    const result = markTodos({ lines, todosToMark });

    // THEN - returns '- [>] task with extra content' with content preserved
    expect(result).toStrictEqual(["- [>] task with extra content"]);
  });

  test("should handle alternate bullet symbols", () => {
    // GIVEN - todos with + and * bullets
    const lines = ["+ [ ] task", "* [ ] task"];
    const todosToMark = ["+ [ ] task", "* [ ] task"];

    // WHEN - markTodos() is called
    const result = markTodos({ lines, todosToMark });

    // THEN - returns '+ [>] task' and '* [>] task'
    expect(result).toStrictEqual(["+ [>] task", "* [>] task"]);
  });

  test("should not modify already forwarded tasks", () => {
    // GIVEN - line '- [>] already forwarded' in todosToMark
    const lines = ["- [>] already forwarded"];
    const todosToMark = ["- [>] already forwarded"];

    // WHEN - markTodos() is called
    const result = markTodos({ lines, todosToMark });

    // THEN - line remains '- [>] already forwarded'
    expect(result).toStrictEqual(["- [>] already forwarded"]);
  });

  test("should not modify completed tasks", () => {
    // GIVEN - line '- [x] completed' in todosToMark
    const lines = ["- [x] completed"];
    const todosToMark = ["- [x] completed"];

    // WHEN - markTodos() is called
    const result = markTodos({ lines, todosToMark });

    // THEN - line remains '- [x] completed'
    expect(result).toStrictEqual(["- [x] completed"]);
  });

  test("should handle empty todosToMark list", () => {
    // GIVEN - lines with todos but empty todosToMark
    const lines = ["- [ ] task one", "- [ ] task two"];
    const todosToMark = [];

    // WHEN - markTodos() is called
    const result = markTodos({ lines, todosToMark });

    // THEN - no todos are marked
    expect(result).toStrictEqual(["- [ ] task one", "- [ ] task two"]);
  });

  test("should handle lines with no todos", () => {
    // GIVEN - lines with non-todo content
    const lines = ["# Header", "Some text", "- regular bullet"];
    const todosToMark = [];

    // WHEN - markTodos() is called
    const result = markTodos({ lines, todosToMark });

    // THEN - lines are returned unchanged
    expect(result).toStrictEqual(["# Header", "Some text", "- regular bullet"]);
  });

  test("should handle mixed content with todos and text", () => {
    // GIVEN - lines with mixed content
    const lines = ["# Header", "- [ ] task one", "Some text", "- [ ] task two"];
    const todosToMark = ["- [ ] task one"];

    // WHEN - markTodos() is called
    const result = markTodos({ lines, todosToMark });

    // THEN - only specified todo is marked
    expect(result).toStrictEqual([
      "# Header",
      "- [>] task one",
      "Some text",
      "- [ ] task two",
    ]);
  });

  // Child todo handling tests
  describe("child todo handling", () => {
    test("should mark child checkbox todos", () => {
      // GIVEN - parent todo with child checkboxes in todosToMark
      const lines = ["- [ ] parent", "    - [ ] child"];
      const todosToMark = ["- [ ] parent", "    - [ ] child"];

      // WHEN - markTodos() is called
      const result = markTodos({ lines, todosToMark });

      // THEN - both are marked with [>]
      expect(result).toStrictEqual(["- [>] parent", "    - [>] child"]);
    });

    test("should preserve plain text children", () => {
      // GIVEN - parent todo with plain text child in todosToMark
      const lines = ["- [ ] parent", "    - plain text"];
      const todosToMark = ["- [ ] parent", "    - plain text"];

      // WHEN - markTodos() is called
      const result = markTodos({ lines, todosToMark });

      // THEN - parent marked, child unchanged
      expect(result).toStrictEqual(["- [>] parent", "    - plain text"]);
    });

    test("should handle mixed child types", () => {
      // GIVEN - parent with both checkbox and plain text children in todosToMark
      const lines = [
        "- [ ] parent",
        "    - [ ] checkbox child",
        "    - plain text child",
        "    - another plain item",
      ];
      const todosToMark = [
        "- [ ] parent",
        "    - [ ] checkbox child",
        "    - plain text child",
        "    - another plain item",
      ];

      // WHEN - markTodos() is called
      const result = markTodos({ lines, todosToMark });

      // THEN - checkboxes marked with [>], plain text preserved
      expect(result).toStrictEqual([
        "- [>] parent",
        "    - [>] checkbox child",
        "    - plain text child",
        "    - another plain item",
      ]);
    });

    test("should handle nested children at different indentation levels", () => {
      // GIVEN - todo with multiple levels of children
      const lines = [
        "- [ ] level 1",
        "    - [ ] level 2 checkbox",
        "    - plain text level 2",
        "        - [ ] level 3 checkbox",
        "        - plain text level 3",
      ];
      const todosToMark = [
        "- [ ] level 1",
        "    - [ ] level 2 checkbox",
        "    - plain text level 2",
        "        - [ ] level 3 checkbox",
        "        - plain text level 3",
      ];

      // WHEN - markTodos() is called
      const result = markTodos({ lines, todosToMark });

      // THEN - all checkbox items marked, all plain text preserved, indentation maintained
      expect(result).toStrictEqual([
        "- [>] level 1",
        "    - [>] level 2 checkbox",
        "    - plain text level 2",
        "        - [>] level 3 checkbox",
        "        - plain text level 3",
      ]);
    });

    test("should handle completed child checkboxes", () => {
      // GIVEN - parent with completed child in todosToMark
      const lines = ["- [ ] parent", "    - [x] completed child"];
      const todosToMark = ["- [ ] parent", "    - [x] completed child"];

      // WHEN - markTodos() is called
      const result = markTodos({ lines, todosToMark });

      // THEN - parent marked with [>], completed child remains [x]
      expect(result).toStrictEqual([
        "- [>] parent",
        "    - [x] completed child",
      ]);
    });

    test("should handle already forwarded child checkboxes", () => {
      // GIVEN - parent with already forwarded child in todosToMark
      const lines = ["- [ ] parent", "    - [>] already forwarded child"];
      const todosToMark = ["- [ ] parent", "    - [>] already forwarded child"];

      // WHEN - markTodos() is called
      const result = markTodos({ lines, todosToMark });

      // THEN - parent marked with [>], forwarded child remains [>]
      expect(result).toStrictEqual([
        "- [>] parent",
        "    - [>] already forwarded child",
      ]);
    });

    test("should handle deeply nested mixed content", () => {
      // GIVEN - complex nested structure with various child types
      const lines = [
        "- [ ] top level",
        "    - [ ] nested checkbox",
        "    - plain text note",
        "        - [ ] deep checkbox",
        "        - [x] deep completed",
        "            - [ ] very deep checkbox",
        "            - very deep plain text",
      ];
      const todosToMark = [
        "- [ ] top level",
        "    - [ ] nested checkbox",
        "    - plain text note",
        "        - [ ] deep checkbox",
        "        - [x] deep completed",
        "            - [ ] very deep checkbox",
        "            - very deep plain text",
      ];

      // WHEN - markTodos() is called
      const result = markTodos({ lines, todosToMark });

      // THEN - only unchecked checkboxes are marked, everything else preserved
      expect(result).toStrictEqual([
        "- [>] top level",
        "    - [>] nested checkbox",
        "    - plain text note",
        "        - [>] deep checkbox",
        "        - [x] deep completed",
        "            - [>] very deep checkbox",
        "            - very deep plain text",
      ]);
    });
  });
});
