import { useEffect, useMemo, useRef, useState, type HTMLAttributes } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Search,
  Users,
  MessageSquareText,
  MapPin,
  User as UserIcon,
  Loader2,
} from "lucide-react";

interface SearchEntityBase {
  id: string;
}

interface SearchCommunity extends SearchEntityBase {
  name: string;
  slug?: string | null;
  description?: string | null;
  membersCount?: number | null;
}

interface SearchPost extends SearchEntityBase {
  title?: string | null;
  text: string;
  communityId?: string | null;
}

interface SearchStation extends SearchEntityBase {
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

interface SearchUser extends SearchEntityBase {
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

interface SearchResponse {
  communities: SearchCommunity[];
  posts: SearchPost[];
  stations: SearchStation[];
  users: SearchUser[];
}

type SuggestionItem =
  | { type: "community"; label: string; secondary?: string; data: SearchCommunity }
  | { type: "post"; label: string; secondary?: string; data: SearchPost }
  | { type: "station"; label: string; secondary?: string; data: SearchStation }
  | { type: "user"; label: string; secondary?: string; data: SearchUser };

const CATEGORY_META: Record<SuggestionItem["type"], { icon: JSX.Element; title: string }> = {
  community: { icon: <Users className="h-3.5 w-3.5" />, title: "Communities" },
  post: { icon: <MessageSquareText className="h-3.5 w-3.5" />, title: "Posts" },
  station: { icon: <MapPin className="h-3.5 w-3.5" />, title: "Stations" },
  user: { icon: <UserIcon className="h-3.5 w-3.5" />, title: "Users" },
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatch(text: string, query: string) {
  if (!text) return text;
  if (!query) return text;

  const safeQuery = escapeRegExp(query);
  const regex = new RegExp(`(${safeQuery})`, "ig");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={index} className="font-semibold text-foreground">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

function buildSuggestionItems(data: SearchResponse): SuggestionItem[] {
  return [
    ...data.communities.map((community) => ({
      type: "community" as const,
      label: community.name,
      secondary: community.description || undefined,
      data: community,
    })),
    ...data.posts.map((post) => ({
      type: "post" as const,
      label: post.title || post.text.slice(0, 80),
      secondary: post.title ? post.text : undefined,
      data: post,
    })),
    ...data.stations.map((station) => ({
      type: "station" as const,
      label: station.name,
      secondary: station.address || station.city || undefined,
      data: station,
    })),
    ...data.users.map((user) => ({
      type: "user" as const,
      label: user.displayName || user.email || "Unknown user",
      secondary: user.email || undefined,
      data: user,
    })),
  ];
}

function groupResults(data?: SearchResponse) {
  if (!data) return [] as Array<{ type: SuggestionItem["type"]; items: SuggestionItem[] }>;

  return [
    { type: "community" as const, items: data.communities.map((community) => ({
        type: "community" as const,
        label: community.name,
        secondary: community.description || undefined,
        data: community,
      })) },
    { type: "post" as const, items: data.posts.map((post) => ({
        type: "post" as const,
        label: post.title || post.text.slice(0, 80),
        secondary: post.text,
        data: post,
      })) },
    { type: "station" as const, items: data.stations.map((station) => ({
        type: "station" as const,
        label: station.name,
        secondary: station.address || station.city || undefined,
        data: station,
      })) },
    { type: "user" as const, items: data.users.map((user) => ({
        type: "user" as const,
        label: user.displayName || user.email || "Unknown user",
        secondary: user.email || undefined,
        data: user,
      })) },
  ].filter((group) => group.items.length > 0);
}

interface GlobalSearchProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  inputClassName?: string;
}

export function GlobalSearch({ className, inputClassName, ...rest }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"suggestions" | "results">("suggestions");
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestionsQuery = useQuery<SearchResponse>({
    queryKey: ["search-suggestions", debouncedQuery],
    enabled: debouncedQuery.length > 0,
    queryFn: async () => {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(debouncedQuery)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to load suggestions");
      }
      return res.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const resultsQuery = useQuery<SearchResponse>({
    queryKey: ["search-results", submittedQuery],
    enabled: Boolean(submittedQuery),
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(submittedQuery ?? "")}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to load search results");
      }
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const suggestions = useMemo(() => {
    if (!suggestionsQuery.data) return [] as SuggestionItem[];
    return buildSuggestionItems(suggestionsQuery.data);
  }, [suggestionsQuery.data]);

  const totalSuggestions = suggestions.length;

  const handleFocus = () => {
    if (query.trim().length === 0) return;
    setIsOpen(true);
    setMode("suggestions");
  };

  const handleSubmitSearch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSubmittedQuery(trimmed);
    setMode("results");
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleSelect = (item: SuggestionItem) => {
    setIsOpen(false);
    setActiveIndex(-1);
    setQuery("");
    setSubmittedQuery(null);

    if (item.type === "community") {
      if (item.data.slug) {
        navigate(`/communities/${item.data.slug}`);
      } else {
        navigate(`/communities`);
      }
    }

    if (item.type === "post") {
      navigate(`/posts/${item.data.id}`);
    }

    if (item.type === "station") {
      navigate(`/stations?stationId=${item.data.id}`);
    }

    if (item.type === "user") {
      navigate(`/profile?user=${item.data.id}`);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || mode !== "suggestions" || totalSuggestions === 0) {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSubmitSearch(query);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % totalSuggestions);
      setMode("suggestions");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + totalSuggestions) % totalSuggestions);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && activeIndex < totalSuggestions) {
        handleSelect(suggestions[activeIndex]);
      } else {
        handleSubmitSearch(query);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  useEffect(() => {
    if (debouncedQuery.length > 0) {
      setIsOpen(true);
      setMode((prev) => (prev === "results" ? prev : "suggestions"));
    } else {
      setIsOpen(false);
    }
  }, [debouncedQuery]);

  const groupedResults = useMemo(() => groupResults(resultsQuery.data), [resultsQuery.data]);

  const hasResults = groupedResults.some((group) => group.items.length > 0);

  return (
    <div className={cn("relative w-full", className)} ref={containerRef} {...rest}>
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setMode("suggestions");
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search communities, posts, stations, users..."
          className={cn("w-full pl-9 h-10 rounded-md bg-muted/40 border-input focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0", inputClassName)}
          data-testid="input-global-search"
        />
      </div>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-2 w-full min-w-[280px] max-w-[480px] bg-popover shadow-lg">
          {mode === "suggestions" && (
            <div className="max-h-96 overflow-hidden">
              {suggestionsQuery.isLoading ? (
                <div className="space-y-2 p-4">
                  {[...Array(4)].map((_, index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                  ))}
                </div>
              ) : totalSuggestions === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No suggestions yet. Keep typing to search.
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="divide-y">
                    {suggestions.map((item, index) => (
                      <button
                        type="button"
                        key={`${item.type}-${item.data.id}`}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                          index === activeIndex ? "bg-accent" : "hover:bg-accent/60"
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => handleSelect(item)}
                      >
                        <span className="mt-0.5 text-muted-foreground">
                          {CATEGORY_META[item.type].icon}
                        </span>
                        <span className="flex-1 text-sm leading-tight">
                          <div className="font-medium text-foreground">
                            {highlightMatch(item.label, query)}
                          </div>
                          {item.secondary && (
                            <div className="line-clamp-1 text-xs text-muted-foreground">
                              {highlightMatch(item.secondary, query)}
                            </div>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {mode === "results" && (
            <div className="max-h-[480px]">
              {resultsQuery.isFetching ? (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching "{submittedQuery}"
                </div>
              ) : !hasResults ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No results for "{submittedQuery}" yet. Try a different keyword.
                </div>
              ) : (
                <ScrollArea className="max-h-[480px]">
                  <div className="space-y-4 p-4">
                    {groupedResults.map((group) => (
                      <div key={group.type} className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {CATEGORY_META[group.type].icon}
                          {CATEGORY_META[group.type].title}
                        </div>
                        <div className="space-y-2">
                          {group.items.map((item) => (
                            <button
                              type="button"
                              key={`${group.type}-${item.data.id}`}
                              className="w-full rounded-md border border-border/60 px-3 py-2 text-left transition-colors hover:bg-accent"
                              onClick={() => handleSelect(item)}
                            >
                              <div className="text-sm font-medium text-foreground">
                                {highlightMatch(item.label, submittedQuery ?? "")}
                              </div>
                              {item.secondary && (
                                <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                  {highlightMatch(item.secondary, submittedQuery ?? "")}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
