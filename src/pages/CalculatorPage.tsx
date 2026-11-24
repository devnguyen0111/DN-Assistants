import { PageLayout } from "@/components/layout/PageLayout";
import { CalculatorCard } from "@/components/cards/CalculatorCard";

export function CalculatorPage() {
  return (
    <PageLayout route="calculator">
      <CalculatorCard />
    </PageLayout>
  );
}
