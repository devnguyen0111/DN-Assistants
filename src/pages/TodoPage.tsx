import { PageLayout } from "@/components/layout/PageLayout";
import { TodoCard } from "@/components/cards/TodoCard";

export function TodoPage() {
  return (
    <PageLayout route="todo">
      <TodoCard />
    </PageLayout>
  );
}
