import { useOnline } from "@/hooks/useOnline";
import { WifiOff } from "lucide-react";

export const OfflineBanner = () => {
  const isOnline = useOnline();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-destructive px-4 py-3 text-sm text-destructive-foreground shadow-md">
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>You're offline. Some features may be unavailable.</span>
    </div>
  );
};
