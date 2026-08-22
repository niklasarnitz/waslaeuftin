"use client";

import { useEffect } from "react";

import "smartbanner.js/dist/smartbanner.min.css";

export function SmartBanner() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (document.querySelector(".js_smartbanner")) {
      return;
    }

    // Dynamic import to avoid SSR issues
    import("smartbanner.js/src/smartbanner.js")
      .then(({ default: SmartBannerClass }) => {
        if (document.querySelector(".js_smartbanner")) {
          return;
        }
        const banner = new SmartBannerClass();
        banner.publish();
      })
      .catch((err) => {
        console.error("Failed to initialize smartbanner.js", err);
      });
  }, []);

  return null;
}
