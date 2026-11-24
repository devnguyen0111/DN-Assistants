import { PageLayout } from "@/components/layout/PageLayout";
import { WeatherCard } from "@/components/cards/WeatherCard";

export function WeatherPage() {
  return (
    <PageLayout route="weather">
      <WeatherCard />
    </PageLayout>
  );
}
