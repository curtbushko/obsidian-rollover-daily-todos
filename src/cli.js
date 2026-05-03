import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { getTodos } from './get-todos.js';

// Simple date formatting supporting multiple formats
function formatDate(date, format = 'YYYY-MM-DD') {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  if (format === 'YYYYMMDD') {
    return `${year}${month}${day}`;
  }
  // Default YYYY-MM-DD
  return `${year}-${month}-${day}`;
}

// Parse date from various formats
function parseDate(dateStr, format = 'YYYY-MM-DD') {
  let year, month, day;

  if (format === 'YYYYMMDD' && /^\d{8}$/.test(dateStr)) {
    year = parseInt(dateStr.substring(0, 4), 10);
    month = parseInt(dateStr.substring(4, 6), 10);
    day = parseInt(dateStr.substring(6, 8), 10);
  } else {
    // Try YYYY-MM-DD format
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3) {
      [year, month, day] = parts;
    } else {
      return null;
    }
  }

  return new Date(year, month - 1, day);
}

// Get all daily note files
function getDailyNoteFiles(vaultPath, folder, format = 'YYYY-MM-DD') {
  const dailyNotesPath = join(vaultPath, folder);
  const files = readdirSync(dailyNotesPath)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const path = join(dailyNotesPath, f);
      const name = basename(f, '.md');
      return { path, name };
    })
    .filter(f => {
      // Check if filename matches expected format
      if (format === 'YYYYMMDD') {
        return /^\d{8}$/.test(f.name);
      }
      // Default YYYY-MM-DD format
      return /^(\d{4})-(\d{2})-(\d{2})$/.test(f.name);
    });

  return files;
}

// Get the last daily note before today
function getLastDailyNote(vaultPath, folder, format = 'YYYY-MM-DD') {
  const files = getDailyNoteFiles(vaultPath, folder, format);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter files that are before today and sort by date descending
  const validFiles = files
    .map(f => ({
      ...f,
      date: parseDate(f.name, format)
    }))
    .filter(f => f.date && f.date < today)
    .sort((a, b) => b.date - a.date);

  // Return the most recent (yesterday or earlier)
  return validFiles.length > 0 ? validFiles[0] : null;
}

// Get today's daily note
function getTodaysDailyNote(vaultPath, folder, format = 'YYYY-MM-DD') {
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
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n|\r|\n/g);

  return getTodos({
    lines,
    withChildren: settings.rolloverChildren || false,
    doneStatusMarkers: settings.doneStatusMarkers || 'xX-'
  });
}

// Main rollover function
async function rollover(vaultPath, settings = {}) {
  const folder = settings.folder || 'daily';
  const format = settings.format || 'YYYY-MM-DD';
  const templateHeading = settings.templateHeading || 'none';
  const deleteOnComplete = settings.deleteOnComplete || false;
  const removeEmptyTodos = settings.removeEmptyTodos || false;
  const leadingNewLine = settings.leadingNewLine !== false;

  // Get today's daily note
  const todayFile = getTodaysDailyNote(vaultPath, folder, format);
  if (!todayFile) {
    console.log('Today\'s daily note not found');
    return;
  }

  // Get last daily note
  const lastDailyNote = getLastDailyNote(vaultPath, folder, format);
  if (!lastDailyNote) {
    console.log('No previous daily note found');
    return;
  }

  // Get unfinished todos from yesterday
  const todosYesterday = getAllUnfinishedTodos(lastDailyNote.path, settings);

  console.log(`Found ${todosYesterday.length} todos in ${lastDailyNote.name}.md`);

  if (todosYesterday.length === 0) {
    return;
  }

  // Filter empty todos if needed
  let todosToday = todosYesterday;
  let todosAdded = todosYesterday.length;
  let emptiesToNotAddToTomorrow = 0;

  if (removeEmptyTodos) {
    todosToday = [];
    todosYesterday.forEach(line => {
      const trimmedLine = (line || '').trim();
      if (trimmedLine !== '- [ ]' && trimmedLine !== '- [  ]') {
        todosToday.push(line);
        todosAdded++;
      } else {
        emptiesToNotAddToTomorrow++;
      }
    });
  }

  if (todosToday.length === 0) {
    console.log('No todos to rollover after filtering empty todos');
    return;
  }

  // Read today's daily note content
  let dailyNoteContent = readFileSync(todayFile.path, 'utf-8');
  const todosString = `\n${todosToday.join('\n')}`;

  // Try to add under template heading if specified
  let templateHeadingNotFoundMessage = '';
  const templateHeadingSelected = templateHeading !== 'none';

  if (templateHeadingSelected) {
    const contentAddedToHeading = dailyNoteContent.replace(
      templateHeading,
      `${templateHeading}${leadingNewLine ? '\n' : ''}${todosString}`
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
  writeFileSync(todayFile.path, dailyNoteContent, 'utf-8');

  // Delete from yesterday if needed
  if (deleteOnComplete) {
    let lastDailyNoteContent = readFileSync(lastDailyNote.path, 'utf-8');
    let lines = lastDailyNoteContent.split('\n');

    for (let i = lines.length - 1; i >= 0; i--) {
      if (todosYesterday.includes(lines[i])) {
        lines.splice(i, 1);
      }
    }

    const modifiedContent = lines.join('\n');
    writeFileSync(lastDailyNote.path, modifiedContent, 'utf-8');
  }

  // Report results
  const parts = [];

  if (templateHeadingNotFoundMessage) {
    parts.push(templateHeadingNotFoundMessage);
  }

  if (todosAdded > 0) {
    parts.push(`${todosAdded} todo${todosAdded > 1 ? 's' : ''} rolled over.`);
  }

  if (emptiesToNotAddToTomorrow > 0) {
    const action = deleteOnComplete ? 'removed' : 'skipped';
    parts.push(`${emptiesToNotAddToTomorrow} empty todo${emptiesToNotAddToTomorrow > 1 ? 's' : ''} ${action}.`);
  }

  if (parts.length > 0) {
    console.log(parts.join('\n'));
  }
}

// Load plugin settings from data.json
function loadSettings(vaultPath) {
  const settingsPath = join(vaultPath, '.obsidian', 'plugins', 'obsidian-rollover-daily-todos', 'data.json');

  try {
    const data = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    return data;
  } catch (err) {
    console.log('Using default plugin settings (no data.json found)');
    return {};
  }
}

// Load Obsidian daily notes settings
function loadDailyNotesSettings(vaultPath) {
  const dailyNotesPath = join(vaultPath, '.obsidian', 'daily-notes.json');

  try {
    const data = JSON.parse(readFileSync(dailyNotesPath, 'utf-8'));
    return {
      folder: data.folder || 'daily',
      format: data.format || 'YYYY-MM-DD',
      template: data.template || ''
    };
  } catch (err) {
    console.log('Using default daily notes settings');
    return {
      folder: 'daily',
      format: 'YYYY-MM-DD',
      template: ''
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
    ...pluginSettings
  };

  rollover(vaultPath, settings)
    .then(() => {
      console.log('Rollover complete');
    })
    .catch(err => {
      console.error('Error during rollover:', err);
      process.exit(1);
    });
}

export { rollover, getAllUnfinishedTodos };
