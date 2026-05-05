#!/usr/bin/env node
import { readFileSync, writeFileSync, statSync, readdirSync } from 'fs';
import { join, basename } from 'path';

class TodoParser {
  // Support all unordered list bullet symbols as per spec (https://daringfireball.net/projects/markdown/syntax#list)
  bulletSymbols = ["-", "*", "+"];

  // Default completed status markers
  doneStatusMarkers = ["x", "X", "-"];

  // List of strings that include the Markdown content
  #lines;

  // Boolean that encodes whether nested items should be rolled over
  #withChildren;

  // Parse content with segmentation to allow for Unicode grapheme clusters
  #parseIntoChars(content, contentType = "content") {
    // Use Intl.Segmenter to properly split grapheme clusters if available,
    // otherwise fall back to Array.from. The fallback should not trigger in
    // Obsidian since it uses Electron which supports Intl.Segmenter.
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
      return Array.from(segmenter.segment(content), (s) => s.segment);
    } else {
      // Array.from() splits surrogate pairs correctly but not complex grapheme clusters
      // (e.g., 👨‍👩‍👧‍👦 would be split incorrectly) and fail to match.
      console.error(
        `Intl.Segmenter not available, falling back to Array.from() for ${contentType}`
      );
      return Array.from(content);
    }
  }

  constructor(lines, withChildren, doneStatusMarkers) {
    this.#lines = lines;
    this.#withChildren = withChildren;
    if (doneStatusMarkers) {
      this.doneStatusMarkers = this.#parseIntoChars(
        doneStatusMarkers,
        "done status markers"
      );
    }
  }

  // Returns true if string s is a todo-item
  #isTodo(s) {
    // Extract the checkbox content
    const match = s.match(/\s*[*+-] \[(.+?)\]/);
    if (!match) return false;

    const checkboxContent = match[1];

    // Parse content with segmentation to allow for Unicode grapheme clusters
    const contentChars = this.#parseIntoChars(
      checkboxContent,
      "checkbox content"
    );

    // Valid checkbox content must be exactly one grapheme cluster
    if (contentChars.length !== 1) {
      return false;
    }

    const singleChar = contentChars[0];

    // Exclude grapheme modifiers that are not valid as standalone content
    const graphemeModifiers = ["\u202E", "\u200B", "\u200C", "\u200D"];
    const hasGraphemeModifier = contentChars.some((char) =>
      graphemeModifiers.includes(char)
    );
    if (hasGraphemeModifier) {
      return false;
    }

    // Check if the checkbox content contains any characters that are in doneStatusMarkers
    const hasDoneMarker = contentChars.some((char) =>
      this.doneStatusMarkers.includes(char)
    );

    // Exclude forwarded tasks marked with [>] (hardcoded, separate from doneStatusMarkers)
    if (singleChar === ">") {
      return false;
    }

    // Return true (is a todo) if it does NOT contain any done markers
    return !hasDoneMarker;
  }

  // Returns true if line after line-number `l` is a nested item
  #hasChildren(l) {
    if (l + 1 >= this.#lines.length) {
      return false;
    }
    const indCurr = this.#getIndentation(l);
    const indNext = this.#getIndentation(l + 1);
    if (indNext > indCurr) {
      return true;
    }
    return false;
  }

  // Returns a list of strings that are the nested items after line `parentLinum`
  #getChildren(parentLinum) {
    const children = [];
    let nextLinum = parentLinum + 1;
    while (this.#isChildOf(parentLinum, nextLinum)) {
      children.push(this.#lines[nextLinum]);
      nextLinum++;
    }
    return children;
  }

  // Returns true if line `linum` has more indentation than line `parentLinum`
  #isChildOf(parentLinum, linum) {
    if (parentLinum >= this.#lines.length || linum >= this.#lines.length) {
      return false;
    }
    return this.#getIndentation(linum) > this.#getIndentation(parentLinum);
  }

  // Returns the number of whitespace-characters at beginning of string at line `l`
  #getIndentation(l) {
    return this.#lines[l].search(/\S/);
  }

  // Returns a list of strings that represents all the todos along with there potential children
  getTodos() {
    let todos = [];
    for (let l = 0; l < this.#lines.length; l++) {
      const line = this.#lines[l];
      if (this.#isTodo(line)) {
        todos.push(line);
        if (this.#withChildren && this.#hasChildren(l)) {
          const cs = this.#getChildren(l);
          todos = [...todos, ...cs];
          l += cs.length;
        }
      }
    }
    return todos;
  }
}

// Utility-function that acts as a thin wrapper around `TodoParser`
const getTodos = ({
  lines,
  withChildren = false,
  doneStatusMarkers = null,
}) => {
  const todoParser = new TodoParser(lines, withChildren, doneStatusMarkers);
  return todoParser.getTodos();
};

