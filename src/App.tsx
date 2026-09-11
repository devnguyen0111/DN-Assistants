import { useEffect, useRef, useState } from "react";
import { animate, createScope, stagger } from "animejs";
import { AppHeader } from "@/components/layout/AppHeader";
import { BentoGrid, BentoItem } from "@/components/bento/BentoGrid";
import { ClockCard } from "@/components/cards/ClockCard";
import { CalculatorCard } from "@/components/cards/CalculatorCard";
import { CalendarCard } from "@/components/cards/CalendarCard";
import { AgendaCard } from "@/components/cards/AgendaCard";
import { CpuCard, GpuCard, NetworkCard, RamCard } from "@/components/cards/SystemCards";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { useSystemStats } from "@/hooks/useSystemStats";

function Dashboard() {
  const root = useRef<HTMLDivElement>(null);
  const scope = useRef<ReturnType<typeof createScope> | null>(null);
  const { stats, history } = useSystemStats(1000);
  const [agendaKey, setAgendaKey] = useState(0);

  useEffect(() => {
    if (!root.current) return;
    scope.current = createScope({ root }).add(() => {
      animate(".bento-item", {
        opacity: [0, 1],
        y: [24, 0],
        delay: stagger(60),
        duration: 520,
        ease: "outCubic",
      });
    });
    return () => scope.current?.revert();
  }, []);

  return (
    <div ref={root} className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-6 lg:px-8">
      <AppHeader />
      <BentoGrid>
        <BentoItem className="xl:col-span-2">
          <ClockCard />
        </BentoItem>
        <BentoItem>
          <CpuCard stats={stats} history={history} />
        </BentoItem>
        <BentoItem>
          <RamCard stats={stats} history={history} />
        </BentoItem>
        <BentoItem className="xl:col-span-2 xl:row-span-2">
          <CalendarCard onEventsChanged={() => setAgendaKey((k) => k + 1)} />
        </BentoItem>
        <BentoItem className="xl:col-span-2 xl:row-span-2">
          <CalculatorCard />
        </BentoItem>
        <BentoItem>
          <GpuCard stats={stats} history={history} />
        </BentoItem>
        <BentoItem>
          <NetworkCard stats={stats} history={history} />
        </BentoItem>
        <BentoItem className="xl:col-span-2">
          <AgendaCard refreshKey={agendaKey} />
        </BentoItem>
      </BentoGrid>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <TooltipProvider>
          <Dashboard />
        </TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
