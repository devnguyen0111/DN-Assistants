import { useCallback, useEffect, useState } from "react";
import { parseHashRoute, setHashRoute, type AppRoute } from "@/lib/routing";

export function useHashRoute() {
  const [route, setRouteState] = useState<AppRoute>(() => parseHashRoute());

  useEffect(() => {
    if (!window.location.hash) {
      setHashRoute("home");
    }
    const onHashChange = () => setRouteState(parseHashRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const setRoute = useCallback((next: AppRoute) => {
    setHashRoute(next);
    setRouteState(next);
  }, []);

  return { route, setRoute };
}
