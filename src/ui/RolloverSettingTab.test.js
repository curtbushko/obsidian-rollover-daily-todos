import { describe, it, expect, vi, beforeEach } from "vitest";

// Track Setting calls for assertions
let settingInstances = [];

// Mock the obsidian module methods for test tracking
vi.mock("obsidian", async () => {
  const actual = await vi.importActual("obsidian");

  return {
    ...actual,
    PluginSettingTab: class {
      constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
        this.containerEl = { empty: vi.fn() };
      }
    },
    Setting: vi.fn().mockImplementation(function (containerEl) {
      const instance = {
        _name: null,
        _desc: null,
        _toggle: null,
        setName: vi.fn(function (name) {
          this._name = name;
          return this;
        }),
        setDesc: vi.fn(function (desc) {
          this._desc = desc;
          return this;
        }),
        addToggle: vi.fn(function (cb) {
          const toggle = {
            setValue: vi.fn().mockReturnThis(),
            onChange: vi.fn().mockReturnThis(),
          };
          cb(toggle);
          this._toggle = toggle;
          return this;
        }),
        addText: vi.fn(function (cb) {
          const text = {
            setValue: vi.fn().mockReturnThis(),
            onChange: vi.fn().mockReturnThis(),
          };
          cb(text);
          this._text = text;
          return this;
        }),
        addDropdown: vi.fn(function (cb) {
          const dropdown = {
            addOptions: vi.fn().mockReturnThis(),
            setValue: vi.fn().mockReturnThis(),
            onChange: vi.fn().mockReturnThis(),
          };
          cb(dropdown);
          this._dropdown = dropdown;
          return this;
        }),
      };
      settingInstances.push(instance);
      return instance;
    }),
  };
});

vi.mock("obsidian-daily-notes-interface", () => ({
  getDailyNoteSettings: vi.fn(() => ({ template: null })),
}));

import RolloverSettingTab from "./RolloverSettingTab.js";

describe("RolloverSettingTab", () => {
  let settingTab;
  let mockPlugin;
  let mockApp;

  beforeEach(() => {
    vi.clearAllMocks();
    settingInstances = [];

    mockPlugin = {
      settings: {
        templateHeading: "none",
        deleteOnComplete: false,
        removeEmptyTodos: false,
        rolloverChildren: false,
        rolloverOnFileCreate: true,
        doneStatusMarkers: "xX-",
        leadingNewLine: true,
        markForwardedOnRollover: false,
      },
      saveSettings: vi.fn(),
      loadData: vi.fn().mockResolvedValue({}),
    };

    mockApp = {
      vault: {
        getAbstractFileByPath: vi.fn(() => null),
        read: vi.fn().mockResolvedValue(""),
      },
    };

    settingTab = new RolloverSettingTab(mockApp, mockPlugin);
  });

  describe("display", () => {
    it("should display markForwardedOnRollover toggle in settings UI", async () => {
      // Act
      await settingTab.display();

      // Assert - find the setting with the correct name
      const markForwardedSetting = settingInstances.find(
        (s) => s._name === "Mark forwarded on rollover"
      );

      expect(markForwardedSetting).toBeDefined();
      expect(markForwardedSetting._toggle).toBeDefined();
      expect(markForwardedSetting._desc).toBe(
        "Mark incomplete todos with [>] in the previous day's note when rolled over."
      );
    });

    it("should set initial value from plugin settings for markForwardedOnRollover toggle", async () => {
      // Arrange - set a specific value
      mockPlugin.settings.markForwardedOnRollover = true;

      // Act
      await settingTab.display();

      // Assert
      const markForwardedSetting = settingInstances.find(
        (s) => s._name === "Mark forwarded on rollover"
      );

      expect(markForwardedSetting).toBeDefined();
      expect(markForwardedSetting._toggle.setValue).toHaveBeenCalledWith(true);
    });

    it("should use false as default when markForwardedOnRollover is undefined", async () => {
      // Arrange - make the setting undefined
      mockPlugin.settings.markForwardedOnRollover = undefined;

      // Act
      await settingTab.display();

      // Assert
      const markForwardedSetting = settingInstances.find(
        (s) => s._name === "Mark forwarded on rollover"
      );

      expect(markForwardedSetting).toBeDefined();
      // Should call setValue with false due to || false pattern
      expect(markForwardedSetting._toggle.setValue).toHaveBeenCalledWith(false);
    });

    it("should save markForwardedOnRollover setting when toggled", async () => {
      // Act
      await settingTab.display();

      // Assert - find the setting and get its onChange callback
      const markForwardedSetting = settingInstances.find(
        (s) => s._name === "Mark forwarded on rollover"
      );

      expect(markForwardedSetting).toBeDefined();

      // Get the onChange callback and call it
      const onChangeCall = markForwardedSetting._toggle.onChange.mock.calls[0];
      expect(onChangeCall).toBeDefined();

      const onChangeCallback = onChangeCall[0];
      onChangeCallback(true);

      // Verify setting was updated and saved
      expect(mockPlugin.settings.markForwardedOnRollover).toBe(true);
      expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });
  });
});
