import { useState, useEffect, useCallback, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";
import logoDiamond from "@/assets/logo-diamond.png";
import heroDealImg from "@/assets/hero-deal.jpg";
import jamieAvatar from "@/assets/jamie-avatar.jpg";
import avatarAR from "@/assets/avatar-ar.png.asset.json";
import avatarKL from "@/assets/avatar-kl.png.asset.json";
import avatarMJ from "@/assets/avatar-mj.png.asset.json";

import { DMark } from "@/components/DMark";

function FadedGrid({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`absolute inset-0 h-full w-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M 80 0 L 0 0 0 80" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
        <linearGradient id="grid-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.8" />
          <stop offset="60%" stopColor="white" stopOpacity="0.2" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="grid-mask">
          <rect width="100%" height="100%" fill="url(#grid-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" mask="url(#grid-mask)" />
    </svg>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {children}
    </span>
  );
}

const DEAL_NOTIFICATIONS = [
  { company: "Arcline", amount: "$48,000", time: "just now" },
  { company: "Vantage Co", amount: "$32,500", time: "2m ago" },
  { company: "Helix Labs", amount: "$67,200", time: "5m ago" },
  { company: "Northpeak", amount: "$21,000", time: "8m ago" },
  { company: "Stratos Inc", amount: "$55,800", time: "12m ago" },
];

function StackedNotifications() {
  const [visibleQueue, setVisibleQueue] = useState([0, 1, 2]);
  const [incomingIdx, setIncomingIdx] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "pre" | "animating">("idle");
  const nextRef = useRef(3);
  const animationTimeoutRef = useRef<number | null>(null);
  const cycleIntervalRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startCycle = () => {
      const nextIdx = nextRef.current % DEAL_NOTIFICATIONS.length;
      nextRef.current += 1;

      setIncomingIdx(nextIdx);
      setPhase("pre");

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          setPhase("animating");
        });
      });

      animationTimeoutRef.current = window.setTimeout(() => {
        setVisibleQueue((prev) => [nextIdx, prev[0], prev[1]]);
        setIncomingIdx(null);
        setPhase("idle");
      }, 1680);
    };

    cycleIntervalRef.current = window.setInterval(startCycle, 4000);

    return () => {
      if (cycleIntervalRef.current !== null) {
        window.clearInterval(cycleIntervalRef.current);
      }
      if (animationTimeoutRef.current !== null) {
        window.clearTimeout(animationTimeoutRef.current);
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const cards = incomingIdx === null ? visibleQueue : [...visibleQueue, incomingIdx];

  const getCardStyle = (notifIdx: number) => {
    const currentPos = visibleQueue.indexOf(notifIdx);
    const isIncoming = notifIdx === incomingIdx;

    if (phase === "idle") {
      if (currentPos === 0) return { yOffset: 0, scale: 0.88, opacity: 1, zIndex: 1, blur: 0 };
      if (currentPos === 1) return { yOffset: 14, scale: 0.94, opacity: 1, zIndex: 2, blur: 0 };
      return { yOffset: 28, scale: 1, opacity: 1, zIndex: 3, blur: 0 };
    }

    if (phase === "pre") {
      if (isIncoming) return { yOffset: 0, scale: 0.88, opacity: 0, zIndex: 1, blur: 0 };
      if (currentPos === 0) return { yOffset: 0, scale: 0.88, opacity: 1, zIndex: 1, blur: 0 };
      if (currentPos === 1) return { yOffset: 14, scale: 0.94, opacity: 1, zIndex: 2, blur: 0 };
      return { yOffset: 28, scale: 1, opacity: 1, zIndex: 4, blur: 0 };
    }

    if (isIncoming) return { yOffset: 0, scale: 0.88, opacity: 1, zIndex: 1, blur: 0 };
    if (currentPos === 0) return { yOffset: 14, scale: 0.94, opacity: 1, zIndex: 2, blur: 0 };
    if (currentPos === 1) return { yOffset: 28, scale: 1, opacity: 1, zIndex: 3, blur: 0 };
    return { yOffset: 60, scale: 1.04, opacity: 0, zIndex: 4, blur: 8 };
  };

  return (
    <div className="relative h-[110px]" style={{ width: '100%', minWidth: 340 }}>
      {cards.map((notifIdx) => {
        const { company, amount, time } = DEAL_NOTIFICATIONS[notifIdx];
        const { yOffset, scale, opacity, zIndex, blur } = getCardStyle(notifIdx);
        const shouldTransition = phase === "animating";

        return (
          <div
            key={notifIdx}
            className="absolute bottom-0 left-0 right-0 origin-bottom rounded-xl border border-border bg-card shadow-lg overflow-hidden"
            style={{
              zIndex,
              opacity,
              filter: `blur(${blur}px)`,
              transform: `translateY(-${yOffset}px) scale(${scale})`,
              transition: shouldTransition
                ? "transform 1680ms cubic-bezier(0.22, 1, 0.36, 1), opacity 1680ms cubic-bezier(0.22, 1, 0.36, 1), filter 1680ms cubic-bezier(0.22, 1, 0.36, 1)"
                : "none",
            }}
          >
            <div className="flex relative">
              {/* Orange left bar — inset & rounded */}
              <div className="absolute left-1.5 top-2 bottom-2 w-1 rounded-full bg-orange-500" />
              <div className="min-w-0 p-3 pl-6">
                  <p className="text-[11px] text-muted-foreground">Deal closed · Won · {time}</p>
                  <p className="truncate text-sm font-semibold">{company} — {amount}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Landing() {
  const { session, loading } = useAuth();
  const logo = logoDiamond;
  
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowNav(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!loading && session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="force-light min-h-screen bg-background text-foreground antialiased">

      {/* Nav — appears on scroll */}
      <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 lg:px-20 bg-white/95 backdrop-blur-sm shadow-sm transition-all duration-300 ${showNav ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="flex items-center gap-1.5">
          <DMark className="h-7 w-7 text-foreground" />
          <span className="font-bold text-lg tracking-tight text-foreground">
            Dealflow
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Sign in
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-5">
              Start now
            </Button>
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-white">
        <FadedGrid className="text-foreground/[0.04]" />
        <div className="relative z-10 px-6 md:px-12 lg:px-20 pt-10 pb-20 md:pt-16 md:pb-32">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — Copy */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <DMark className="h-9 w-9 text-foreground" />
                <span className="font-bold text-xl tracking-tight text-foreground">Dealflow</span>
              </div>
              <h1 className="font-sans text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.08] mb-6 text-balance">
                Close more deals<br />with less busywork
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg mb-10 leading-relaxed">
                Dealflow is a single-tenant CRM your team will actually use. Track deals, forecast revenue, and spend time selling — not filling out fields.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link to="/auth">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-base font-semibold px-8 h-12">
                    Get started free
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                
              </div>
            </div>

            {/* Right — Hero image with deal UI overlay */}
            <div className="relative">
              <div className="rounded-2xl aspect-[4/3] overflow-hidden relative">
                <img src={heroDealImg} alt="Two professionals closing a deal" className="w-full h-full object-cover" />
                {/* Gradient overlay for contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent" />
              </div>
              {/* Floating stacked notifications — bottom right */}
              <div className="absolute -bottom-6 -right-4 hidden md:block">
                <StackedNotifications />
              </div>
              {/* Pipeline value card — top left */}
              <div className="absolute -top-3 -left-3 rounded-2xl border border-border bg-card shadow-lg p-4 pb-4 hidden md:block w-[216px]">
                {/* Mini sparkline chart — smooth curves */}
                <svg viewBox="0 0 160 52" className="w-full h-12 mb-2">
                  <defs>
                    <linearGradient id="pipe-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(170 50% 45%)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="hsl(170 50% 45%)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 44 C18 40, 28 38, 42 40 S65 30, 82 32 S105 20, 120 22 S142 14, 155 12 L155 52 L0 52 Z" fill="url(#pipe-grad)" />
                  <path d="M0 44 C18 40, 28 38, 42 40 S65 30, 82 32 S105 20, 120 22 S142 14, 155 12" fill="none" stroke="hsl(170 50% 45%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="155" cy="12" r="3.5" fill="hsl(170 50% 45%)" />
                </svg>
                <div>
                  <p className="text-xs text-muted-foreground">Pipeline value</p>
                  <p className="text-lg font-semibold">$284,500</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="relative z-[2] overflow-hidden rounded-t-[2rem] -mt-8 bg-surface-mint">
        <div className="relative z-10 px-6 md:px-12 lg:px-20 pt-20 pb-28 md:pt-28 md:pb-36">
          <div className="max-w-7xl mx-auto">
            <Pill>Designed for high-touch sales teams</Pill>
            <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight mb-16 max-w-lg mt-5 text-balance">
              Everything you need. Nothing you don't.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Card 1 — 5-minute setup */}
              {/* Card 1 — 5-minute setup */}
              <div className="group">
                <div className="rounded-tl-[2rem] rounded-tr-lg rounded-bl-lg rounded-br-[2rem] p-8 mb-5 aspect-[4/3] flex items-center justify-center overflow-hidden bg-surface-mint-strong">
                  <svg viewBox="0 0 280 200" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Three step cards — evenly spaced */}
                    <rect x="20" y="25" width="75" height="75" rx="12" fill="white" />
                    <rect x="44" y="42" width="28" height="28" rx="7" fill="hsl(170,30%,88%)" />
                    <rect x="49" y="50" width="18" height="4" rx="2" fill="hsl(170,15%,15%)" opacity="0.5" />
                    <rect x="49" y="58" width="10" height="4" rx="2" fill="hsl(170,15%,15%)" opacity="0.25" />
                    <text x="57" y="92" fill="hsl(170,15%,15%)" fontSize="10" fontWeight="600" fontFamily="sans-serif" textAnchor="middle">Import</text>

                    <rect x="103" y="25" width="75" height="75" rx="12" fill="white" />
                    <rect x="118" y="48" width="45" height="6" rx="3" fill="hsl(170,30%,88%)" />
                    <rect x="118" y="48" width="30" height="6" rx="3" fill="hsl(170,15%,15%)" opacity="0.25" />
                    <rect x="118" y="60" width="45" height="6" rx="3" fill="hsl(170,30%,88%)" />
                    <rect x="118" y="60" width="38" height="6" rx="3" fill="hsl(170,15%,15%)" opacity="0.15" />
                    <text x="140" y="92" fill="hsl(170,15%,15%)" fontSize="10" fontWeight="600" fontFamily="sans-serif" textAnchor="middle">Configure</text>

                    <rect x="186" y="25" width="75" height="75" rx="12" fill="white" />
                    <circle cx="223" cy="55" r="14" fill="hsl(170,30%,88%)" />
                    <path d="M216 55 L221 60 L231 50" stroke="hsl(170,15%,15%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="223" y="92" fill="hsl(170,15%,15%)" fontSize="10" fontWeight="600" fontFamily="sans-serif" textAnchor="middle">Ready</text>

                    {/* Bottom pipeline bar */}
                    <rect x="40" y="120" width="200" height="50" rx="12" fill="white" />
                    <rect x="56" y="136" width="50" height="8" rx="4" fill="hsl(170,15%,15%)" opacity="0.7" />
                    <rect x="112" y="136" width="35" height="8" rx="4" fill="hsl(170,15%,15%)" opacity="0.35" />
                    <rect x="153" y="136" width="25" height="8" rx="4" fill="hsl(170,15%,15%)" opacity="0.15" />
                    <rect x="56" y="152" width="120" height="4" rx="2" fill="hsl(170,30%,88%)" />
                  </svg>
                </div>
                <h3 className="font-sans font-semibold text-lg mb-2">5-minute setup</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Import contacts, define your stages, start tracking. No consultants, no config theater.</p>
              </div>

              {/* Card 2 — Team-first design */}
              <div className="group">
                <div className="rounded-tl-[2rem] rounded-tr-lg rounded-bl-lg rounded-br-[2rem] p-8 mb-5 aspect-[4/3] flex items-center justify-center overflow-hidden bg-surface-mint-strong">
                  <svg viewBox="0 0 280 200" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <clipPath id="av1"><circle cx="70" cy="38" r="24" /></clipPath>
                      <clipPath id="av2"><circle cx="140" cy="38" r="24" /></clipPath>
                      <clipPath id="av3"><circle cx="210" cy="38" r="24" /></clipPath>
                    </defs>
                    {/* Avatars — bigger */}
                    <circle cx="70" cy="38" r="27" fill="white" />
                    <circle cx="140" cy="38" r="27" fill="white" />
                    <circle cx="210" cy="38" r="27" fill="white" />
                    <image href={avatarAR.url} x="46" y="14" width="48" height="48" clipPath="url(#av1)" preserveAspectRatio="xMidYMid slice" />
                    <image href={avatarKL.url} x="116" y="14" width="48" height="48" clipPath="url(#av2)" preserveAspectRatio="xMidYMid slice" />
                    <image href={avatarMJ.url} x="186" y="14" width="48" height="48" clipPath="url(#av3)" preserveAspectRatio="xMidYMid slice" />

                    {/* Deal cards — 2 pairs close together */}
                    <rect x="55" y="82" width="75" height="36" rx="8" fill="white" />
                    <rect x="67" y="92" width="40" height="5" rx="2.5" fill="hsl(170,15%,15%)" opacity="0.6" />
                    <rect x="67" y="102" width="24" height="5" rx="2.5" fill="hsl(170,15%,15%)" opacity="0.2" />

                    <rect x="138" y="82" width="75" height="36" rx="8" fill="white" />
                    <rect x="150" y="92" width="44" height="5" rx="2.5" fill="hsl(170,15%,15%)" opacity="0.6" />
                    <rect x="150" y="102" width="30" height="5" rx="2.5" fill="hsl(170,15%,15%)" opacity="0.2" />

                    {/* Row 2 — same positions */}
                    <rect x="55" y="126" width="75" height="32" rx="8" fill="white" opacity="0.6" />
                    <rect x="138" y="126" width="75" height="32" rx="8" fill="white" opacity="0.6" />

                    {/* Bottom card — centered, with room */}
                    <rect x="93" y="166" width="82" height="26" rx="8" fill="white" opacity="0.35" />
                  </svg>
                </div>
                <h3 className="font-sans font-semibold text-lg mb-2">Team-first design</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">See who's working what, spot stalled deals, keep everyone moving — without the micromanagement.</p>
              </div>

              {/* Card 3 — Forecasts */}
              <div className="group">
                <div className="rounded-tl-[2rem] rounded-tr-lg rounded-bl-lg rounded-br-[2rem] p-8 mb-5 aspect-[4/3] flex items-center justify-center overflow-hidden bg-surface-mint-strong">
                  <svg viewBox="0 0 280 190" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Grid lines */}
                    <line x1="50" y1="30" x2="260" y2="30" stroke="hsl(170 30% 76%)" strokeWidth="0.5" />
                    <line x1="50" y1="65" x2="260" y2="65" stroke="hsl(170 30% 76%)" strokeWidth="0.5" />
                    <line x1="50" y1="100" x2="260" y2="100" stroke="hsl(170 30% 76%)" strokeWidth="0.5" />
                    <line x1="50" y1="135" x2="260" y2="135" stroke="hsl(170 30% 76%)" strokeWidth="0.5" />

                    {/* Y-axis labels */}
                    <text x="44" y="34" fill="hsl(170,15%,15%)" fontSize="9" fontWeight="600" fontFamily="sans-serif" textAnchor="end" opacity="0.5">$80k</text>
                    <text x="44" y="69" fill="hsl(170,15%,15%)" fontSize="9" fontWeight="600" fontFamily="sans-serif" textAnchor="end" opacity="0.5">$60k</text>
                    <text x="44" y="104" fill="hsl(170,15%,15%)" fontSize="9" fontWeight="600" fontFamily="sans-serif" textAnchor="end" opacity="0.5">$40k</text>
                    <text x="44" y="139" fill="hsl(170,15%,15%)" fontSize="9" fontWeight="600" fontFamily="sans-serif" textAnchor="end" opacity="0.5">$20k</text>

                    {/* Bars — bottoms at y=155 baseline, moved down from trend line */}
                    <rect x="65" y="108" width="22" height="47" rx="4" fill="white" opacity="0.6" />
                    <rect x="100" y="92" width="22" height="63" rx="4" fill="white" opacity="0.65" />
                    <rect x="135" y="78" width="22" height="77" rx="4" fill="white" opacity="0.7" />
                    <rect x="170" y="62" width="22" height="93" rx="4" fill="white" opacity="0.75" />
                    <rect x="205" y="48" width="22" height="107" rx="4" fill="white" opacity="0.85" />
                    <rect x="240" y="34" width="22" height="121" rx="4" fill="white" />

                    {/* Trend line — pulled higher away from bar tops */}
                    <path d="M76 100 C106 82, 121 74, 146 66 S181 50, 216 38 S241 24, 251 20" stroke="hsl(170,15%,15%)" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 4" opacity="0.45" />
                    <circle cx="251" cy="20" r="4" fill="hsl(170,15%,15%)" opacity="0.55" />

                    {/* X-axis labels */}
                    <text x="76" y="168" fill="hsl(170,15%,15%)" fontSize="9" fontWeight="600" fontFamily="sans-serif" textAnchor="middle" opacity="0.5">Jan</text>
                    <text x="111" y="168" fill="hsl(170,15%,15%)" fontSize="9" fontWeight="600" fontFamily="sans-serif" textAnchor="middle" opacity="0.5">Feb</text>
                    <text x="146" y="168" fill="hsl(170,15%,15%)" fontSize="9" fontWeight="600" fontFamily="sans-serif" textAnchor="middle" opacity="0.5">Mar</text>
                    <text x="181" y="168" fill="hsl(170,15%,15%)" fontSize="9" fontWeight="600" fontFamily="sans-serif" textAnchor="middle" opacity="0.5">Apr</text>
                    <text x="216" y="168" fill="hsl(170,15%,15%)" fontSize="9" fontWeight="600" fontFamily="sans-serif" textAnchor="middle" opacity="0.5">May</text>
                    <text x="251" y="168" fill="hsl(170,15%,15%)" fontSize="9" fontWeight="600" fontFamily="sans-serif" textAnchor="middle" opacity="0.5">Jun</text>
                  </svg>
                </div>
                <h3 className="font-sans font-semibold text-lg mb-2">Forecasts that hold up</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Weighted pipeline and probability scoring that doesn't require a rev-ops hire to trust.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Social proof ─── */}
      <section className="relative z-[3] overflow-hidden bg-white rounded-t-[2rem] -mt-8">
        <FadedGrid className="text-foreground/[0.03]" />
        <div className="relative z-10 px-6 md:px-12 lg:px-20 pt-20 pb-28 md:pt-28 md:pb-36">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Stats */}
              <div>
                <Pill>Early results</Pill>
                <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight mb-10 mt-5 text-balance">
                  Teams that use their CRM close more.
                </h2>
                <div className="grid grid-cols-2 gap-8">
                  {[
                    { stat: "34%", label: "Faster deal velocity" },
                    { stat: "2.4×", label: "More logged activities" },
                    { stat: "< 5 min", label: "Average setup time" },
                    { stat: "91%", label: "Weekly active usage" },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="font-sans text-3xl md:text-4xl font-bold text-primary mb-1">
                        {item.stat}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Testimonial */}
              <div className="rounded-2xl border border-border bg-card p-8 md:p-10 shadow-sm flex gap-6">
                <div className="w-1 rounded-full bg-primary flex-shrink-0" />
                <div>
                  <div className="mb-5">
                    <svg className="h-7 w-7 text-foreground/20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </div>
                  <p className="text-lg text-foreground leading-relaxed mb-8 text-balance">
                    We tried three CRMs before Dealflow. This is the first one my reps didn't abandon by week two.
                  </p>
                  <div className="flex items-center gap-3">
                    <img src={jamieAvatar} alt="Jamie Reeves" className="h-10 w-10 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-semibold">Jamie Reeves</p>
                      <p className="text-xs text-muted-foreground">VP Sales, Arcline Systems</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative bg-foreground overflow-hidden rounded-t-[2rem] -mt-8 z-[4]">
        <div className="relative z-10 px-6 md:px-12 lg:px-20 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-sans text-3xl md:text-5xl font-bold tracking-tight mb-5 text-background text-balance">
              Your pipeline deserves better than a spreadsheet.
            </h2>
            <p className="text-background/60 text-lg mb-10 max-w-xl mx-auto text-balance">
              Free for small teams. Ready in minutes. No procurement process required.
            </p>
            <Link to="/auth">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-base font-semibold px-10 h-12">
                Start closing deals
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground border-t border-background/10 px-6 md:px-12 lg:px-20 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="flex items-center gap-1.5">
            <DMark className="h-6 w-6 text-background" />
            <span className="font-bold text-sm tracking-tight text-background">Dealflow</span>
          </div>
          <div className="flex gap-8 text-sm text-background/50">
            <Link to="/auth" className="hover:text-background transition-colors">Sign in</Link>
            <a href="mailto:hello@dealflow.com" className="hover:text-background transition-colors">Contact</a>
          </div>
          <p className="text-xs text-background/40">© {new Date().getFullYear()} Dealflow</p>
        </div>
      </footer>
    </div>
  );
}
