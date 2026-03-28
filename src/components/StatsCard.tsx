import { LucideIcon } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

interface StatsCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  delay?: number;
}

const AnimatedNumber = ({ value, delay = 0 }: { value: number; delay?: number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.2,
      delay,
      ease: "easeOut",
    });
    return controls.stop;
  }, [value, delay, count]);

  return <motion.span>{rounded}</motion.span>;
};

const StatsCard = ({ label, value, icon: Icon, color, bgColor, delay = 0 }: StatsCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4, ease: "easeOut" }}
      className="ms-card p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bgColor}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground tracking-tight">
          <AnimatedNumber value={value} delay={delay * 0.1} />
        </p>
        <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      </div>
    </motion.div>
  );
};

export default StatsCard;
