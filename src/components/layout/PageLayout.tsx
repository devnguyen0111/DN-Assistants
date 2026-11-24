import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useI18n } from "@/lib/i18n";
import { pageDesc, pageTitle } from "@/lib/page-meta";
import type { AppRoute } from "@/lib/routing";
import { cn } from "@/lib/utils";

type Props = {
  route: AppRoute;
  children: ReactNode;
  actions?: ReactNode;
  /** Override the default description from page-meta (pass null to omit it). */
  description?: ReactNode | null;
  count?: ReactNode;
  /** `fluid` uses all width; `reading` caps the body at 720px, aligned left (never centered). */
  width?: "fluid" | "reading";
  className?: string;
};

/** Page frame: one PageHeader + content that shares the shell's left edge. */
export function PageLayout({
  route,
  children,
  actions,
  description,
  count,
  width = "fluid",
  className,
}: Props) {
  const { t } = useI18n();
  return (
    <div className={cn("pb-6", className)}>
      <PageHeader
        title={pageTitle(t, route)}
        description={description === undefined ? pageDesc(t, route) : description}
        count={count}
        actions={actions}
      />
      <div className={cn("@container space-y-6", width === "reading" && "max-w-[720px]")}>
        {children}
      </div>
    </div>
  );
}
