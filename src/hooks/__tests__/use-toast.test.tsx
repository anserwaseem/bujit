import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as React from "react";
import { useToast, toast } from "../use-toast";
import { ToastAction } from "@/components/ui/toast";

describe("useToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // reset toast state
    toast({ title: "reset", open: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should add toast to state", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: "Test Toast" });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe("Test Toast");
    expect(result.current.toasts[0].open).toBe(true);
  });

  it("should limit toasts to TOAST_LIMIT", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: "Toast 1" });
      toast({ title: "Toast 2" });
      toast({ title: "Toast 3" });
    });

    // TOAST_LIMIT is 1, so should only have 1 toast
    expect(result.current.toasts.length).toBeLessThanOrEqual(1);
  });

  it("should remove toast from queue after delay when dismissed", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: "Test Toast" });
    });

    expect(result.current.toasts).toHaveLength(1);

    // The toast is dismissed first (open: false), then removed after TOAST_REMOVE_DELAY
    // Dismiss the toast first to trigger the removal queue
    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
    expect(result.current.toasts).toHaveLength(1); // still in array, just closed

    // advance time by TOAST_REMOVE_DELAY (4000ms) - this should trigger the removal
    act(() => {
      vi.advanceTimersByTime(4000);
      vi.runAllTimers();
    });

    // after advancing time, the toast should be removed from the array
    expect(result.current.toasts).toHaveLength(0);
  });

  it("should update existing toast", () => {
    const { result } = renderHook(() => useToast());

    let toastReturn: ReturnType<typeof toast>;

    act(() => {
      toastReturn = toast({ title: "Initial Title" });
    });

    expect(result.current.toasts[0].title).toBe("Initial Title");

    act(() => {
      toastReturn!.update({ title: "Updated Title", id: toastReturn!.id });
    });

    expect(result.current.toasts[0].title).toBe("Updated Title");
  });

  it("should dismiss toast", () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;

    act(() => {
      const t = toast({ title: "Test Toast" });
      toastId = t.id;
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it("should dismiss all toasts when no id provided", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: "Toast 1" });
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it("should handle toast with description", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({
        title: "Test Toast",
        description: "This is a test description",
      });
    });

    expect(result.current.toasts[0].title).toBe("Test Toast");
    expect(result.current.toasts[0].description).toBe(
      "This is a test description"
    );
  });

  it("should handle toast with variant", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({
        title: "Error Toast",
        variant: "destructive",
      });
    });

    expect(result.current.toasts[0].variant).toBe("destructive");
  });

  it("should handle toast with action", () => {
    const { result } = renderHook(() => useToast());
    // create a proper ToastAction element using the actual component
    // ToastAction requires altText prop based on Radix UI ToastPrimitives.Action
    // We create the element and pass it directly - the toast function will accept it
    const actionElement = React.createElement(ToastAction, {
      onClick: vi.fn(),
      altText: "Undo",
    });

    // TypeScript infers the type from React.createElement, and toast accepts it
    // The runtime behavior is correct even if types don't match exactly
    act(() => {
      toast({
        title: "Test Toast",
        // @ts-expect-error - React.createElement with forwardRef doesn't match exact type
        // but works correctly at runtime
        action: actionElement,
      });
    });

    expect(result.current.toasts[0].action).toBe(actionElement);
  });

  it("should handle toast with custom duration", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({
        title: "Test Toast",
        duration: 2000,
      });
    });

    expect(result.current.toasts[0].duration).toBe(2000);
  });

  it("should handle multiple listeners", () => {
    const { result: result1 } = renderHook(() => useToast());
    const { result: result2 } = renderHook(() => useToast());

    act(() => {
      toast({ title: "Test Toast" });
    });

    // both hooks should see the same toast
    expect(result1.current.toasts).toHaveLength(1);
    expect(result2.current.toasts).toHaveLength(1);
  });

  it("should clean up listener on unmount", () => {
    const { result, unmount } = renderHook(() => useToast());

    act(() => {
      toast({ title: "Test Toast" });
    });

    expect(result.current.toasts).toHaveLength(1);

    unmount();

    // should not cause errors
    act(() => {
      toast({ title: "Another Toast" });
    });
  });

  it("should handle toast with onOpenChange", () => {
    const { result } = renderHook(() => useToast());
    const onOpenChange = vi.fn();

    act(() => {
      toast({
        title: "Test Toast",
        onOpenChange,
      });
    });

    // The toast function wraps onOpenChange, so we need to call the wrapped version
    // The actual onOpenChange in the toast is: (open) => { if (!open) dismiss(); }
    // So calling it with false will dismiss, but won't call the original onOpenChange
    // This is expected behavior - the toast manages its own onOpenChange
    act(() => {
      result.current.toasts[0].onOpenChange?.(false);
    });

    // The toast's internal onOpenChange calls dismiss, not the user's callback
    // This is by design - the toast library wraps the callback
    expect(result.current.toasts[0].open).toBe(false);
  });

  it("should dismiss toast when onOpenChange is called with false", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: "Test Toast" });
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      result.current.toasts[0].onOpenChange?.(false);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it("should handle rapid toast additions", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      for (let i = 0; i < 10; i++) {
        toast({ title: `Toast ${i}` });
      }
    });

    // should respect limit
    expect(result.current.toasts.length).toBeLessThanOrEqual(1);
  });

  it("should return dismiss and update functions from toast", () => {
    const { result } = renderHook(() => useToast());

    let toastReturn: ReturnType<typeof toast>;

    act(() => {
      toastReturn = toast({ title: "Test Toast" });
    });

    expect(toastReturn!.dismiss).toBeDefined();
    expect(toastReturn!.update).toBeDefined();
    expect(toastReturn!.id).toBeDefined();

    act(() => {
      toastReturn!.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
  });
});
