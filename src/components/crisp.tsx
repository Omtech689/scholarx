import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const CRISP_WEBSITE_ID = "08bdfba9-9790-4709-9e51-4b5c3b5198d6";

declare global {
  interface Window {
    $crisp: unknown[][];
    CRISP_WEBSITE_ID: string;
  }
}

async function identifyUser() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", data.user.id)
    .maybeSingle();

  const name = profile?.display_name || data.user.email?.split("@")[0] || "Student";
  const email = data.user.email ?? "";

  window.$crisp.push(["set", "user:email", [email]]);
  window.$crisp.push(["set", "user:nickname", [name]]);
}

export function openCrispChat() {
  if (typeof window === "undefined" || !window.$crisp) return;
  window.$crisp.push(["do", "chat:show"]);
  window.$crisp.push(["do", "chat:open"]);
}

export function Crisp() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("crisp-script")) return;

    window.$crisp = window.$crisp || [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    // Auto-open chat when an agent sends a message
    window.$crisp.push(["on", "message:received", function () {
      window.$crisp.push(["do", "chat:show"]);
      window.$crisp.push(["do", "chat:open"]);
    }]);

    const s = document.createElement("script");
    s.id = "crisp-script";
    s.src = "https://client.crisp.chat/l.js";
    s.async = true;
    document.getElementsByTagName("head")[0].appendChild(s);

    identifyUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setTimeout(identifyUser, 800);
      if (event === "SIGNED_OUT") window.$crisp.push(["do", "session:reset"]);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.$crisp) return;
    window.$crisp.push(["set", "session:data", [[["current_page", pathname]]]]);
  }, [pathname]);

  return null;
}
