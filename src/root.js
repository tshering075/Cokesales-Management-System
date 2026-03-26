// src/Root.js
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import '@fontsource/roboto'; // make sure Roboto font is imported

const theme = createTheme({
  typography: {
    fontFamily: 'Roboto',
  },
});

function Root() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

export default Root;
