import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listTasks } from "@/lib/data/tasks";
import { listActiveUsers } from "@/lib/data/users";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskFormSheet } from "./task-form-sheet";
import { TaskKanban } from "./task-kanban";
import { TasksTable } from "./columns";

export default async function TasksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [allTasks, activeUsers] = await Promise.all([listTasks(user), listActiveUsers(user)]);
  const myTasks = allTasks.filter((t) => t.assigneeId === user.id);
  const userOptions = activeUsers.map((u) => ({ id: u.id, fullName: u.fullName }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground">{allTasks.length} total · {myTasks.length} assigned to you</p>
        </div>
        <TaskFormSheet users={userOptions} />
      </div>

      {allTasks.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-center">
          <ClipboardList className="mb-1 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        </div>
      ) : (
        <Tabs defaultValue="kanban">
          <TabsList>
            <TabsTrigger value="kanban">Board</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="mine">My Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-4">
            <TaskKanban tasks={allTasks} />
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <TasksTable data={allTasks} searchPlaceholder="Search tasks..." />
          </TabsContent>

          <TabsContent value="mine" className="mt-4">
            {myTasks.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nothing assigned to you.</p>
            ) : (
              <TaskKanban tasks={myTasks} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
