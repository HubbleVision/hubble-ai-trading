import type { Route } from "./+types/home";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { EnvContext } from "~/context";
import CompetitorChart from "~/features/client.chart";
import Portfolio from "~/features/client.portfolio";
import { OrderList as OrdersList } from "~/features/client.order";
import ChatsList from "~/features/client.chats";
import Logo from "~/svg/logo";
import AsterLogo from "~/svg/aster";
import { useMobile } from "~/hooks/useMobile";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Hubble Trading AI" },
    {
      name: "description",
      content: "Competitor trading performance analysis",
    },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  const { cloudflare } = context.get(EnvContext);

  return { message: cloudflare.env.VALUE_FROM_CLOUDFLARE };
}

type TabType = "portfolio" | "chats" | "orders";

export default function Home({ loaderData }: Route.ComponentProps) {
  const queryClient = useQueryClient();
  const isLessThan500px = useMobile(500);
  const [activeTab, setActiveTab] = useState<TabType>("portfolio");

  // Set up global 10-minute auto refresh for all queries
  useEffect(() => {
    const interval = setInterval(
      () => {
        console.log("[Home] Auto-refreshing all queries (10 min interval)");
        queryClient.invalidateQueries();
      },
      10 * 60 * 1000
    ); // 10 minutes

    return () => clearInterval(interval);
  }, [queryClient]);

  return (
    <>
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
      
      <header className="flex items-center h-14 px-4 lg:px-8 relative border-b border-primary/20 bg-background/90 backdrop-blur-md z-50">
        <section className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-md group-hover:bg-primary/40 transition-all duration-500" />
            <Logo className="relative z-10 w-8 h-8 text-primary" />
          </div>
          {!isLessThan500px && (
            <div className="flex flex-col leading-none">
              <b className="text-xl tracking-tighter font-black text-foreground group-hover:text-primary transition-colors duration-300">
                HUBBLE
              </b>
              <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                Terminal
              </span>
            </div>
          )}
        </section>
        
        <section className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative group">
             {/* Glitch border effect */}
            <div className="absolute -inset-1 bg-linear-to-r from-primary via-accent to-primary opacity-30 blur transition duration-1000 group-hover:opacity-70 group-hover:duration-200" />
            
            <div className="relative px-4 py-1 bg-background border border-primary/50 flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              
              <span className="text-primary text-xs font-bold tracking-[0.2em] uppercase animate-pulse">
                Live Feed
              </span>
              
              <div className="h-4 w-px bg-primary/30 mx-1" />
              
              <AsterLogo className="w-16 text-foreground group-hover:text-accent transition-colors duration-300" />
            </div>
          </div>
        </section>
        
        {/* Decorative header elements */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-1 h-4 bg-primary/20 skew-x-12" />
          ))}
        </div>
      </header>

      {/* Desktop Layout */}
      <main className="hidden lg:flex h-[calc(100vh-56px)] flex-row bg-background/50 relative">
        {/* Chart Section - Main Viewport */}
        <div className="flex-1 border-r border-primary/20 min-h-0 relative overflow-hidden group">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/50 z-20" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/50 z-20" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/50 z-20" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/50 z-20" />
          
          <CompetitorChart />
        </div>

        {/* Middle - Model Chats - Data Stream */}
        <div className="w-[400px] border-r border-primary/20 overflow-hidden bg-black/20 backdrop-blur-sm relative">
          <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent z-10" />
          <ChatsList />
        </div>

        {/* Right - Portfolio + Orders - Control Panel */}
        <div className="w-[400px] flex flex-col bg-black/40">
          {/* Portfolio - Top 50% */}
          <div className="h-1/2 border-b border-primary/20 overflow-hidden relative">
            <Portfolio />
          </div>

          {/* Orders - Bottom 50% */}
          <div className="h-1/2 overflow-hidden relative">
            <OrdersList />
          </div>
        </div>
      </main>

      {/* Mobile Layout - Entirely scrollable */}
      <main className="lg:hidden flex flex-col overflow-y-auto h-[calc(100vh-56px)] bg-background">
        {/* Chart Section - Fixed height */}
        <div className="h-[60vh] border-b border-primary/20 min-h-0 shrink-0 relative">
          <CompetitorChart />
        </div>

        {/* Tab Navigation - Sticky Cyberpunk Tabs */}
        <div className="sticky top-0 z-20 flex bg-background border-b border-primary/20">
          {(['portfolio', 'chats', 'orders'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-4 text-xs font-black uppercase tracking-widest transition-all duration-300 relative overflow-hidden ${
                activeTab === tab
                  ? "text-background"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              {/* Active background slide */}
              <div 
                className={`absolute inset-0 bg-primary transition-transform duration-300 origin-bottom ${
                  activeTab === tab ? 'scale-y-100' : 'scale-y-0'
                }`} 
              />
              
              {/* Tab Content */}
              <span className="relative z-10 flex items-center justify-center gap-2">
                 {tab === 'portfolio' && 'ASSETS'}
                 {tab === 'chats' && 'COMMS'}
                 {tab === 'orders' && 'OPS'}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content - Natural height, scrolls with main */}
        <div className="bg-background min-h-[calc(100vh-106px)] flex flex-col">
          {activeTab === "portfolio" && (
            <div className="w-full flex-1 [&>div]:h-auto! [&>div]:min-h-full! animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Portfolio />
            </div>
          )}
          {activeTab === "chats" && (
            <div className="w-full flex-1 [&>div]:h-auto! [&>div]:min-h-full! [&>div>div]:h-auto! animate-in fade-in slide-in-from-bottom-4 duration-300">
              <ChatsList />
            </div>
          )}
          {activeTab === "orders" && (
            <div className="w-full flex-1 [&>div]:h-auto! [&>div]:min-h-full! animate-in fade-in slide-in-from-bottom-4 duration-300">
              <OrdersList />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
