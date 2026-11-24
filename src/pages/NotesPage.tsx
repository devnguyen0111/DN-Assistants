import { PageLayout } from "@/components/layout/PageLayout";
import { NotesCard } from "@/components/cards/NotesCard";

export function NotesPage() {
  return (
    <PageLayout route="notes">
      <NotesCard />
    </PageLayout>
  );
}
