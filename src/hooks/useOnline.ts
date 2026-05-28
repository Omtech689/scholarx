import { useEffect, useState } from "react";
import { Network } from "@capacitor/network";

export const useOnline = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check initial network status
    const checkStatus = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);
    };

    checkStatus();

    // Listen to network status changes
    const listener = Network.addListener("networkStatusChange", (status) => {
      setIsOnline(status.connected);
    });

    // Fallback for browsers without Network plugin
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      listener.then((l) => l.remove());
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
};
