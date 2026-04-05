import mixpanel from "mixpanel-browser";

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  mixpanel.init("2600e1ec959f76522423d2754c004fae", {
    track_pageview: true,
    persistence: "localStorage",
  });
  initialized = true;
}

export function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
  if (!initialized) initAnalytics();
  mixpanel.track(name, props);
}
