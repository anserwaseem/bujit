import "@testing-library/jest-dom";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// cleanup after each test
afterEach(() => {
  cleanup();
  // clear localStorage after each test
  localStorage.clear();
});

// mock crypto.randomUUID for consistent testing
Object.defineProperty(global, "crypto", {
  value: {
    ...global.crypto,
    randomUUID: vi.fn(() => "test-uuid-123"),
  },
  writable: true,
});
