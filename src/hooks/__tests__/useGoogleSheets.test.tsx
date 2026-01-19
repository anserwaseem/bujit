import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGoogleSheets } from "../useGoogleSheets";
import * as storage from "@/lib/storage";
import * as connectivity from "@/lib/connectivity";

// mock dependencies
vi.mock("@/lib/googleSheets");
vi.mock("@/lib/storage");
vi.mock("@/lib/connectivity");
vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

describe("useGoogleSheets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(connectivity.isOnline).mockReturnValue(true);
    vi.mocked(connectivity.onConnectivityChange).mockReturnValue(() => {});
  });

  describe("initialization", () => {
    it("should initialize with disconnected state when no config exists", () => {
      vi.mocked(storage.getGoogleSheetsConfig).mockReturnValue(null);

      const { result } = renderHook(() => useGoogleSheets());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.autoSync).toBe(false);
      expect(result.current.sheetId).toBeNull();
    });

    it("should load existing config from storage", () => {
      vi.mocked(storage.getGoogleSheetsConfig).mockReturnValue({
        accessToken: "test-token",
        sheetId: "test-sheet-id",
        autoSync: true,
        lastSyncTimestamp: 1234567890,
      });

      const { result } = renderHook(() => useGoogleSheets());

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isConnected).toBe(true);
      expect(result.current.autoSync).toBe(true);
      expect(result.current.sheetId).toBe("test-sheet-id");
      expect(result.current.lastSyncTime).toBe(1234567890);
    });

    it("should track online status from connectivity module", () => {
      vi.mocked(storage.getGoogleSheetsConfig).mockReturnValue(null);
      vi.mocked(connectivity.isOnline).mockReturnValue(false);

      const { result } = renderHook(() => useGoogleSheets());

      expect(result.current.isOnline).toBe(false);
    });
  });

  describe("setAutoSync", () => {
    it("should update auto-sync setting and persist to storage", () => {
      vi.mocked(storage.getGoogleSheetsConfig).mockReturnValue({
        accessToken: "test-token",
        sheetId: "test-sheet-id",
        autoSync: false,
      });

      const { result } = renderHook(() => useGoogleSheets());

      act(() => {
        result.current.setAutoSync(true);
      });

      expect(result.current.autoSync).toBe(true);
      expect(storage.saveGoogleSheetsConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          autoSync: true,
        })
      );
    });
  });
});
