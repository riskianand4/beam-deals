import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TaskProvider } from "@/contexts/TaskContext";
import { VaultProvider } from "@/contexts/VaultContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { MessageProvider } from "@/contexts/MessageContext";
import { MenuSettingsProvider } from "@/contexts/MenuSettingsContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Login from "./pages/Login";
import AppLayout from "./components/AppLayout";

// Lazy load pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Notes = lazy(() => import("./pages/Notes"));
const Team = lazy(() => import("./pages/Team"));
const MyTeam = lazy(() => import("./pages/MyTeam"));
const TeamDetail = lazy(() => import("./pages/TeamDetail"));
const Vault = lazy(() => import("./pages/Vault"));
const Settings = lazy(() => import("./pages/Settings"));
const ActivityLog = lazy(() => import("./pages/ActivityLog"));
const Messages = lazy(() => import("./pages/Messages"));
const Attendance = lazy(() => import("./pages/Attendance"));
const AttendanceProof = lazy(() => import("./pages/AttendanceProof"));
const Finance = lazy(() => import("./pages/Finance"));
const Payslip = lazy(() => import("./pages/Payslip"));
const Profile = lazy(() => import("./pages/Profile"));
const Accounts = lazy(() => import("./pages/Accounts"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Approval = lazy(() => import("./pages/Approval"));
const Partner = lazy(() => import("./pages/Partner"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Explorer = lazy(() => import("./pages/Explorer"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="space-y-4 animate-pulse p-2">
    <div className="h-8 w-48 bg-muted rounded-lg" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-muted rounded-xl" />
      ))}
    </div>
    <div className="h-64 bg-muted rounded-xl" />
  </div>
);

const SP = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const TeamPage = () => {
  const { isAdmin } = useAuth();
  return isAdmin ? <Team /> : <MyTeam />;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<SP><Dashboard /></SP>} />

        {/* Vault */}
        <Route path="/vault" element={<SP><Vault /></SP>} />
        <Route path="/vault/:employeeId" element={<SP><Vault /></SP>} />
        <Route path="/vault/:employeeId/add" element={<SP><Vault /></SP>} />
        <Route path="/vault/:employeeId/edit/:linkId" element={<SP><Vault /></SP>} />

        {/* Notes */}
        <Route path="/notes" element={<SP><Notes /></SP>} />
        <Route path="/notes/:employeeId" element={<SP><Notes /></SP>} />

        {/* Attendance */}
        <Route path="/attendance" element={<SP><Attendance /></SP>} />

        {/* Finance */}
        <Route path="/finance" element={<SP><Finance /></SP>} />
        <Route path="/finance/:employeeId" element={<SP><Finance /></SP>} />

        {/* Payslip */}
        <Route path="/payslip" element={<SP><Payslip /></SP>} />
        <Route path="/payslip/:employeeId" element={<SP><Payslip /></SP>} />
        <Route path="/payslip/:employeeId/add" element={<SP><Payslip /></SP>} />
        <Route path="/payslip/:employeeId/edit/:slipId" element={<SP><Payslip /></SP>} />

        {/* Tasks */}
        <Route path="/tasks" element={<SP><Tasks /></SP>} />
        <Route path="/tasks/:employeeId" element={<SP><Tasks /></SP>} />

        {/* Messages */}
        <Route path="/messages" element={<SP><Messages /></SP>} />
        <Route path="/messages/:employeeId" element={<SP><Messages /></SP>} />

        <Route path="/profile" element={<SP><Profile /></SP>} />
        <Route path="/profile/:userId" element={<SP><Profile /></SP>} />
        <Route path="/team" element={<SP><TeamPage /></SP>} />
        <Route path="/team/:teamId" element={<AdminRoute><SP><TeamDetail /></SP></AdminRoute>} />
        <Route path="/settings" element={<SP><Settings /></SP>} />
        <Route path="/accounts" element={<AdminRoute><SP><Accounts /></SP></AdminRoute>} />
        <Route path="/activity" element={<SP><ActivityLog /></SP>} />
        <Route path="/approval" element={<SP><Approval /></SP>} />
        <Route path="/partner" element={<SP><Partner /></SP>} />
        <Route path="/pengumuman" element={<SP><Announcements /></SP>} />
        <Route path="/notifications" element={<SP><Notifications /></SP>} />
        <Route path="/explorer" element={<SP><Explorer /></SP>} />
      </Route>
      <Route path="*" element={<SP><NotFound /></SP>} />
    </Routes>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <MenuSettingsProvider>
              <TaskProvider>
                <VaultProvider>
                  <MessageProvider>
                    <SidebarProvider>
                      <BrowserRouter>
                        <AppRoutes />
                      </BrowserRouter>
                    </SidebarProvider>
                  </MessageProvider>
                </VaultProvider>
              </TaskProvider>
            </MenuSettingsProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
