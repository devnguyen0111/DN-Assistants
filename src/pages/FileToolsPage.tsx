import { PageLayout } from "@/components/layout/PageLayout";
import { FileToolsCard } from "@/components/cards/FileToolsCard";

export function FileToolsPage() {
  return (
    <PageLayout route="filetools">
      <FileToolsCard />
    </PageLayout>
  );
}
