/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/Friend` | `/User` | `/_sitemap` | `/bottomNav` | `/chess` | `/chessAi` | `/chessMulti` | `/css/style` | `/introVideo` | `/music` | `/userDetail`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}
