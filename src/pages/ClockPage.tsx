import { PageLayout } from "@/components/layout/PageLayout";
import { ClockCard } from "@/components/cards/ClockCard";

export function ClockPage() {
  return (
    <PageLayout route="clock">
      <ClockCard />
    </PageLayout>
  );
}