/**
 * Marks todos as forwarded by replacing [ ] with [>] for todos in the todosToMark list.
 *
 * Child handling behavior:
 * - Child checkbox items (e.g., "    - [ ] task") are marked with [>]
 * - Plain text children (e.g., "    - plain text") are preserved unchanged
 * - Completed [x] or already forwarded [>] checkboxes are not modified
 * - Works at any indentation level
 *
 * @param {Object} options - The options object
 * @param {string[]} options.lines - Array of lines from the note
 * @param {string[]} options.todosToMark - Array of todo lines that should be marked as forwarded
 * @returns {string[]} - Array of lines with specified todos marked as forwarded
 */
const markTodos = ({ lines, todosToMark }) => {
  // Create a Set for O(1) lookup of todos to mark
  const todosSet = new Set(todosToMark);

  return lines.map((line) => {
    // Check if this line is in the todosToMark list
    if (todosSet.has(line)) {
      // Only replace [ ] (unchecked) with [>], not already marked or completed todos
      // This regex matches: optional whitespace, bullet symbol (-, +, *), space, [ ]
      // and preserves everything else (indentation, bullet type, rest of content)
      const replaced = line.replace(/^(\s*[*+-] )\[ \](.*)$/, "$1[>]$2");
      return replaced;
    }
    return line;
  });
};

// Simple date formatting supporting multiple formats
function formatDate(date, format = "YYYY-MM-DD") {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (format === "YYYYMMDD") {
    return `${year}${month}${day}`;
  }
  // Default YYYY-MM-DD
  return `${year}-${month}-${day}`;
}

// Parse date from various formats
function parseDate(dateStr, format = "YYYY-MM-DD") {
  let year, month, day;

  if (format === "YYYYMMDD" && /^\d{8}$/.test(dateStr)) {
    year = parseInt(dateStr.substring(0, 4), 10);
    month = parseInt(dateStr.substring(4, 6), 10);
    day = parseInt(dateStr.substring(6, 8), 10);
  } else {
    // Try YYYY-MM-DD format
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      [year, month, day] = parts;
    } else {
      return null;
    }
  }

  return new Date(year, month - 1, day);
}

// Get all daily note files
function getDailyNoteFiles(vaultPath, folder, format = "YYYY-MM-DD") {
  const dailyNotesPath = join(vaultPath, folder);
  const files = readdirSync(dailyNotesPath)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const path = join(dailyNotesPath, f);
      const name = basename(f, ".md");
      return { path, name };
    })
    .filter((f) => {
      // Check if filename matches expected format
      if (format === "YYYYMMDD") {
        return /^\d{8}$/.test(f.name);
      }
      // Default YYYY-MM-DD format
      return /^(\d{4})-(\d{2})-(\d{2})$/.test(f.name);
    });

  return files;
}

// Get the last daily note before today
function getLastDailyNote(vaultPath, folder, format = "YYYY-MM-DD") {
  const files = getDailyNoteFiles(vaultPath, folder, format);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter files that are before today and sort by date descending
  const validFiles = files
    .map((f) => ({
      ...f,
      date: parseDate(f.name, format),
    }))
    .filter((f) => f.date && f.date < today)
    .sort((a, b) => b.date - a.date);

  // Return the most recent (yesterday or earlier)
  return validFiles.length > 0 ? validFiles[0] : null;
}

// Get today's daily note
function getTodaysDailyNote(vaultPath, folder, format = "YYYY-MM-DD") {
  const today = formatDate(new Date(), format);
  const path = join(vaultPath, folder, `${today}.md`);

  try {
    statSync(path);
    return { path, name: today };
  } catch (err) {
    return null;
  }
}

// Get unfinished todos from a file
function getAllUnfinishedTodos(filePath, settings) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n|\r|\n/g);

  return getTodos({
    lines,
    withChildren: settings.rolloverChildren || false,
    doneStatusMarkers: settings.doneStatusMarkers || "xX-",
  });
}

