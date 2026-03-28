import { useState, createContext, useContext } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, BarChart3, Users, Zap } from "lucide-react";
import { z } from "zod";
import { sanitizeErrorMessage } from "@/lib/sanitize";
import { DMark } from "@/components/DMark";
import { lovable } from "@/integrations/lovable/index";
import { Separator } from "@/components/ui/separator";

import authBgAsset from "@/assets/auth-bg.jpg.asset.json";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Name must be under 100 characters"),
});

type AuthStyle = "mint" | "dark" | "photo";


export default function Auth() {
  const { session, loading } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [authStyle] = useState<AuthStyle>("mint");
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const schema = isLogin ? loginSchema : signupSchema;
    const parsed = schema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((err) => { errs[err.path[0] as string] = err.message; });
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
        if (error) throw error;
      } else {
        const data = parsed.data as z.infer<typeof signupSchema>;
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: { full_name: data.fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We sent you a confirmation link to verify your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: sanitizeErrorMessage(error.message || "Unknown error"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Style config per variant
  const isDark = authStyle === "dark";
  const isPhoto = authStyle === "photo";
  const isMint = authStyle === "mint";

  const leftPanelClasses = isMint
    ? "bg-surface-mint"
    : isDark
    ? "bg-teal-dark"
    : "relative";

  const textColor = isMint ? "text-foreground" : "text-white";
  const subtextColor = isMint ? "text-muted-foreground" : "text-white/60";
  const footerColor = isMint ? "text-muted-foreground/60" : "text-white/30";

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className={`hidden lg:flex lg:w-1/2 overflow-hidden ${leftPanelClasses}`}>
        {/* Photo background */}
        {isPhoto && (
          <>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${authBgAsset.url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/75" />
          </>
        )}

        {/* Dark subtle glow */}
        {isDark && (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: "radial-gradient(ellipse at 30% 80%, hsl(var(--teal-data) / 0.4), transparent 60%)",
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-2">
            <DMark className="h-9 w-9" />
            <span className="font-bold text-xl tracking-tight">Dealflow</span>
          </div>

          <div className="space-y-6">
            <h1 className={`text-5xl lg:text-6xl font-bold leading-[1.08] ${textColor}`}>
              Close more deals,<br />
              less chaos.
            </h1>
            <p className={`text-lg max-w-md leading-relaxed ${subtextColor}`}>
              The visual CRM that your sales team will actually love using.
              Drag, drop, and close.
            </p>
          </div>

          <p className={`text-sm ${footerColor}`}>
            © 2026 Dealflow. Built for modern sales teams.
          </p>
        </div>
      </div>

      {/* Right panel — pure white, no card */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 bg-white dark:bg-card">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold mb-1">
            {isLogin ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            {isLogin ? "Sign in to your pipeline" : "Start closing deals in minutes"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                  maxLength={100}
                />
                {fieldErrors.fullName && <p className="text-xs text-destructive">{fieldErrors.fullName}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                required
                maxLength={255}
              />
              {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                maxLength={128}
              />
              {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Sign in" : "Create account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-card px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              const { error } = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (error) {
                toast({ title: "Error", description: String(error), variant: "destructive" });
              }
            }}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Sign in with Google
          </Button>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
