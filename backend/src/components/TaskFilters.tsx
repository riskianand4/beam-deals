import { Search, Filter, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (v: string) => void;
  view: "kanban" | "list";
  onViewChange: (v: "kanban" | "list") => void;
}

const TaskFilters = ({ search, onSearchChange, priorityFilter, onPriorityFilterChange, view, onViewChange }: TaskFiltersProps) => {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari tugas..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>
      <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
        <SelectTrigger className="w-36 h-9 text-sm">
          <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
          <SelectValue placeholder="Prioritas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Prioritas</SelectItem>
          <SelectItem value="high">Tinggi</SelectItem>
          <SelectItem value="medium">Sedang</SelectItem>
          <SelectItem value="low">Rendah</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center border border-border rounded-md overflow-hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={view === "kanban" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-9 px-3"
              onClick={() => onViewChange("kanban")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tampilan Papan</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-9 px-3"
              onClick={() => onViewChange("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tampilan Daftar</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default TaskFilters;
