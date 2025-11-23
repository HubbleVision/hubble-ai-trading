import type { FC } from "react";
import { useMemo, useState, useRef, useEffect } from "react";

import { cn } from "~/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Markdown } from "~/components/ui/markdown";
import {
  useLatestAnalysisGroups,
  type AnalysisRecordWithTrader,
  type AnalysisGroup,
} from "~/features/analysis-team";
import { getTraderBackgroundColor } from "~/features/client.chart/utils/trader-color";
import { EmptyState } from "~/components/ui/empty-state";
import { EmptyChat } from "~/svg/empty-chat";

/**
 * Format timestamp to readable date string.
 */
function formatDate(timestamp: string | null | undefined): string {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ChatsListProps {
  limit?: number;
}

interface AnalysisDetailPhase {
  title: string;
  markdownContent: string;
  timestamp: string | null;
  index: number;
}

interface AnalysisDetail {
  phases: AnalysisDetailPhase[];
  errorReason?: string;
}

function formatTraderLabel(group: AnalysisGroup): string {
  // Prefer trader name, fallback to traderId if name is not available
  if (group.traderName) return group.traderName;
  const traderId = group.traderId;
  if (traderId.length <= 10) return traderId;
  return `${traderId.slice(0, 4)}…${traderId.slice(-4)}`;
}

/**
 * Produce a short preview of the analysis content.
 */
function getChatPreview(chat: string, maxLines = 3, maxChars = 320) {
  const lines = chat
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let preview = lines.slice(0, maxLines).join("\n");

  if (preview.length > maxChars) {
    preview = `${preview.slice(0, maxChars - 3)}...`;
  } else if (lines.length > maxLines) {
    preview = `${preview}\n...`;
  }

  return preview || chat.slice(0, maxChars);
}

/**
 * Chats list component displaying analysis records grouped by recordId
 * with per-role cards and markdown drawer view.
 * Supports infinite scroll with IntersectionObserver.
 */
export const ChatsList: FC<ChatsListProps> = ({ limit = 10 }) => {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLatestAnalysisGroups({ limit });
  const [selectedTrader, setSelectedTrader] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<AnalysisRecordWithTrader | null>(
    null
  );
  const [drawerTab, setDrawerTab] = useState<"chat" | "detail">("chat");

  // Observer ref for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  // Flatten all groups from all pages
  const allGroups = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.groups);
  }, [data]);

  // Get unique traders from all groups
  const availableTraders = useMemo(() => {
    const traders = new Set(allGroups.map((group) => group.traderId));
    return Array.from(traders).sort();
  }, [allGroups]);

  // Filter groups by selected trader
  const filteredGroups = useMemo(() => {
    if (!selectedTrader) return allGroups;
    return allGroups.filter((group) => group.traderId === selectedTrader);
  }, [allGroups, selectedTrader]);

  // Set up IntersectionObserver for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        rootMargin: "100px", // Start loading when 100px before the element is visible
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    setDrawerTab("chat");
  }, [activeChat]);

  const drawerOpen = Boolean(activeChat);

  const parsedDetail = useMemo<AnalysisDetail | null>(() => {
    if (!activeChat?.jsonValue?.trim()) return null;
    try {
      const parsed = JSON.parse(activeChat.jsonValue) as Partial<AnalysisDetail>;
      const rawPhases = Array.isArray(parsed?.phases) ? parsed.phases : [];
      if (!rawPhases.length) return null;

      const phases = rawPhases
        .map((phase, idx): AnalysisDetailPhase | null => {
          if (!phase || typeof phase !== "object") return null;
          const title =
            typeof (phase as AnalysisDetailPhase).title === "string" &&
            (phase as AnalysisDetailPhase).title.trim().length > 0
              ? (phase as AnalysisDetailPhase).title
              : `Phase ${idx + 1}`;
          const markdownContent =
            typeof (phase as AnalysisDetailPhase).markdownContent === "string"
              ? (phase as AnalysisDetailPhase).markdownContent
              : "";
          const timestamp =
            typeof (phase as AnalysisDetailPhase).timestamp === "string"
              ? (phase as AnalysisDetailPhase).timestamp
              : null;

          return {
            title,
            markdownContent,
            timestamp,
            index: idx + 1,
          };
        })
        .filter((phase): phase is AnalysisDetailPhase => Boolean(phase));

      if (!phases.length) return null;

      const detail: AnalysisDetail = { phases };

      if (typeof parsed.errorReason === "string") {
        detail.errorReason = parsed.errorReason;
      }

      return detail;
    } catch (err) {
      console.warn("Failed to parse analysis detail jsonValue", err);
      return null;
    }
  }, [activeChat]);

  const hasDetail = Boolean(parsedDetail);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col bg-background">
        {/* Header with filter skeleton */}
        <div className="shrink-0 border-b border-border bg-card px-3 py-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
            <div className="h-6 w-16 border border-border bg-muted rounded animate-pulse"></div>
          </div>
        </div>

        {/* Scrollable grouped messages skeleton */}
        <div className="flex-1 overflow-y-auto bg-background custom-scrollbar">
          <div className="divide-y divide-border">
            {[...Array(4)].map((_, groupIdx) => (
              <section key={groupIdx} className="border-border">
                <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-muted">
                  <div
                    className="h-4 w-32 bg-muted-foreground/20 rounded animate-pulse"
                    style={{ animationDelay: `${groupIdx * 0.1}s` }}
                  ></div>
                  <div
                    className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse"
                    style={{ animationDelay: `${groupIdx * 0.1}s` }}
                  ></div>
                </div>

                <div className="divide-y divide-border">
                  {[...Array(2)].map((_, chatIdx) => (
                    <div key={chatIdx} className="w-full bg-card p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div
                          className="h-3 w-20 bg-muted rounded animate-pulse"
                          style={{
                            animationDelay: `${(groupIdx * 2 + chatIdx) * 0.05}s`,
                          }}
                        ></div>
                        <div
                          className="h-3 w-16 bg-muted rounded animate-pulse"
                          style={{
                            animationDelay: `${(groupIdx * 2 + chatIdx) * 0.05 + 0.05}s`,
                          }}
                        ></div>
                      </div>
                      <div className="space-y-1">
                        <div
                          className="h-3 w-full bg-muted rounded animate-pulse"
                          style={{
                            animationDelay: `${(groupIdx * 2 + chatIdx) * 0.05 + 0.1}s`,
                          }}
                        ></div>
                        <div
                          className="h-3 w-4/5 bg-muted rounded animate-pulse"
                          style={{
                            animationDelay: `${(groupIdx * 2 + chatIdx) * 0.05 + 0.15}s`,
                          }}
                        ></div>
                        <div
                          className="h-3 w-3/5 bg-muted rounded animate-pulse"
                          style={{
                            animationDelay: `${(groupIdx * 2 + chatIdx) * 0.05 + 0.2}s`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center">
          <p className="mb-1 text-xs font-bold text-destructive">Failed to load</p>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  if (!data || allGroups.length === 0) {
    if (!isLoading) {
      return (
        <EmptyState
          icon={<EmptyChat className="text-primary/50" />}
          title="No Chat Records"
          description="No model conversation records available to display"
          className="px-4"
        />
      );
    }
  }

  return (
    <Drawer
      direction="right"
      open={drawerOpen}
      onOpenChange={(open) => {
        if (!open) setActiveChat(null);
      }}
    >
      <div className="flex h-full flex-col bg-background">
        {/* Header with filter */}
        <div className="shrink-0 border-b border-border bg-card px-3 py-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold text-foreground tracking-widest">MODEL CHATS</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded border border-border px-2 py-1 text-xs font-semibold transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground"
                >
                  {selectedTrader
                    ? allGroups.find((g) => g.traderId === selectedTrader)
                      ? formatTraderLabel(
                          allGroups.find((g) => g.traderId === selectedTrader)!
                        )
                      : selectedTrader.slice(0, 10)
                    : "All"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover text-popover-foreground border-border">
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Filter by trader
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuRadioGroup
                  value={selectedTrader ?? "all"}
                  onValueChange={(value) => {
                    setSelectedTrader(value === "all" ? null : value);
                  }}
                >
                  <DropdownMenuRadioItem value="all" className="text-xs focus:bg-accent focus:text-accent-foreground">
                    All
                  </DropdownMenuRadioItem>
                  {availableTraders.map((traderId) => {
                    const group = allGroups.find((g) => g.traderId === traderId);
                    return (
                      <DropdownMenuRadioItem
                        key={traderId}
                        value={traderId}
                        className="text-xs focus:bg-accent focus:text-accent-foreground"
                      >
                        {group ? formatTraderLabel(group) : traderId.slice(0, 10)}
                      </DropdownMenuRadioItem>
                    );
                  })}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Scrollable grouped messages */}
        <div className="flex-1 overflow-y-auto bg-background custom-scrollbar">
          {filteredGroups.length === 0 ? (
            <EmptyState
              icon={<EmptyChat className="text-primary/50" />}
              title="No Matching Records"
              description="No chat records match the current filter"
            />
          ) : (
            <div className="divide-y divide-border">
              {filteredGroups.map((group) => {
                const bgColor = getTraderBackgroundColor(
                  group.traderId,
                  availableTraders,
                  group.traderName || "",
                  "",
                  1
                );
                const btnColor = getTraderBackgroundColor(
                  group.traderId,
                  availableTraders,
                  group.traderName || "",
                  "",
                  0.15
                );
                return (
                  <section key={group.key} className="border-border">
                    <div
                      className="flex items-center justify-between border-b border-border px-3 py-2"
                      style={{
                        backgroundColor: bgColor,
                      }}
                    >
                      <span className="text-xs font-bold uppercase tracking-wide text-white mix-blend-difference">
                        {group.traderName || group.traderId}
                      </span>
                      <span className="text-[10px] font-medium text-white mix-blend-difference">
                        {formatDate(group.latest)}
                      </span>
                    </div>

                    <div className="divide-y divide-primary/10">
                      {group.records.map((chat) => (
                        <button
                          key={chat.id}
                          type="button"
                          onClick={() => setActiveChat(chat)}
                          className="w-full bg-card/10 p-3 text-left hover:bg-primary/10 transition-all duration-300 cursor-pointer relative group overflow-hidden border-l-2 border-transparent hover:border-primary"
                          style={{
                            // We overlay the trader color with low opacity, but let CSS handle the main styling
                          }}
                        >
                          <div className="mb-2 flex items-start justify-between gap-2 relative z-10">
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest font-mono group-hover:text-accent transition-colors">
                              {chat.role}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {formatDate(chat.createdAt)}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors font-mono relative z-10 line-clamp-3">
                            {getChatPreview(chat.chat)}
                          </p>
                          
                          {/* Decorative scanline on hover */}
                          <div className="absolute inset-0 bg-linear-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
              
              {/* Observer target for infinite scroll */}
              <div ref={observerTarget} className="h-1 w-full" />
              
              {/* Loading indicator */}
              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-4">
                  <p className="text-xs text-muted-foreground">Loading...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {activeChat && (
        <DrawerContent className="sm:max-w-4xl bg-background border-border">
          <div className="flex h-full flex-col">
            <DrawerHeader className="border-b border-border">
              <div className="flex items-start justify-between gap-4">
                <DrawerTitle className="text-foreground">
                  <span className="uppercase">{activeChat.role}</span>
                </DrawerTitle>
                <DrawerClose className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  Close
                </DrawerClose>
              </div>
              {hasDetail && (
                <div className="mt-6 flex items-center gap-6 border-b border-primary/10 px-2 w-full">
                  <button
                    type="button"
                    onClick={() => setDrawerTab("chat")}
                    className={cn(
                      "pb-2 text-[11px] font-mono uppercase tracking-widest transition-all duration-300 relative",
                      drawerTab === "chat"
                        ? "text-primary font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerTab("detail")}
                    className={cn(
                      "pb-2 text-[11px] font-mono uppercase tracking-widest transition-all duration-300 relative",
                      drawerTab === "detail"
                        ? "text-primary font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Detail
                  </button>
                </div>
              )}
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2 text-foreground">
              {drawerTab === "chat" || !hasDetail ? (
                <Markdown className="pr-2 prose-invert max-w-none">
                  {activeChat.chat}
                </Markdown>
              ) : (
                <div className="space-y-4 pr-2">
                  {parsedDetail?.phases?.map((phase) => (
                    <div
                      key={`${phase.index}-${phase.title}`}
                      className="relative overflow-hidden rounded-lg border border-primary/20 bg-card/60 p-4 shadow-[0_10px_40px_-24px_rgba(0,0,0,0.6)]"
                    >
                      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />
                      <div className="absolute left-0 top-6 bottom-0 w-px bg-linear-to-b from-primary/40 via-transparent to-transparent" />
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="text-xl font-black text-primary/40 font-mono select-none">
                            {String(phase.index).padStart(2, '0')}
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-primary">
                              {phase.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              Phase checkpoint
                            </p>
                          </div>
                        </div>
                        {phase.timestamp && (
                          <span className="text-[10px] font-mono uppercase text-muted-foreground">
                            {formatDate(phase.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="mt-4 rounded-md border border-border/60 bg-background/80 p-3">
                        <Markdown variant="phase" className="prose-invert max-w-none">
                          {phase.markdownContent}
                        </Markdown>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      )}
    </Drawer>
  );
};
