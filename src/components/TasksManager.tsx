import React, { useState } from "react";
import { Check, Plus, Mail, Calendar, Trash2 } from "lucide-react";

// [DESIGN: color system] Task item stored as JSON in the document field
export interface TaskItem {
  id: number;
  text: string;
  date: string;
  done: boolean;
  createdAt: string;
}

interface TasksManagerProps {
  /** JSON-stringified TaskItem[] stored in project.document */
  value: string;
  onChange: (json: string) => void;
  color: string;
  onSendEmail?: (task: TaskItem) => void;
}

function parseTasks(value: string): TaskItem[] {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

export const TasksManager: React.FC<TasksManagerProps> = ({ value, onChange, color, onSendEmail }) => {
  const [newText, setNewText] = useState("");
  const [newDate, setNewDate] = useState("");

  const tasks = parseTasks(value);

  const save = (updated: TaskItem[]) => {
    onChange(JSON.stringify(updated));
  };

  const addTask = () => {
    if (!newText.trim()) return;
    const task: TaskItem = {
      id: Date.now(),
      text: newText.trim(),
      date: newDate || "",
      done: false,
      createdAt: new Date().toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" }),
    };
    save([task, ...tasks]);
    setNewText("");
    setNewDate("");
  };

  const toggleDone = (id: number) => {
    save(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const removeTask = (id: number) => {
    save(tasks.filter((t) => t.id !== id));
  };

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header with count */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-bold" style={{ color }}>משימות</div>
        {tasks.length > 0 && (
          <span className="text-sm font-semibold px-2 py-0.5 rounded-full" style={{ color, background: color + "15" }}>
            {doneCount}/{tasks.length}
          </span>
        )}
      </div>

      {/* Add task form */}
      <div className="rounded-xl border border-border p-3 mb-3 space-y-2" style={{ background: color + "08" }}>
        <input
          title="טקסט משימה"
          className="h-10 w-full rounded-lg border border-border px-3 text-sm bg-white"
          style={{ direction: "rtl" }}
          placeholder="הוסף משימה חדשה..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 flex-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              title="תאריך יעד"
              type="date"
              className="h-9 rounded-lg border border-border px-2 text-sm bg-white flex-1"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <button
            title="הוסף משימה"
            onClick={addTask}
            disabled={!newText.trim()}
            className="h-9 px-4 rounded-lg text-white text-sm font-bold hover:brightness-110 transition-all disabled:opacity-40 flex items-center gap-1"
            style={{ background: color }}
          >
            <Plus className="h-4 w-4" />
            הוסף
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[300px]">
        {tasks.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">אין משימות — הוסף את הראשונה</div>
        )}
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`group flex items-start gap-2 rounded-lg border p-3 transition-all ${
              task.done ? "bg-muted/30 border-border/50" : "bg-white border-border hover:shadow-sm"
            }`}
          >
            {/* Checkbox */}
            <button
              title={task.done ? "סמן כלא בוצע" : "סמן כבוצע"}
              onClick={() => toggleDone(task.id)}
              className="mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
              style={{
                borderColor: task.done ? color : "#d0dce8",
                background: task.done ? color : "transparent",
              }}
            >
              {task.done && <Check className="h-3 w-3 text-white" />}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div
                className={`text-sm font-medium leading-snug ${task.done ? "line-through text-muted-foreground" : "text-foreground"}`}
              >
                {task.text}
              </div>
              <div className="flex items-center gap-3 mt-1">
                {task.date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(task.date).toLocaleDateString("he-IL")}
                  </span>
                )}
                <span className="text-xs text-muted-foreground/60">{task.createdAt}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onSendEmail && (
                <button
                  title="שלח במייל"
                  onClick={() => onSendEmail(task)}
                  className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              <button
                title="מחק משימה"
                onClick={() => removeTask(task.id)}
                className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
