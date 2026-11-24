import { PageLayout } from "@/components/layout/PageLayout";
import { ColorStudioCard } from "@/components/cards/ColorStudioCard";

export function ColorsPage() {
  return (
    <PageLayout route="colors">
      <ColorStudioCard />
    </PageLayout>
  );
}
