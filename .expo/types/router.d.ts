/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/Friend` | `/Privacy` | `/TermOfUse` | `/User` | `/_sitemap` | `/bottomNav` | `/chess` | `/chessAi` | `/chessMulti` | `/components/ExitConfirmDialog` | `/components/ExitConfirmProvider` | `/components/SoundHapticPressable` | `/components/SoundPressable` | `/css/style` | `/hooks/useAndroidConfirmAndExit` | `/music` | `/setting` | `/splas-screen` | `/userDetail` | `/utils/ClickSound`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}
