import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { haptic } from "../utils";

describe("utils", () => {
  describe("haptic", () => {
    let originalVibrate: typeof navigator.vibrate;

    beforeEach(() => {
      originalVibrate = navigator.vibrate;
      navigator.vibrate = vi.fn();
    });

    afterEach(() => {
      navigator.vibrate = originalVibrate;
    });

    it("should return early if navigator.vibrate is not available", () => {
      const originalVibrate = navigator.vibrate;
      const navigatorWithVibrate = navigator as {
        vibrate?: typeof navigator.vibrate;
      };
      delete navigatorWithVibrate.vibrate;

      haptic("light");

      // should not throw
      expect(true).toBe(true);

      navigator.vibrate = originalVibrate;
    });

    it("should call navigator.vibrate with light pattern", () => {
      haptic("light");

      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });

    it("should call navigator.vibrate with medium pattern", () => {
      haptic("medium");

      expect(navigator.vibrate).toHaveBeenCalledWith(20);
    });

    it("should call navigator.vibrate with heavy pattern", () => {
      haptic("heavy");

      expect(navigator.vibrate).toHaveBeenCalledWith(30);
    });

    it("should call navigator.vibrate with success pattern", () => {
      haptic("success");

      expect(navigator.vibrate).toHaveBeenCalledWith([10, 50, 20]);
    });

    it("should call navigator.vibrate with warning pattern", () => {
      haptic("warning");

      expect(navigator.vibrate).toHaveBeenCalledWith([20, 30, 20]);
    });

    it("should call navigator.vibrate with error pattern", () => {
      haptic("error");

      expect(navigator.vibrate).toHaveBeenCalledWith([30, 50, 30, 50, 30]);
    });

    it("should default to light pattern when no type provided", () => {
      haptic();

      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });

    it("should handle all haptic types", () => {
      const types: Array<
        "light" | "medium" | "heavy" | "success" | "warning" | "error"
      > = ["light", "medium", "heavy", "success", "warning", "error"];

      types.forEach((type) => {
        haptic(type);
        expect(navigator.vibrate).toHaveBeenCalled();
      });

      expect(navigator.vibrate).toHaveBeenCalledTimes(6);
    });

    it("should handle vibrate returning false (not supported)", () => {
      navigator.vibrate = vi.fn(() => false) as typeof navigator.vibrate;

      haptic("light");

      // should not throw
      expect(navigator.vibrate).toHaveBeenCalled();
    });

    it("should fallback to iOS Safari checkbox switch when vibrate is not available", () => {
      const originalVibrate = navigator.vibrate;
      const navigatorWithVibrate = navigator as {
        vibrate?: typeof navigator.vibrate;
      };
      delete navigatorWithVibrate.vibrate;

      const createElementSpy = vi.spyOn(document, "createElement");
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      haptic("light");

      // should create a switch input element
      expect(createElementSpy).toHaveBeenCalledWith("input");
      expect(appendChildSpy).toHaveBeenCalled();

      // clean up
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      navigator.vibrate = originalVibrate;
    });

    it("should handle multiple toggles for error pattern on iOS", () => {
      const originalVibrate = navigator.vibrate;
      const navigatorWithVibrate = navigator as {
        vibrate?: typeof navigator.vibrate;
      };
      delete navigatorWithVibrate.vibrate;

      vi.useFakeTimers();
      const createElementSpy = vi.spyOn(document, "createElement");
      const appendChildSpy = vi.spyOn(document.body, "appendChild");

      haptic("error");

      // should create switch element
      expect(createElementSpy).toHaveBeenCalledWith("input");

      // advance timers to complete the pattern (error uses 50ms delays)
      vi.advanceTimersByTime(200);

      // clean up
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      vi.useRealTimers();
      navigator.vibrate = originalVibrate;
    });

    it("should handle multiple toggles for warning pattern on iOS", () => {
      const originalVibrate = navigator.vibrate;
      const navigatorWithVibrate = navigator as {
        vibrate?: typeof navigator.vibrate;
      };
      delete navigatorWithVibrate.vibrate;

      vi.useFakeTimers();
      const createElementSpy = vi.spyOn(document, "createElement");
      const appendChildSpy = vi.spyOn(document.body, "appendChild");

      haptic("warning");

      // should create switch element
      expect(createElementSpy).toHaveBeenCalledWith("input");

      // advance timers to complete the pattern (warning uses 30ms delays, 2 toggles)
      vi.advanceTimersByTime(100);

      // clean up
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      vi.useRealTimers();
      navigator.vibrate = originalVibrate;
    });

    it("should handle multiple toggles for success pattern on iOS", () => {
      const originalVibrate = navigator.vibrate;
      const navigatorWithVibrate = navigator as {
        vibrate?: typeof navigator.vibrate;
      };
      delete navigatorWithVibrate.vibrate;

      vi.useFakeTimers();
      const createElementSpy = vi.spyOn(document, "createElement");
      const appendChildSpy = vi.spyOn(document.body, "appendChild");

      haptic("success");

      // should create switch element
      expect(createElementSpy).toHaveBeenCalledWith("input");

      // advance timers to complete the pattern (success uses 30ms delays, 2 toggles)
      vi.advanceTimersByTime(100);

      // clean up
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      vi.useRealTimers();
      navigator.vibrate = originalVibrate;
    });

    it("should handle iOS fallback gracefully when DOM is not available", () => {
      const originalVibrate = navigator.vibrate;
      const navigatorWithVibrate = navigator as {
        vibrate?: typeof navigator.vibrate;
      };
      delete navigatorWithVibrate.vibrate;

      const originalDocument = global.document;
      const globalWithDocument = global as { document?: Document };
      delete globalWithDocument.document;

      // should not throw
      expect(() => haptic("light")).not.toThrow();

      global.document = originalDocument;
      navigator.vibrate = originalVibrate;
    });

    it("should handle iOS fallback error in catch block", () => {
      const originalVibrate = navigator.vibrate;
      const navigatorWithVibrate = navigator as {
        vibrate?: typeof navigator.vibrate;
      };
      delete navigatorWithVibrate.vibrate;

      // mock document.createElement to throw an error
      const originalCreateElement = document.createElement;
      document.createElement = vi.fn(() => {
        throw new Error("DOM manipulation failed");
      });

      // should not throw - catch block should handle it
      expect(() => haptic("light")).not.toThrow();

      // restore
      document.createElement = originalCreateElement;
      navigator.vibrate = originalVibrate;
    });

    it("should handle iOS fallback when appendChild fails", () => {
      const originalVibrate = navigator.vibrate;
      const navigatorWithVibrate = navigator as {
        vibrate?: typeof navigator.vibrate;
      };
      delete navigatorWithVibrate.vibrate;

      // mock document.body.appendChild to throw an error
      const originalAppendChild = document.body.appendChild;
      document.body.appendChild = vi.fn(() => {
        throw new Error("appendChild failed");
      });

      // should not throw - catch block should handle it
      expect(() => haptic("light")).not.toThrow();

      // restore
      document.body.appendChild = originalAppendChild;
      navigator.vibrate = originalVibrate;
    });
  });
});
