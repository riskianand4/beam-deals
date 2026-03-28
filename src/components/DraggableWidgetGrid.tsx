import React, { useState, useCallback, useRef } from "react";
import { GripVertical, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface WidgetConfig {
  id: string;
  title: string;
  size: "small" | "medium" | "large"; // small=1col, medium=2col, large=full
  visible: boolean;
}

interface Props {
  widgets: WidgetConfig[];
  storageKey: string;
  renderWidget: (id: string) => React.ReactNode;
  children?: React.ReactNode;
}

const getStoredOrder = (key: string): string[] | null => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const DraggableWidgetGrid: React.FC<Props> = ({ widgets, storageKey, renderWidget }) => {
  const [order, setOrder] = useState<string[]>(() => {
    const stored = getStoredOrder(storageKey);
    if (stored) {
      // Merge: keep stored order but add any new widgets at end
      const allIds = widgets.map((w) => w.id);
      const validStored = stored.filter((id) => allIds.includes(id));
      const missing = allIds.filter((id) => !validStored.includes(id));
      return [...validStored, ...missing];
    }
    return widgets.map((w) => w.id);
  });

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isCustomized, setIsCustomized] = useState(() => !!getStoredOrder(storageKey));
  const dragCounter = useRef(0);

  const saveOrder = useCallback((newOrder: string[]) => {
    setOrder(newOrder);
    localStorage.setItem(storageKey, JSON.stringify(newOrder));
    setIsCustomized(true);
  }, [storageKey]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    // Make drag image semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDragId(null);
    setDragOverId(null);
    dragCounter.current = 0;
  };

  const handleDragEnter = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    dragCounter.current++;
    setDragOverId(id);
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    dragCounter.current = 0;
    const sourceId = e.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetId) {
      setDragOverId(null);
      return;
    }

    const newOrder = [...order];
    const sourceIdx = newOrder.indexOf(sourceId);
    const targetIdx = newOrder.indexOf(targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    newOrder.splice(sourceIdx, 1);
    newOrder.splice(targetIdx, 0, sourceId);
    saveOrder(newOrder);
    setDragOverId(null);
  };

  const resetOrder = () => {
    const defaultOrder = widgets.map((w) => w.id);
    setOrder(defaultOrder);
    localStorage.removeItem(storageKey);
    setIsCustomized(false);
    toast.success("Tata letak direset");
  };

  const orderedWidgets = order
    .map((id) => widgets.find((w) => w.id === id))
    .filter((w): w is WidgetConfig => !!w && w.visible);

  return (
    <div className="space-y-3">
      {isCustomized && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex justify-end"
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] h-6 px-2 gap-1 text-muted-foreground"
            onClick={resetOrder}
          >
            <RotateCcw className="w-3 h-3" /> Reset tata letak
          </Button>
        </motion.div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {orderedWidgets.map((widget) => {
          const colSpan =
            widget.size === "large" ? "lg:col-span-3" :
            widget.size === "medium" ? "lg:col-span-2" :
            "lg:col-span-1";

          return (
            <div
              key={widget.id}
              draggable
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => handleDragEnter(e, widget.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, widget.id)}
              className={`${colSpan} transition-all duration-200 ${
                dragOverId === widget.id && dragId !== widget.id
                  ? "ring-2 ring-primary/30 ring-offset-2 ring-offset-background rounded-xl scale-[1.01]"
                  : ""
              } ${dragId === widget.id ? "opacity-50" : ""}`}
            >
              <div className="relative group">
                <div className="absolute -left-0 top-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                  <div className="w-5 h-8 flex items-center justify-center rounded-md bg-muted/80 backdrop-blur-sm">
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                {renderWidget(widget.id)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DraggableWidgetGrid;
