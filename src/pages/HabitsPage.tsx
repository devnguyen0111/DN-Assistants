import { PageLayout } from "@/components/layout/PageLayout";
import { HabitsCard } from "@/components/cards/HabitsCard";

export function HabitsPage() {
  return (
    <PageLayout route="habits">
      <HabitsCard />
    </PageLayout>
  );
}
