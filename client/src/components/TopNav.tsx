import { useEffect, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "./ThemeToggle";
import {
  Bell,
  Menu,
  Search,
  Zap,
  LogIn,
  UserPlus,
  Users,
  Newspaper,
  BookOpen,
  MessageSquare,
  MapPin,
  Shield,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useToast } from "@/hooks/use-toast";

interface NotificationItem {
  id: string;
  type: string;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

interface ProfileSummary {
  displayName?: string | null;
  avatarUrl?: string | null;
}

interface TopNavProps {
  onMenuClick?: () => void;
  userAvatar?: string;
  userName?: string;
  onLogout?: () => void;
  isAuthenticated?: boolean;
  userRole?: string;
  userId?: string;
}

export function TopNav({
  onMenuClick,
  userAvatar,
  userName = "User",
  onLogout,
  isAuthenticated = false,
  userRole,
  userId,
}: TopNavProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery<NotificationItem[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load notifications");
      return res.json();
    },
    enabled: isAuthenticated && !!userId,
    refetchInterval: 30_000,
  });

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const unreadMessagesQuery = useQuery<number>({
    queryKey: ["messages", "unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/messages/unread-count", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load unread message count");
      const data = await res.json();
      return typeof data.count === "number" ? data.count : 0;
    },
    enabled: isAuthenticated && !!userId,
    refetchInterval: 30_000,
  });

  const unreadMessagesCount = unreadMessagesQuery.data ?? 0;

  const actorProfiles = useMemo(() => {
    const cache = new Map<string, ProfileSummary>();
    notifications.forEach((notification) => {
      if (!notification.actorId || cache.has(notification.actorId)) {
        return;
      }
      const key = ["profile", notification.actorId];
      const cached = queryClient.getQueryData<ProfileSummary>(key);
      if (cached) {
        cache.set(notification.actorId, cached);
      }
    });
    return cache;
  }, [notifications, queryClient]);

  useEffect(() => {
    notifications.forEach((notification) => {
      if (!notification.actorId) {
        return;
      }
      queryClient.prefetchQuery({
        queryKey: ["profile", notification.actorId],
        queryFn: async () => {
          const res = await fetch(`/api/profiles/${notification.actorId}`);
          if (!res.ok) throw new Error("Failed to load profile");
          return res.json();
        },
      });
    });
  }, [notifications, queryClient]);

  const markNotificationRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark notification as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update notification",
        variant: "destructive",
      });
    },
  });

  const markAllNotificationsRead = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark notifications as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update notifications",
        variant: "destructive",
      });
    },
  });

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markNotificationRead.mutate(notification.id);
    }

    if (!notification.targetType || !notification.targetId) {
      return;
    }

    switch (notification.targetType) {
      case "POST":
        setLocation(`/posts/${notification.targetId}`);
        break;
      case "PROFILE":
        setLocation(`/profiles/${notification.targetId}`);
        break;
      default:
        break;
    }
  };

  const renderNotificationContent = (notification: NotificationItem) => {
    const actor = notification.actorId ? actorProfiles.get(notification.actorId) : undefined;
    const actorName = actor?.displayName || "Someone";

    switch (notification.type) {
      case "NEW_POST":
        return `${actorName} posted a new update.`;
      case "POST_LIKED":
        return `${actorName} liked your post.`;
      case "POST_COMMENTED":
        return `${actorName} commented on your post.`;
      default:
        return "You have a new notification.";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
          data-testid="button-menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-display font-bold text-xl hidden sm:inline">EV Connect</span>
          </div>
        </Link>

        <NavigationMenu className="hidden lg:flex ml-6">
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href="/communities">
                <NavigationMenuLink className={navigationMenuTriggerStyle()} active={location === "/communities"}>
                  <Users className="h-4 w-4 mr-2" />
                  Communities
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/articles">
                <NavigationMenuLink className={navigationMenuTriggerStyle()} active={location === "/articles"}>
                  <Newspaper className="h-4 w-4 mr-2" />
                  Articles
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/knowledge-hub">
                <NavigationMenuLink className={navigationMenuTriggerStyle()} active={location === "/knowledge-hub"}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Knowledge Hub
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/qa">
                <NavigationMenuLink className={navigationMenuTriggerStyle()} active={location === "/qa"}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Q&A
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/stations">
                <NavigationMenuLink className={navigationMenuTriggerStyle()} active={location === "/stations"}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Stations
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            {userRole === "ADMIN" && (
              <NavigationMenuItem>
                <Link href="/admin">
                  <NavigationMenuLink className={navigationMenuTriggerStyle()} active={location === "/admin"}>
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Dashboard
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden xl:flex flex-1 items-center justify-center px-4">
          <GlobalSearch className="w-full max-w-md" inputClassName="h-9" data-testid="input-search" />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-search">
            <Search className="h-5 w-5" />
          </Button>

          {isAuthenticated ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                data-testid="button-messages"
                onClick={() => setLocation("/messages")}
              >
                <Mail className="h-5 w-5" />
                {unreadMessagesCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                  </Badge>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div>
                      <p className="text-sm font-semibold">Notifications</p>
                      <p className="text-xs text-muted-foreground">
                        {notifications.length === 0 ? "You're all caught up" : `${unreadCount} unread`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      disabled={unreadCount === 0 || markAllNotificationsRead.isPending}
                      onClick={() => markAllNotificationsRead.mutate()}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark all read
                    </Button>
                  </div>

                  <ScrollArea className="max-h-80">
                    <div className="divide-y">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No notifications yet. Engage with the community to receive updates.
                        </div>
                      ) : (
                        notifications.map((notification) => {
                          const actor =
                            notification.actorId && actorProfiles.has(notification.actorId)
                              ? actorProfiles.get(notification.actorId)
                              : undefined;

                          return (
                            <button
                              key={notification.id}
                              type="button"
                              onClick={() => handleNotificationClick(notification)}
                              className={`flex w-full gap-3 px-4 py-3 text-left transition ${
                                notification.isRead ? "bg-background" : "bg-primary/5"
                              } hover:bg-muted`}
                            >
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={actor?.avatarUrl ?? undefined} />
                                <AvatarFallback>
                                  {(actor?.displayName || "?").charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-sm leading-snug">
                                  {renderNotificationContent(notification)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
              <Bell className="h-5 w-5" />
            </Button>
          )}

          <ThemeToggle />

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                  data-testid="button-user-menu"
                  onClick={() => {
                    if (userId) {
                      queryClient.prefetchQuery({
                        queryKey: ["profile", userId],
                        queryFn: async () => {
                          const res = await fetch(`/api/profiles/${userId}`);
                          if (!res.ok) throw new Error("Failed to load profile");
                          return res.json();
                        },
                      });
                    }
                  }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userAvatar} />
                    <AvatarFallback>{userName.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={userId ? `/profiles/${userId}` : "/profile"}>Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/bookmarks">My Bookmarks</Link>
                </DropdownMenuItem>
                {userRole === "ADMIN" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} data-testid="button-logout">
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" data-testid="button-login">
                  <LogIn className="h-4 w-4 mr-2" />
                  Log in
                </Button>
              </Link>
              <Link href="/login?signup=true">
                <Button size="sm" data-testid="button-signup">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