// Main rollover function
async function rollover(vaultPath, settings = {}) {
  const folder = settings.folder || "daily";
  const format = settings.format || "YYYY-MM-DD";
  const templateHeading = settings.templateHeading || "none";
  const deleteOnComplete = settings.deleteOnComplete || false;
  const removeEmptyTodos = settings.removeEmptyTodos || false;
  const leadingNewLine = settings.leadingNewLine !== false;
  const markForwardedOnRollover = settings.markForwardedOnRollover || false;

  // Get today's daily note
  const todayFile = getTodaysDailyNote(vaultPath, folder, format);
  if (!todayFile) {
    console.log("Today's daily note not found");
    return;
  }

  // Get last daily note
  const lastDailyNote = getLastDailyNote(vaultPath, folder, format);
  if (!lastDailyNote) {
    console.log("No previous daily note found");
    return;
  }

  // Get unfinished todos from yesterday
  const todosYesterday = getAllUnfinishedTodos(lastDailyNote.path, settings);

  console.log(
    `Found ${todosYesterday.length} todos in ${lastDailyNote.name}.md`
  );

  if (todosYesterday.length === 0) {
    return;
  }

  // Filter empty todos if needed
  let todosToday = todosYesterday;
  let todosAdded = todosYesterday.length;
  let emptiesToNotAddToTomorrow = 0;

  if (removeEmptyTodos) {
    todosToday = [];
    todosYesterday.forEach((line) => {
      const trimmedLine = (line || "").trim();
      if (trimmedLine !== "- [ ]" && trimmedLine !== "- [  ]") {
        todosToday.push(line);
        todosAdded++;
      } else {
        emptiesToNotAddToTomorrow++;
      }
    });
  }

  if (todosToday.length === 0) {
    console.log("No todos to rollover after filtering empty todos");
    return;
  }

  // Read today's daily note content
  let dailyNoteContent = readFileSync(todayFile.path, "utf-8");
  const todosString = `\n${todosToday.join("\n")}`;

  // Try to add under template heading if specified
  let templateHeadingNotFoundMessage = "";
  const templateHeadingSelected = templateHeading !== "none";

  if (templateHeadingSelected) {
    const contentAddedToHeading = dailyNoteContent.replace(
      templateHeading,
      `${templateHeading}${leadingNewLine ? "\n" : ""}${todosString}`
    );

    if (contentAddedToHeading === dailyNoteContent) {
      templateHeadingNotFoundMessage = `Rollover couldn't find '${templateHeading}' in today's daily note. Rolling todos to end of file.`;
      dailyNoteContent += todosString;
    } else {
      dailyNoteContent = contentAddedToHeading;
    }
  } else {
    dailyNoteContent += todosString;
  }

  // Write updated today's note
  writeFileSync(todayFile.path, dailyNoteContent, "utf-8");

  // Handle marking and/or deletion of yesterday's todos
  if (markForwardedOnRollover || deleteOnComplete) {
    let lastDailyNoteContent = readFileSync(lastDailyNote.path, "utf-8");
    let modifiedContent = lastDailyNoteContent;

    // Mark forwarded todos if enabled (must happen before deletion)
    if (markForwardedOnRollover) {
      const lines = modifiedContent.split("\n");
      const markedLines = markTodos({
        lines,
        todosToMark: todosYesterday,
      });
      modifiedContent = markedLines.join("\n");
    }

    // Delete todos if enabled (operates on potentially marked content)
    if (deleteOnComplete) {
      let lines = modifiedContent.split("\n");

      // When marking is enabled, match against marked versions for deletion
      const todosToDelete = markForwardedOnRollover
        ? markTodos({
            lines: todosYesterday,
            todosToMark: todosYesterday,
          })
        : todosYesterday;

      for (let i = lines.length - 1; i >= 0; i--) {
        if (todosToDelete.includes(lines[i])) {
          lines.splice(i, 1);
        }
      }
      modifiedContent = lines.join("\n");
    }

    writeFileSync(lastDailyNote.path, modifiedContent, "utf-8");
  }

  // Report results
  const parts = [];

  if (templateHeadingNotFoundMessage) {
    parts.push(templateHeadingNotFoundMessage);
  }

  if (todosAdded > 0) {
    parts.push(`${todosAdded} todo${todosAdded > 1 ? "s" : ""} rolled over.`);
  }

  if (emptiesToNotAddToTomorrow > 0) {
    const action = deleteOnComplete ? "removed" : "skipped";
    parts.push(
      `${emptiesToNotAddToTomorrow} empty todo${
        emptiesToNotAddToTomorrow > 1 ? "s" : ""
      } ${action}.`
    );
  }

  if (parts.length > 0) {
    console.log(parts.join("\n"));
  }
}

// Load plugin settings from data.json
function loadSettings(vaultPath) {
  const settingsPath = join(
    vaultPath,
    ".obsidian",
    "plugins",
    "obsidian-rollover-daily-todos",
    "data.json"
  );

  try {
    const data = JSON.parse(readFileSync(settingsPath, "utf-8"));
    return data;
  } catch (err) {
    console.log("Using default plugin settings (no data.json found)");
    return {};
  }
}

// Load Obsidian daily notes settings
function loadDailyNotesSettings(vaultPath) {
  const dailyNotesPath = join(vaultPath, ".obsidian", "daily-notes.json");

  try {
    const data = JSON.parse(readFileSync(dailyNotesPath, "utf-8"));
    return {
      folder: data.folder || "daily",
      format: data.format || "YYYY-MM-DD",
      template: data.template || "",
    };
  } catch (err) {
    console.log("Using default daily notes settings");
    return {
      folder: "daily",
      format: "YYYY-MM-DD",
      template: "",
    };
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const vaultPath = process.cwd();
  const pluginSettings = loadSettings(vaultPath);
  const dailyNotesSettings = loadDailyNotesSettings(vaultPath);

  // Merge settings: daily notes settings for folder/format, plugin settings for behavior
  const settings = {
    ...dailyNotesSettings,
    ...pluginSettings,
  };

  rollover(vaultPath, settings)
    .then(() => {
      console.log("Rollover complete");
    })
    .catch((err) => {
      console.error("Error during rollover:", err);
      process.exit(1);
    });
}

export { getAllUnfinishedTodos, rollover };
