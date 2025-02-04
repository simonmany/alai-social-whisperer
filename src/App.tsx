import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ConnectCalendar from "./pages/ConnectCalendar";
import CalendarCallback from "./pages/CalendarCallback";
import CalendarView from "./pages/CalendarView";
import EmailCalendarConnect from "./pages/EmailCalendarConnect";
import EmailCalendarCallback from "./pages/EmailCalendarCallback";
import ContactsView from "./pages/ContactsView";

const queryClient = new QueryClient();

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Loading...</p>
          <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/connect/calendar"
              element={
                <ProtectedRoute>
                  <ConnectCalendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar/callback"
              element={
                <ProtectedRoute>
                  <CalendarCallback />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <CalendarView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/email-calendar/connect"
              element={
                <ProtectedRoute>
                  <EmailCalendarConnect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/email-calendar/callback"
              element={
                <ProtectedRoute>
                  <EmailCalendarCallback />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contacts"
              element={
                <ProtectedRoute>
                  <ContactsView />
                </ProtectedRoute>
              }
            />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;