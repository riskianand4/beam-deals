import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4 max-w-md"
      >
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
          <FileQuestion className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-5xl font-bold text-foreground">404</h1>
        <p className="text-lg text-muted-foreground">Halaman tidak ditemukan</p>
        <p className="text-sm text-muted-foreground">
          Halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>
        <Button asChild>
          <a href="/">Kembali ke Beranda</a>
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFound;
