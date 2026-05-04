/**
 * Mock for the Obsidian module.
 * This provides stub implementations of Obsidian classes for testing.
 */

export class PluginSettingTab {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = { empty: () => {} };
  }
}

export class Setting {
  constructor(containerEl) {
    this.containerEl = containerEl;
  }

  setName(name) {
    this._name = name;
    return this;
  }

  setDesc(desc) {
    this._desc = desc;
    return this;
  }

  addToggle(cb) {
    const toggle = {
      setValue: function (value) {
        this._value = value;
        return this;
      },
      onChange: function (cb) {
        this._onChange = cb;
        return this;
      },
    };
    cb(toggle);
    this._toggle = toggle;
    return this;
  }

  addText(cb) {
    const text = {
      setValue: function (value) {
        this._value = value;
        return this;
      },
      onChange: function (cb) {
        this._onChange = cb;
        return this;
      },
    };
    cb(text);
    this._text = text;
    return this;
  }

  addDropdown(cb) {
    const dropdown = {
      addOptions: function (options) {
        this._options = options;
        return this;
      },
      setValue: function (value) {
        this._value = value;
        return this;
      },
      onChange: function (cb) {
        this._onChange = cb;
        return this;
      },
    };
    cb(dropdown);
    this._dropdown = dropdown;
    return this;
  }
}
