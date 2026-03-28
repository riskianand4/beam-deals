import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction, compact = false }: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center text-center ${compact ? "py-8" : "py-16"}`}
    >
      <div className={`rounded-2xl bg-muted/60 flex items-center justify-center mb-4 ${compact ? "w-12 h-12" : "w-16 h-16"}`}>
        <Icon className={`text-muted-foreground ${compact ? "w-6 h-6" : "w-8 h-8"}`} />
      </div>
      <h3 className={`font-semibold text-foreground mb-1 ${compact ? "text-sm" : "text-base"}`}>{title}</h3>
      <p className={`text-muted-foreground max-w-xs ${compact ? "text-xs" : "text-sm"}`}>{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" className="mt-4 gap-1.5 text-xs" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
};

export default EmptyState;
