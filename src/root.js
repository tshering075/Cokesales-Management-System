// Optional — main bundle uses index.js + AppThemeProvider.
import { AppThemeProvider } from "./theme/AppThemeProvider";
import App from "./App";
import "@fontsource/roboto";

/** @deprecated Prefer index.js entry. */
function Root() {
  return (
    <AppThemeProvider>
      <App />
    </AppThemeProvider>
  );
}

export default Root;
