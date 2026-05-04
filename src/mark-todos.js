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
export const markTodos = ({ lines, todosToMark }) => {
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
