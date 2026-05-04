import { expect, test, describe } from "vitest";
import { DEFAULT_SETTINGS } from "./settings";

describe("DEFAULT_SETTINGS", () => {
  test("should have markForwardedOnRollover default to false", () => {
    // GIVEN - DEFAULT_SETTINGS object

    // WHEN - We check the markForwardedOnRollover property

    // THEN - It should be false for backward compatibility
    expect(DEFAULT_SETTINGS.markForwardedOnRollover).toBe(false);
  });

  test("should include all expected settings with correct default values", () => {
    // GIVEN - DEFAULT_SETTINGS object

    // WHEN - We check all properties

    // THEN - All expected properties should exist with correct defaults
    expect(DEFAULT_SETTINGS).toHaveProperty("templateHeading", "none");
    expect(DEFAULT_SETTINGS).toHaveProperty("deleteOnComplete", false);
    expect(DEFAULT_SETTINGS).toHaveProperty("removeEmptyTodos", false);
    expect(DEFAULT_SETTINGS).toHaveProperty("rolloverChildren", false);
    expect(DEFAULT_SETTINGS).toHaveProperty("rolloverOnFileCreate", true);
    expect(DEFAULT_SETTINGS).toHaveProperty("doneStatusMarkers", "xX-");
    expect(DEFAULT_SETTINGS).toHaveProperty("leadingNewLine", true);
    expect(DEFAULT_SETTINGS).toHaveProperty("markForwardedOnRollover", false);
  });
});
