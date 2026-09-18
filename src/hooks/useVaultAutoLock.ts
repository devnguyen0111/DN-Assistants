import { useEffect, useRef } from "react";
import { isVaultUnlocked, lockVault } from "@/lib/vault";
import { useSettings } from "@/lib/settings-context";

/**
 * Locks the vault after `settings.vaultAutoLockMinutes` of idle activity
 * while the vault is unlocked. Idle resets on mousemove / keydown / click.
 * Mousemove is throttled to 4s to prevent timer thrashing.
 */
export function useVaultAutoLock(enabled = true) {
  const { settings } = useSettings();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
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
      timerRef.current = window.setTimeout(() => {
        if (isVaultUnlocked()) lockVault();
      }, minutes * 60_000);
    };

    let lastActivity = 0;
    const onMouseMove = () => {
      const now = Date.now();
      if (now - lastActivity < 4000) return;
      lastActivity = now;
      if (!isVaultUnlocked()) {
        clear();
        return;
      }
      arm();
    };

    const onKeyOrClick = () => {
      lastActivity = Date.now();
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
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("keydown", onKeyOrClick, { passive: true });
    window.addEventListener("click", onKeyOrClick, { passive: true });
    window.addEventListener("dn-vault-changed", onVaultChanged);

    return () => {
      clear();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyOrClick);
      window.removeEventListener("click", onKeyOrClick);
      window.removeEventListener("dn-vault-changed", onVaultChanged);
    };
  }, [enabled, settings.vaultAutoLockMinutes]);
}
