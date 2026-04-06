import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.narrativeflow.editor',
  appName: 'Narrative Flow',
  webDir: 'dist',
  android: {
    buildOptions: {
      releaseType: 'APK',
    }
  }
}

export default config
