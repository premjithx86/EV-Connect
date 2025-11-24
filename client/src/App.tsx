// In App.tsx
import { useEffect, useState } from 'react'; 
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TopNav } from "@/components/TopNav";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import StationFinder from "@/pages/StationFinder";
import QAForum from "@/pages/QAForum";
import QuestionDetail from "@/pages/QuestionDetail";
import AdminDashboard from "@/pages/AdminDashboard";
import UserProfile from "@/pages/UserProfile";
import Settings from "@/pages/Settings";
import Bookmarks from "@/pages/Bookmarks";
import Communities from "@/pages/Communities";
import CommunityDetail from "@/pages/CommunityDetail";
import Articles from "@/pages/Articles";
import ArticleDetail from "@/pages/ArticleDetail";
import KnowledgeHub from "@/pages/KnowledgeHub";
import PostDetail from "@/pages/PostDetail";
import Messages from "@/pages/Messages";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && location === "/login") {
      console.log("[Router] Redirecting from login to home");
      setLocation("/");  // Redirect to home
    }
    // Removed redirect to login if not authenticated
  }, [isAuthenticated, isLoading, location, setLocation]); 

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/stations" component={StationFinder} />
      <Route path="/communities" component={Communities} />
      <Route path="/communities/:slug" component={CommunityDetail} />
      <Route path="/articles" component={Articles} />
      <Route path="/articles/:id" component={ArticleDetail} />
      <Route path="/posts/:id" component={PostDetail} />
      <Route path="/knowledge-hub" component={KnowledgeHub} />
      <Route path="/qa" component={QAForum} />
      <Route path="/questions/:id" component={QuestionDetail} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/profile" component={UserProfile} />
      <Route path="/profiles/:userId" component={UserProfile} />
      <Route path="/messages" component={Messages} />
      <Route path="/settings" component={Settings} />
      <Route path="/bookmarks" component={Bookmarks} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user, profile, logout, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <TopNav
        userAvatar={profile?.avatarUrl || undefined}
        userName={profile?.displayName || user?.email || "User"}
        onLogout={logout}
        isAuthenticated={isAuthenticated}
        userRole={user?.role}
        userId={user?.id}
      />
      <Router />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <AuthenticatedApp />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
