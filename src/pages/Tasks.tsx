import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { TaskItem } from "@/components/tasks/TaskItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageBanner } from "@/components/PageBanner";
import { Plus, CheckSquare, Search } from "lucide-react";

export default function Tasks() {
  const [tab, setTab] = useState("todo");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: tasks, isLoading } = useTasks({ completed: tab === "completed" });
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = tasks
    ?.filter((t) => !priorityFilter || t.priority === priorityFilter)
    .filter((t) => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageBanner title="Tasks" description="Manage your to-dos and reminders.">
        <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Task
        </Button>
      </PageBanner>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="todo">To Do</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="All priorities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : !filtered?.length ? (
        <div className="flex flex-col items-center py-16">
          <CheckSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-lg">{tab === "todo" ? "No tasks yet" : "No completed tasks"}</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {tab === "todo" ? "Create your first task to get started." : "Complete a task to see it here."}
          </p>
          {tab === "todo" && (
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add task
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => <TaskItem key={task.id} task={task} />)}
        </div>
      )}

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
