import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
  capture_pageleave: true,
  session_recording: {
    maskInputOptions: {
      password: true,
      tel: true,
    },
    maskInputFn: (text, element) => {
      if (element?.getAttribute("data-sensitive") === "true") {
        return "••••";
      }
      return text;
    },
  },
  loaded: (ph) => {
    if (process.env.NODE_ENV === "development") {
      ph.opt_out_capturing();
    }
  },
});
