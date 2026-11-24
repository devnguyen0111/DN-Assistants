import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/lib/theme";

function Toaster(props: ToasterProps) {
  const { theme } = useTheme();
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      visibleToasts={3}
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-elevated group-[.toaster]:text-text-1 group-[.toaster]:border-border group-[.toaster]:shadow-popover group-[.toaster]:max-w-[360px]",
          description: "group-[.toast]:text-text-2",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
