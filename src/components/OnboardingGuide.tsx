import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, MessageCircleCodeIcon, Shield, ArrowRight, X, Sparkles, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const STEPS = [
  {
    icon: Sparkles,
    title: "Selamat Datang di Ruang Kerja!",
    description: "Ini adalah pusat kendali tugas dan kolaborasi tim Anda. Mari kenali fitur utamanya.",
  },
  {
    icon: CheckSquare,
    title: "Kelola Tugas dengan Kanban",
    description: "Lihat, buat, dan pindahkan tugas dengan drag & drop. Pantau progres lewat status yang jelas.",
  },
  {
    icon: MessageCircleCodeIcon,
    title: "Pesan & Kolaborasi",
    description: "Terima pesan dari atasan dan ajukan kolaborasi ke rekan kerja. Semua komunikasi di satu tempat.",
  },
  {
    icon: Link2,
    title: "Tautan Aman",
    description: "Simpan kredensial dan akses tautan perusahaan dengan aman. Data Anda terlindungi.",
  },
];

const OnboardingGuide = () => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const key = `onboarding_done_${user.id}`;
    if (!localStorage.getItem(key)) {
      setShow(true);
    }
  }, [user]);

  const handleFinish = () => {
    if (user) localStorage.setItem(`onboarding_done_${user.id}`, "true");
    setShow(false);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleFinish();
  };

  if (!show) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.25 }}
          className="ms-card p-8 max-w-md w-full text-center space-y-5 shadow-xl relative"
        >
          <button
            onClick={handleFinish}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Lewati panduan"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <Icon className="w-7 h-7 " />
          </div>

          <h2 className="text-lg font-bold text-foreground">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step ? "bg-primary w-5" : i < step ? "bg-primary/40" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="ghost" size="sm" onClick={handleFinish} className="text-muted-foreground">
              Lewati
            </Button>
            <Button size="sm" onClick={handleNext} className="gap-1.5">
              {step < STEPS.length - 1 ? (
                <>Lanjut <ArrowRight className="w-3.5 h-3.5" /></>
              ) : (
                "Mulai Bekerja"
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingGuide;
