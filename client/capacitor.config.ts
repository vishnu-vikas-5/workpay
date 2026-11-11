import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.workpay.app',
  appName: 'WorkPay',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;

