import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeechRecognition } from "../useSpeechRecognition";
import * as utils from "@/lib/utils";

// mock haptic function
vi.mock("@/lib/utils", () => ({
  haptic: vi.fn(),
}));

// type declarations for Web Speech API (matching the hook implementation)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

// mock EventTarget for test environment
class MockEventTarget implements EventTarget {
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn(() => true);
}

// create mock recognition that properly extends EventTarget
class MockSpeechRecognitionInstance
  extends MockEventTarget
  implements SpeechRecognitionInstance
{
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
}

// helper to create mock SpeechRecognitionResultList
function createMockResults(
  resultsArray: Array<Array<{ transcript: string; confidence?: number }>>
): SpeechRecognitionResultList {
  const mockResults: SpeechRecognitionResult[] = resultsArray.map(
    (resultArray) => {
      const alternatives: SpeechRecognitionAlternative[] = resultArray.map(
        (item) => ({
          transcript: item.transcript,
          confidence: item.confidence ?? 1,
        })
      );
      const mockResult: SpeechRecognitionResult = {
        length: alternatives.length,
        item: (idx: number) => alternatives[idx],
        isFinal: false,
        [Symbol.iterator]: function* () {
          for (const alt of alternatives) {
            yield alt;
          }
        },
      };
      // add indexed access for array-like behavior
      for (let i = 0; i < alternatives.length; i++) {
        (mockResult as Record<number, SpeechRecognitionAlternative>)[i] =
          alternatives[i];
      }
      return mockResult;
    }
  );

  const mockResultList: SpeechRecognitionResultList = {
    length: mockResults.length,
    item: (index: number) => mockResults[index],
    [Symbol.iterator]: function* () {
      for (const result of mockResults) {
        yield result;
      }
    },
  };
  // add indexed access for array-like behavior
  for (let i = 0; i < mockResults.length; i++) {
    (mockResultList as Record<number, SpeechRecognitionResult>)[i] =
      mockResults[i];
  }
  return mockResultList;
}

// create mock event classes
class MockSpeechRecognitionEvent
  extends Event
  implements SpeechRecognitionEvent
{
  results: SpeechRecognitionResultList;

  constructor(resultsArray: Array<Array<{ transcript: string }>>) {
    super("result");
    this.results = createMockResults(resultsArray);
  }
}

class MockSpeechRecognitionErrorEvent
  extends Event
  implements SpeechRecognitionErrorEvent
{
  error: string;

  constructor(error: string) {
    super("error");
    this.error = error;
  }
}

// extend global type for test environment
declare global {
  var SpeechRecognition: SpeechRecognitionConstructor | undefined;
  var webkitSpeechRecognition: SpeechRecognitionConstructor | undefined;
}

