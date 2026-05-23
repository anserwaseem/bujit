import { useCallback, useEffect, useState } from "react";
import { getGoals, saveGoals } from "@/lib/storage";
import { createId } from "@/lib/utils";
import type { Goal } from "@/lib/types";

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>(() => getGoals());

  useEffect(() => {
    saveGoals(goals);
  }, [goals]);

  const addGoal = useCallback((goal: Omit<Goal, "id" | "createdAt">) => {
    const newGoal: Goal = {
      ...goal,
      id: createId(),
      createdAt: new Date().toISOString(),
    };
    setGoals((prev) => [newGoal, ...prev]);
    return newGoal;
  }, []);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const archiveGoal = useCallback((id: string, archived = true) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, archived } : g))
    );
  }, []);

  return { goals, addGoal, updateGoal, deleteGoal, archiveGoal };
}