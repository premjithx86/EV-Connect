import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Conversation {
  id: string;
  participantAId: string;
  participantBId: string;
  createdAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface ProfilePreview {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

interface ConversationWithMeta extends Conversation {
  otherUserId: string;
  otherProfile: ProfilePreview | null;
  lastMessage: Message | null;
}

export default function MessagesPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [location, setLocation] = useLocation();

  const searchParams = useMemo(() => {
    const [, queryString] = location.split("?");
    return new URLSearchParams(queryString || "");
  }, [location]);

  const conversationsQuery = useQuery<ConversationWithMeta[]>({
    queryKey: ["conversations"],
    enabled: !!user && isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/conversations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load conversations");
      const conversations: Conversation[] = await res.json();

      if (!user) return [];

      const otherUserIds = Array.from(
        new Set(
          conversations.map((conversation) =>
            conversation.participantAId === user.id ? conversation.participantBId : conversation.participantAId
          )
        )
      );

      const profiles = await Promise.all(
        otherUserIds.map(async (userId) => {
          const profileRes = await fetch(`/api/profiles/${userId}`);
          if (!profileRes.ok) {
            return null;
          }
          const data = await profileRes.json();
          return {
            userId,
            displayName: data.displayName || userId,
            avatarUrl: data.avatarUrl ?? null,
          } satisfies ProfilePreview;
        })
      );

      const profileMap = new Map<string, ProfilePreview>();
      profiles.filter(Boolean).forEach((profile) => profileMap.set(profile!.userId, profile!));

      const conversationsWithMeta = await Promise.all(
        conversations.map(async (conversation) => {
          const otherUserId = conversation.participantAId === user.id ? conversation.participantBId : conversation.participantAId;
          const profile = profileMap.get(otherUserId) ?? null;

          const lastMessageRes = await fetch(
            `/api/conversations/${conversation.id}/messages?limit=1`,
            { credentials: "include" }
          );

          let lastMessage: Message | null = null;
          if (lastMessageRes.ok) {
            const messages: Message[] = await lastMessageRes.json();
            lastMessage = messages[0] ?? null;
          }

          return {
            ...conversation,
            otherUserId,
            otherProfile: profile,
            lastMessage,
          } satisfies ConversationWithMeta;
        })
      );

      return conversationsWithMeta.sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
        const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      });
    },
  });

  const selectedConversation = conversationsQuery.data?.find((conversation) => conversation.id === selectedConversationId) ?? null;

  const messagesQuery = useQuery<Message[]>({
    queryKey: ["conversation-messages", selectedConversationId],
    enabled: !!selectedConversationId,
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!selectedConversationId) return;
      const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to send message");
      }
      return res.json() as Promise<Message>;
    },
    onSuccess: (message) => {
      setMessageBody("");
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", "unread-count"] });
      toast({ title: "Message sent" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const markMessageReadMutation = useMutation({
    mutationFn: async ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
      const res = await fetch(`/api/messages/${messageId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversationId }),
      });
      if (!res.ok) {
        throw new Error("Failed to mark message as read");
      }
      return res.json() as Promise<Message>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", "unread-count"] });
    },
  });

  useEffect(() => {
    if (!messagesQuery.data || !selectedConversationId || !user) return;

    const unreadMessages = messagesQuery.data.filter((message) => !message.isRead && message.senderId !== user.id);
    unreadMessages.forEach((message) => {
      markMessageReadMutation.mutate({ conversationId: selectedConversationId, messageId: message.id });
    });
  }, [messagesQuery.data, markMessageReadMutation, selectedConversationId, user]);

  const createConversationMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ participantId }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to start conversation");
      }
      return res.json() as Promise<Conversation>;
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedConversationId(conversation.id);
      setLocation(`/messages?conversation=${conversation.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start conversation",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!user || !isAuthenticated) return;
    const participantId = searchParams.get("user");
    const conversationId = searchParams.get("conversation");

    if (conversationId) {
      setSelectedConversationId(conversationId);
      return;
    }

    if (!participantId || conversationsQuery.isLoading) return;

    const existing = conversationsQuery.data?.find((conversation) => conversation.otherUserId === participantId);
    if (existing) {
      setSelectedConversationId(existing.id);
      return;
    }

    if (!createConversationMutation.isPending) {
      createConversationMutation.mutate(participantId);
    }
  }, [conversationsQuery.data, conversationsQuery.isLoading, createConversationMutation, isAuthenticated, searchParams, setLocation, user]);

  useEffect(() => {
    if (!selectedConversationId) return;
    const search = new URLSearchParams(location.split("?")[1] || "");
    if (search.get("conversation") !== selectedConversationId) {
      search.set("conversation", selectedConversationId);
      search.delete("user");
      setLocation(`/messages?${search.toString()}`);
    }
  }, [location, selectedConversationId, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-64 h-32" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 space-y-4 text-center">
          <h2 className="text-xl font-semibold">Sign in to view your messages</h2>
          <Button onClick={() => setLocation("/login")}>
            Go to login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">Messages</h1>
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <Card className="overflow-hidden">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold uppercase text-muted-foreground">Conversations</h2>
            </div>
            {conversationsQuery.isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : conversationsQuery.isError ? (
              <div className="p-4 text-sm text-destructive">
                Failed to load conversations.
              </div>
            ) : conversationsQuery.data && conversationsQuery.data.length > 0 ? (
              <ScrollArea className="h-[520px]">
                <div className="divide-y">
                  {conversationsQuery.data.map((conversation) => {
                    const isActive = conversation.id === selectedConversationId;
                    const other = conversation.otherProfile;
                    const lastMessage = conversation.lastMessage;
                    const hasUnread = lastMessage ? !lastMessage.isRead && lastMessage.senderId !== user.id : false;
                    const displayName = other?.displayName || conversation.otherUserId;

                    return (
                      <button
                        type="button"
                        key={conversation.id}
                        onClick={() => setSelectedConversationId(conversation.id)}
                        className={`w-full px-4 py-3 text-left transition ${
                          isActive ? "bg-primary/5" : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Link
                            href={`/profiles/${conversation.otherUserId}`}
                            onClick={(event) => event.stopPropagation()}
                            className="flex-shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={other?.avatarUrl ?? undefined} />
                              <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <Link
                                href={`/profiles/${conversation.otherUserId}`}
                                onClick={(event) => event.stopPropagation()}
                                className="font-medium line-clamp-1 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                {displayName}
                              </Link>
                              {lastMessage && (
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                            <p className={`text-sm line-clamp-1 ${hasUnread ? "font-semibold" : "text-muted-foreground"}`}>
                              {lastMessage ? lastMessage.body : "No messages yet"}
                            </p>
                          </div>
                          {hasUnread && <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                You haven't started any conversations yet.
              </div>
            )}
          </Card>

          <Card className="flex h-[640px] flex-col">
            {selectedConversation ? (
              <>
                <div className="border-b px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/profiles/${selectedConversation.otherUserId}`}
                      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedConversation.otherProfile?.avatarUrl ?? undefined} />
                        <AvatarFallback>
                          {(selectedConversation.otherProfile?.displayName || selectedConversation.otherUserId).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <Link
                        href={`/profiles/${selectedConversation.otherUserId}`}
                        className="font-semibold hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {selectedConversation.otherProfile?.displayName || selectedConversation.otherUserId}
                      </Link>
                      <p className="text-xs text-muted-foreground">Started {formatDistanceToNow(new Date(selectedConversation.createdAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                </div>
                <ScrollArea className="flex-1 px-4 py-5">
                  {messagesQuery.isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, index) => (
                        <Skeleton key={index} className="h-12 w-3/4" />
                      ))}
                    </div>
                  ) : messagesQuery.isError ? (
                    <div className="text-sm text-destructive">Failed to load messages.</div>
                  ) : messagesQuery.data && messagesQuery.data.length > 0 ? (
                    <div className="space-y-4">
                      {messagesQuery.data.map((message, index) => {
                        const isMe = message.senderId === user.id;
                        const showReadReceipt =
                          isMe &&
                          message.isRead &&
                          (!messagesQuery.data[index + 1] || messagesQuery.data[index + 1].senderId !== user.id);

                        return (
                          <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
                              isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}>
                              <p className="whitespace-pre-line break-words">{message.body}</p>
                              <div className={`mt-1 text-[10px] ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                              </div>
                              {showReadReceipt && message.readAt && (
                                <div className="mt-1 text-[10px] opacity-75">Read {formatDistanceToNow(new Date(message.readAt), { addSuffix: true })}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Say hello to start the conversation.</div>
                  )}
                </ScrollArea>
                <div className="border-t px-4 py-3">
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const trimmed = messageBody.trim();
                      if (!trimmed) return;
                      sendMessageMutation.mutate(trimmed);
                    }}
                  >
                    <Input
                      placeholder="Type your message..."
                      value={messageBody}
                      onChange={(event) => setMessageBody(event.target.value)}
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button type="submit" disabled={sendMessageMutation.isPending}>
                      {sendMessageMutation.isPending ? "Sending" : "Send"}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose someone from the list to view your chat history.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
