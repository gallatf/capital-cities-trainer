// The app only ships a light theme (matching the web app, which has no dark
// mode), so always report 'light' regardless of the device setting.
export const useColorScheme = () => 'light' as const;
