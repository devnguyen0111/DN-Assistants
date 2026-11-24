import { PageLayout } from "@/components/layout/PageLayout";
import { DevToolsCard } from "@/components/cards/DevToolsCard";

export function DevToolsPage() {
  return (
    <PageLayout route="devtools">
      <DevToolsCard />
    </PageLayout>
  );
}
