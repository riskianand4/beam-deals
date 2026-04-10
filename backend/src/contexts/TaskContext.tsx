import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "@/lib/api";
import type { Task, TaskNote, TaskStatus } from "@/types";

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  addTaskNote: (taskId: string, formData: FormData) => Promise<void>;
  addTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Omit<Task, "id">>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | null>(null);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshTasks = useCallback(async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = api.getToken();
    if (token) refreshTasks();
    else setLoading(false);
  }, [refreshTasks]);

  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    const updated = await api.updateTaskStatus(taskId, status);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  }, []);

  const addTaskNote = useCallback(async (taskId: string, formData: FormData) => {
    const updated = await api.addTaskNote(taskId, formData);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  }, []);

  const addTask = useCallback(async (task: Partial<Task>) => {
    const created = await api.createTask(task);
    setTasks((prev) => [created, ...prev]);
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Omit<Task, "id">>) => {
    const updated = await api.updateTask(taskId, updates);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    await api.deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  return (
    <TaskContext.Provider value={{ tasks, loading, updateTaskStatus, addTaskNote, addTask, updateTask, deleteTask, refreshTasks }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used within TaskProvider");
  return ctx;
};
