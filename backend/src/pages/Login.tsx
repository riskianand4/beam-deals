import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { motion } from "framer-motion";
import mesjid from "../assets/BackGround/bg.png";
import logo from "../assets/Logo/Logo.png";
const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Silakan masukkan alamat email Anda.");
      return;
    }
    if (!password) {
      setError("Silakan masukkan kata sandi.");
      return;
    }

    setLoading(true);
    try {
      const success = await login(email, password);
      if (!success) setError("Email atau kata sandi tidak valid.");
    } catch {
      setError("Gagal terhubung ke server. Pastikan backend berjalan.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <svg
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          pointerEvents: "none",
        }}
      >
        <filter id="noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.35"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>

      {/* Left: Form Side */}
      <div
        className="flex-1 flex flex-col relative overflow-hidden z-10 shadow-[5px_4px_4px_RGB(0,0,0,0.55)]"
        style={{ backgroundColor: "#161917" }}
      >
        {/* Noise overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
          style={{ filter: "url(#noiseFilter)", width: "100%", height: "100%" }}
        />

        <div className="relative z-10 flex flex-col h-full px-8 sm:px-12 lg:px-16 py-24">
          {/* Center: Form */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm mx-auto lg:mx-0"
          >
            {/* Logo */}
            <div className=" items-center space-y-2 mb-8 ">
              <div className="w-40 rounded-xl flex items-center justify-center">
                <img src={logo} alt="Mesjid" />
              </div>
              <p className="text-sm mb-8" style={{ color: "#ABABAB" }}>
                Silahkan Login Untuk Melanjutkan
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs"
                  style={{ color: "#ABABAB" }}
                >
                  Email
                </Label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "#ABABAB" }}
                  />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@telnet.co.id"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    className="pl-10 h-14 text-sm border-2 focus-visible:ring-1 focus-visible:ring-white/20 shadow-[0px_4px_0px_rgba(0,0,0,0.35)] border-white/20"
                    style={{ backgroundColor: "#202422", color: "#ABABAB" }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-xs"
                  style={{ color: "#ABABAB" }}
                >
                  Kata Sandi
                </Label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "#ABABAB" }}
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-14 shadow-[0px_4px_0px_rgba(0,0,0,0.35)] text-sm border-2 focus-visible:ring-1 focus-visible:ring-white/20  border-white/20"
                    style={{ backgroundColor: "#202422", color: "#ABABAB" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80 "
                    style={{ color: "#ABABAB" }}
                  >
                    {showPassword
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  className="text-xs hover:underline opacity-35"
                  style={{ color: "#ABABAB" }}
                >
                  Lupa kata sandi?
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg px-3 py-2"
                  style={{
                    backgroundColor: "rgba(220, 38, 38, 0.15)",
                    border: "1px solid rgba(220, 38, 38, 0.25)",
                  }}
                >
                  <p
                    className="text-xs text-center"
                    style={{ color: "#f87171" }}
                  >
                    {error}
                  </p>
                </motion.div>
              )}

              <Button
                type="submit"
                className="w-full h-14 text-sm font-medium border-0 hover:opacity-90 transition-opacity shadow-[0px_4px_0px_rgba(0,0,0,0.35)]"
                style={{ backgroundColor: "#262D27", color: "#ABABAB" }}
                disabled={loading}
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  : <LogIn className="w-4 h-4 mr-2" />}
                {loading ? "Sedang masuk..." : "Masuk"}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Right: Illustration Side */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[60%] relative overflow-hidden flex-col "
        style={{ backgroundColor: "#202422" }}
      >
        {/* Noise overlay */}
        {/* Noise overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[1] mix-blend-overlay z-50"
          style={{
            filter: "url(#noiseFilter)",
            backgroundColor: "transparent", 
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative z-10 flex flex-col items-start text-start px-12 mt-44"
        >
          {/* Tagline */}
          <h2
            className="text-lg font-bold  mb-2 leading-relaxed"
            style={{ color: "#ABABAB" }}
          >
            Portal Layanan Mandiri
          </h2>
          <p
            className="text-xs leading-relaxed max-w-md mb-4 "
            style={{ color: "#ABABAB" }}
          >
            Kelola tugas, kehadiran, dan keuangan Anda dalam satu platform terintegrasi.
          </p>
          <p
            className="text-xs leading-relaxed max-w-md"
            style={{ color: "#ABABAB" }}
          >
            Akses berbagai informasi dan pekerjaan harian dengan lebih mudah, cepat, dan efesien
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
