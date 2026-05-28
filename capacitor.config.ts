import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.scholarx.app',
  appName: 'ScholarX',
  webDir: 'dist/client',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
    },
    CapacitorHttp: {
      enabled: true,
    }
  }
};

export default config;
