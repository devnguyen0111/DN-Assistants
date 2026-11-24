import { PageLayout } from "@/components/layout/PageLayout";
import { PasswordsCard } from "@/components/cards/PasswordsCard";

export function PasswordsPage() {
  return (
    <PageLayout route="passwords">
      <PasswordsCard />
    </PageLayout>
  );
}
