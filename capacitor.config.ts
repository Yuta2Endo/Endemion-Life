import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "online.endemion.life",
  appName: "Endemion Life",
  webDir: "apps/android/www",
  backgroundColor: "#060608",
  android: {
    allowMixedContent: false
  },
  server: {
    url: "https://life.endemion.online",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: ["life.endemion.online", "auth.endemion.online"],
    errorPath: "offline.html"
  }
};

export default config;
