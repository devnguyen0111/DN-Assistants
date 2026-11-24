import { PageLayout } from "@/components/layout/PageLayout";
import { SnippetsCard } from "@/components/cards/SnippetsCard";

export function SnippetsPage() {
  return (
    <PageLayout route="snippets">
      <SnippetsCard />
    </PageLayout>
  );
}
