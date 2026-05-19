"use client";

import { useState } from "react";
import { Clock, GripVertical } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/ui/row-actions";
import { DeleteEndpointDialog } from "@/components/ui/confirm-dialog";
import { DialogTrigger } from "@/components/forms/dialog-trigger";
import { EditTaskDialog } from "@/components/forms/edit-task-dialog";
import { useFetch, apiFetch } from "@/lib/use-fetch";
import type { TaskDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDateID } from "@/lib/format";

type Status = TaskDTO["status"];

type ColumnDef = {
  status: Status;
  title: string;
  tone: "neutral" | "warning" | "gold" | "success";
};

const columns: ColumnDef[] = [
  { status: "todo", title: "To Do", tone: "neutral" },
  { status: "in_progress", title: "In Progress", tone: "warning" },
  { status: "review", title: "Review", tone: "gold" },
  { status: "done", title: "Done", tone: "success" },
];

const toneDot: Record<ColumnDef["tone"], string> = {
  neutral: "bg-ink-light",
  warning: "bg-warning",
  gold: "bg-gold-dark",
  success: "bg-success",
};

export default function ChecklistPage() {
  const { data, loading, error, refresh } = useFetch<TaskDTO[]>("/api/tasks");

  const [edit, setEdit] = useState<TaskDTO | null>(null);
  const [del, setDel] = useState<TaskDTO | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [hoverCol, setHoverCol] = useState<Status | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(taskId));
    setDragging(taskId);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setHoverCol(null);
  };

  const handleDragOver = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (hoverCol !== status) setHoverCol(status);
  };

  const handleDrop = async (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData("text/plain"));
    setHoverCol(null);
    setDragging(null);
    if (!taskId) return;
    const task = data?.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    try {
      await apiFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: { status },
      });
      refresh();
    } catch (err) {
      console.error(err);
      refresh();
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Checklist"
        subtitle="Track tasks and progress · drag card antar kolom untuk update status"
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <DialogTrigger kind="task" onSuccess={refresh} />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {loading && <div className="text-sm text-ink-light">Loading tasks…</div>}

      <div className="flex gap-5 overflow-x-auto pb-5">
        {columns.map((col) => {
          const tasks = data?.filter((t) => t.status === col.status) ?? [];
          const isHover = hoverCol === col.status;
          return (
            <div
              key={col.status}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDrop={(e) => handleDrop(e, col.status)}
              onDragLeave={() => setHoverCol(null)}
              className={cn(
                "flex w-[300px] shrink-0 flex-col gap-3 rounded-md p-2 transition-colors",
                isHover && "bg-gold/10 ring-2 ring-gold/40"
              )}
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-ink">
                    {col.title}
                  </h3>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold text-white",
                      toneDot[col.tone]
                    )}
                  >
                    {tasks.length}
                  </span>
                </div>
                <DialogTrigger kind="task" variant="secondary" label="" onSuccess={refresh} />
              </div>

              <div className="flex min-h-[60px] flex-col gap-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "card-base group relative p-4 transition-opacity",
                      dragging === task.id && "opacity-40"
                    )}
                  >
                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <GripVertical className="h-4 w-4 cursor-grab text-ink-light" />
                      <RowActions
                        onEdit={() => setEdit(task)}
                        onDelete={() => setDel(task)}
                      />
                    </div>
                    <div className="pr-12 text-sm font-semibold text-ink">{task.title}</div>
                    <div className="mt-2 text-xs text-ink-light">
                      💍 {task.client?.names ?? "—"}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      {task.dueDate ? (
                        <span className="flex items-center gap-1 text-xs text-ink-medium">
                          <Clock className="h-3 w-3" />
                          {formatDateID(task.dueDate)}
                        </span>
                      ) : (
                        <span />
                      )}
                      <div className="flex items-center gap-2">
                        {task.assignee && (
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-light text-[10px] font-semibold text-gold-dark"
                            title={task.assignee}
                          >
                            {task.assignee[0]}
                          </div>
                        )}
                        {task.priority === "high" && <Badge tone="danger">High</Badge>}
                        {task.priority === "medium" && <Badge tone="warning">Medium</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="rounded-md border border-dashed border-line p-4 text-center text-xs text-ink-light">
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {edit && (
        <EditTaskDialog
          open
          onClose={() => setEdit(null)}
          task={edit}
          onSuccess={refresh}
        />
      )}
      {del && (
        <DeleteEndpointDialog
          open
          onClose={() => setDel(null)}
          endpoint={`/api/tasks/${del.id}`}
          title={`Delete task "${del.title}"?`}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
