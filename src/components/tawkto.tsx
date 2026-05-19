import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const TAWK_SRC = "https://embed.tawk.to/6a0c6d4d357d461c324e5c70/1jp08ltp2";

declare global {
  interface Window {
    Tawk_API: {
      onLoad?: () => void;
      onChatMessageAgent?: (message: unknown) => void;
      setAttributes?: (attrs: Record<string, string>, cb: (err: unknown) => void) => void;
      maximize?: () => void;
      minimize?: () => void;
      toggle?: () => void;
      showWidget?: () => void;
      hideWidget?: () => void;
      isChatMaximized?: () => boolean;
    };
    Tawk_LoadStart: Date;
  }
}

async function identifyUser() {
  const api = window.Tawk_API;
  if (!api?.setAttributes) return;

  const { data } = await supabase.auth.getUser();
  const attrs: Record<string, string> = { current_page: window.location.pathname };

  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", data.user.id)
      .maybeSingle();

    attrs.name = profile?.display_name || data.user.email?.split("@")[0] || "Student";
    attrs.email = data.user.email ?? "";
  }

  api.setAttributes(attrs, () => {});
}

// Open and maximize the chat window. Queues if the widget hasn't loaded yet.
export function openTawkChat() {
  if (typeof window === "undefined") return;
  const api = window.Tawk_API;
  if (!api) return;

  const open = () => {
    api.showWidget?.();
    if (!api.isChatMaximized?.()) api.maximize?.();
  };

  if (typeof api.maximize === "function") {
    open();
  } else {
    // Widget still bootstrapping — queue it
    const prev = api.onLoad;
    api.onLoad = function () {
      if (typeof prev === "function") prev();
      open();
    };
  }
}

export function TawkTo() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("tawkto-script")) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    window.Tawk_API.onLoad = function () {
      identifyUser();
      // Auto-open the chat window whenever an agent replies
      window.Tawk_API.onChatMessageAgent = function () {
        window.Tawk_API?.showWidget?.();
        window.Tawk_API?.maximize?.();
      };
    };

    const s1 = document.createElement("script");
    s1.id = "tawkto-script";
    s1.async = true;
    s1.src = TAWK_SRC;
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    const s0 = document.getElementsByTagName("script")[0];
    s0?.parentNode?.insertBefore(s1, s0);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setTimeout(identifyUser, 800);
      if (event === "SIGNED_OUT") {
        window.Tawk_API?.setAttributes?.(
          { name: "", email: "", current_page: window.location.pathname },
          () => {}
        );
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.Tawk_API?.setAttributes?.({ current_page: pathname }, () => {});
  }, [pathname]);

  return null;
}
