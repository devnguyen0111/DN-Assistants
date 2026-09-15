import { useEffect, useRef } from "react";
import { isVaultUnlocked, lockVault } from "@/lib/vault";
import { useSettings } from "@/lib/settings-context";

/**
 * Locks the vault after `settings.vaultAutoLockMinutes` of idle activity
 * while the vault is unlocked. Idle resets on mousemove / keydown / click.
 * Mount from App when ready.
 */
export function useVaultAutoLock() {
  const { settings } = useSettings();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const minutes = settings.vaultAutoLockMinutes;
    if (minutes <= 0) return;

    const clear = () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const arm = () => {
      clear();
      if (!isVaultUnlocked()) return;
      timerRef.current = window.setTimeout(
        () => {
          if (isVaultUnlocked()) lockVault();
        },
        minutes * 60_000,
      );
    };

    const onActivity = () => {
      if (!isVaultUnlocked()) {
        clear();
        return;
      }
      arm();
    };

    const onVaultChanged = () => {
      if (isVaultUnlocked()) arm();
      else clear();
    };

    arm();
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("click", onActivity);
    window.addEventListener("dn-vault-changed", onVaultChanged);

    return () => {
      clear();
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("click", onActivity);
      window.removeEventListener("dn-vault-changed", onVaultChanged);
    };
  }, [settings.vaultAutoLockMinutes]);
}
