import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TopNav } from "@/components/TopNav";
import Home from "@/pages/Home";
import StationFinder from "@/pages/StationFinder";
import QAForum from "@/pages/QAForum";
import AdminDashboard from "@/pages/AdminDashboard";
import UserProfile from "@/pages/UserProfile";
import NotFound from "@/pages/not-found";
import avatarMan from "@assets/generated_images/User_avatar_man_9666579e.png";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/stations" component={StationFinder} />
      <Route path="/qa" component={QAForum} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/profile" component={UserProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <TopNav
              userAvatar={avatarMan}
              userName="Alex Rivera"
              notificationCount={3}
            />
            <Router />
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
