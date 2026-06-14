import { Router, Switch, Route, Redirect } from "wouter";
// Hash-based routing: Render static hosting has no SPA rewrite, so a
// browser reload of /shops 404s. With #/shops the server always gets
// "/" and the router reads the hash — works on any static host.
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import LoginPage from "@/pages/login";
import ShopsPage from "@/pages/shops";
import RidersPage from "@/pages/riders";
import DisputesPage from "@/pages/disputes";
import OrdersPage from "@/pages/orders";
import ApprovalsPage from "@/pages/approvals";
import SettingsPage from "@/pages/settings";
import SettlementsPage from "@/pages/settlements";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function AuthenticatedLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-2 p-2 border-b h-12 shrink-0 sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <span className="text-sm text-muted-foreground">Admin Panel</span>
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/">
                <Redirect to="/shops" />
              </Route>
              <Route path="/shops" component={ShopsPage} />
              <Route path="/riders" component={RidersPage} />
              <Route path="/disputes" component={DisputesPage} />
              <Route path="/orders" component={OrdersPage} />
              <Route path="/approvals" component={ApprovalsPage} />
              <Route path="/settlements" component={SettlementsPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { admin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!admin) {
    return <LoginPage />;
  }

  return <AuthenticatedLayout />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router hook={useHashLocation}>
            <AppContent />
          </Router>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
