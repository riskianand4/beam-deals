import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";

interface BulkActionBarProps {
  count: number;
  onDelete: () => void;
  onClear: () => void;
  deleting?: boolean;
  children?: React.ReactNode;
}

export function BulkActionBar({ count, onDelete, onClear, deleting, children }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 flex flex-wrap items-center gap-2 sm:gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
      <span className="text-sm font-medium">{count} selected</span>
      <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleting}>
        <Trash2 className="h-4 w-4 mr-1" /> Delete
      </Button>
      {children}
      <Button variant="ghost" size="sm" onClick={onClear}>
        <X className="h-4 w-4 mr-1" /> Clear
      </Button>
    </div>
  );
}
