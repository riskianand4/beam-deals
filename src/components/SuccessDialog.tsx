import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

const SuccessDialog = ({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel = "Tutup",
  onSecondary,
}: SuccessDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm text-center">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3 py-2"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center"
              >
                <CheckCircle2 className="w-8 h-8 text-success" />
              </motion.div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
              <div className="flex gap-2 w-full mt-2">
                {actionLabel && onAction && (
                  <Button onClick={onAction} className="flex-1 text-xs">
                    {actionLabel}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    onSecondary?.();
                    onOpenChange(false);
                  }}
                  className={`text-xs ${actionLabel ? "flex-1" : "w-full"}`}
                >
                  {secondaryLabel}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default SuccessDialog;
