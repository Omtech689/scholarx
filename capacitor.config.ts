import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.scholarx.app',
  appName: 'ScholarX',
  webDir: 'dist/client',
  server: {
    // Load from the live Cloudflare deployment so TanStack Start server
    // functions resolve correctly. The app already requires internet for
    // all AI features, so there is no offline regression.
    url: 'https://scholarx.space',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
    },
  },
};

export default config;