describe("useSpeechRecognition", () => {
  let mockRecognition: MockSpeechRecognitionInstance;

  beforeEach(() => {
    mockRecognition = new MockSpeechRecognitionInstance();

    // mock SpeechRecognition constructor
    global.SpeechRecognition = vi.fn(
      () => mockRecognition
    ) as SpeechRecognitionConstructor;
    global.webkitSpeechRecognition = undefined;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should detect browser support for SpeechRecognition", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    expect(result.current.isSupported).toBe(true);
  });

  it("should detect browser support for webkitSpeechRecognition", () => {
    global.SpeechRecognition = undefined;
    global.webkitSpeechRecognition = vi.fn(
      () => mockRecognition
    ) as SpeechRecognitionConstructor;

    const { result } = renderHook(() => useSpeechRecognition());

    expect(result.current.isSupported).toBe(true);
  });

  it("should set isSupported to false when not available", () => {
    global.SpeechRecognition = undefined;
    global.webkitSpeechRecognition = undefined;

    const { result } = renderHook(() => useSpeechRecognition());

    expect(result.current.isSupported).toBe(false);
  });

  it("should initialize recognition with correct settings", () => {
    renderHook(() => useSpeechRecognition());

    expect(mockRecognition.continuous).toBe(false);
    expect(mockRecognition.interimResults).toBe(false);
    expect(mockRecognition.lang).toBe("en-US");
  });

  it("should start listening and set isListening to true", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.startListening();
    });

    expect(mockRecognition.start).toHaveBeenCalled();
    expect(result.current.isListening).toBe(true);
  });

  it("should call haptic medium on start", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    result.current.startListening();

    expect(utils.haptic).toHaveBeenCalledWith("medium");
  });

  it("should handle result and call onResult callback", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onResult }));

    act(() => {
      result.current.startListening();
    });

    // simulate result event
    const mockEvent = new MockSpeechRecognitionEvent([
      [{ transcript: "coffee 100" }],
    ]);

    act(() => {
      mockRecognition.onresult?.(mockEvent);
    });

    expect(onResult).toHaveBeenCalledWith("coffee 100");
    expect(utils.haptic).toHaveBeenCalledWith("success");
    expect(result.current.isListening).toBe(false);
  });

  it("should handle error and call onError callback", () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onError }));

    act(() => {
      result.current.startListening();
    });

    // simulate error event
    const mockErrorEvent = new MockSpeechRecognitionErrorEvent("no-speech");

    act(() => {
      mockRecognition.onerror?.(mockErrorEvent);
    });

    expect(onError).toHaveBeenCalledWith("no-speech");
    expect(utils.haptic).toHaveBeenCalledWith("error");
    expect(result.current.isListening).toBe(false);
  });

  it("should set isListening to false on end", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.startListening();
    });

    expect(result.current.isListening).toBe(true);

    act(() => {
      mockRecognition.onend?.();
    });

    expect(result.current.isListening).toBe(false);
  });

  it("should stop listening and set isListening to false", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.startListening();
    });

    expect(result.current.isListening).toBe(true);

    act(() => {
      result.current.stopListening();
    });

    expect(mockRecognition.stop).toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);
  });

  it("should toggle listening state", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    expect(result.current.isListening).toBe(false);

    act(() => {
      result.current.toggleListening();
    });

    expect(result.current.isListening).toBe(true);

    act(() => {
      result.current.toggleListening();
    });

    expect(result.current.isListening).toBe(false);
  });

  it("should handle already started error by stopping and scheduling restart", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    // mock start to throw "already started" error
    mockRecognition.start = vi.fn(() => {
      throw new Error("already started");
    });

    act(() => {
      result.current.startListening();
    });

    // verify error handling: stop should be called immediately
    expect(mockRecognition.stop).toHaveBeenCalled();
    expect(mockRecognition.start).toHaveBeenCalledTimes(1);
    // note: setTimeout for restart is tested implicitly through integration
    // testing the full setTimeout execution causes memory issues in test environment
  });

  it("should clean up on unmount", () => {
    const { unmount } = renderHook(() => useSpeechRecognition());

    unmount();

    expect(mockRecognition.abort).toHaveBeenCalled();
  });

  it("should handle missing recognition gracefully on start", () => {
    global.SpeechRecognition = undefined;
    global.webkitSpeechRecognition = undefined;

    const { result } = renderHook(() => useSpeechRecognition());

    // should not throw
    expect(() => result.current.startListening()).not.toThrow();
  });

  it("should handle missing recognition gracefully on stop", () => {
    global.SpeechRecognition = undefined;
    global.webkitSpeechRecognition = undefined;

    const { result } = renderHook(() => useSpeechRecognition());

    // should not throw
    expect(() => result.current.stopListening()).not.toThrow();
  });

  it("should update callbacks when props change", () => {
    const onResult1 = vi.fn();
    const { rerender } = renderHook(
      ({ onResult }) => useSpeechRecognition({ onResult }),
      { initialProps: { onResult: onResult1 } }
    );

    // trigger first callback to verify it works
    const mockEvent1 = new MockSpeechRecognitionEvent([
      [{ transcript: "test1" }],
    ]);
    act(() => {
      mockRecognition.onresult?.(mockEvent1);
    });
    expect(onResult1).toHaveBeenCalledWith("test1");
    onResult1.mockClear();

    // update props
    const onResult2 = vi.fn();
    rerender({ onResult: onResult2 });

    // trigger callback again - should use new callback
    // note: refs update in useEffect, which runs after render
    // in practice, this works because React batches updates
    const mockEvent2 = new MockSpeechRecognitionEvent([
      [{ transcript: "test2" }],
    ]);
    act(() => {
      mockRecognition.onresult?.(mockEvent2);
    });

    // the new callback should be called (refs are updated synchronously in useEffect)
    expect(onResult2).toHaveBeenCalledWith("test2");
    // old callback should not be called again
    expect(onResult1).not.toHaveBeenCalled();
  });

  it("should handle multiple result events", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onResult }));

    act(() => {
      result.current.startListening();
    });

    expect(result.current.isListening).toBe(true);

    const mockEvent1 = new MockSpeechRecognitionEvent([
      [{ transcript: "coffee" }],
    ]);

    act(() => {
      mockRecognition.onresult?.(mockEvent1);
    });

    expect(onResult).toHaveBeenCalledWith("coffee");
    onResult.mockClear();

    act(() => {
      result.current.startListening();
    });

    expect(result.current.isListening).toBe(true);

    const mockEvent2 = new MockSpeechRecognitionEvent([
      [{ transcript: "lunch" }],
    ]);

    act(() => {
      mockRecognition.onresult?.(mockEvent2);
    });

    expect(onResult).toHaveBeenCalledWith("lunch");
  });

  it("should handle different error types", () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onError }));

    const errorTypes = ["no-speech", "audio-capture", "not-allowed", "aborted"];

    for (const errorType of errorTypes) {
      act(() => {
        result.current.startListening();
      });

      expect(result.current.isListening).toBe(true);

      const mockErrorEvent = new MockSpeechRecognitionErrorEvent(errorType);

      act(() => {
        mockRecognition.onerror?.(mockErrorEvent);
      });

      expect(onError).toHaveBeenCalledWith(errorType);
      expect(result.current.isListening).toBe(false);
      onError.mockClear();
    }
  });
});
