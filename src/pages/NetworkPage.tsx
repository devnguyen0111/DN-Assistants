import { PageLayout } from "@/components/layout/PageLayout";
import { NetworkToolsCard } from "@/components/cards/NetworkToolsCard";

export function NetworkPage() {
  return (
    <PageLayout route="network">
      <NetworkToolsCard />
    </PageLayout>
  );
}
