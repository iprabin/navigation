import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

type ScreenOptions = {
  root?: NativeStackNavigationOptions;
  shared?: NativeStackNavigationOptions;
  modal?: NativeStackNavigationOptions;
};

let options: ScreenOptions = {};

export function configureNavigationOptions(opts: ScreenOptions): void {
  options = opts;
}

export function getScreenOptions(): ScreenOptions {
  return options;
}
