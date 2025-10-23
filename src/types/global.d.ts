export {};

declare global {
  interface Window {
    MSW_ENABLED?: boolean;
  }

  var MSW_ENABLED: boolean | undefined;
}
