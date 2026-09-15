import { useEffect, useRef } from "react";
import { animate, createScope } from "animejs";
import { PasswordsCard } from "@/components/cards/PasswordsCard";

export function PasswordsPage() {
  const root = useRef<HTMLDivElement>(null);
  const scope = useRef<ReturnType<typeof createScope> | null>(null);

  useEffect(() => {
    if (!root.current) return;
    scope.current = createScope({ root }).add(() => {
      animate(".page-enter", {
        opacity: [0, 1],
        y: [16, 0],
        duration: 420,
        ease: "outCubic",
      });
    });
    return () => scope.current?.revert();
  }, []);

  return (
    <div ref={root} className="page-enter mx-auto max-w-5xl">
      <PasswordsCard />
    </div>
  );
}
