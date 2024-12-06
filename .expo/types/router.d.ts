/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_sitemap` | `/chess` | `/chessAi` | `/chessMulti` | `/copy` | `/css/homeStyle` | `/css/signupStyle` | `/css/style` | `/homePage` | `/loginPage` | `/signup`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}
