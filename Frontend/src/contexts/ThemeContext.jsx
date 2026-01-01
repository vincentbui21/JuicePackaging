import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

const ThemeModeContext = createContext();

export const useThemeMode = () => {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return context;
};

export const ThemeModeProvider = ({ children }) => {
  // Get initial mode from localStorage or default to 'light'
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });

  // Save to localStorage whenever mode changes
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                primary: { main: '#2e7d32' },
                success: { main: '#2e7d32' },
                background: {
                  default: '#f3f7f4',
                  paper: '#ffffff',
                },
              }
            : {
                primary: { main: '#66bb6a' },
                success: { main: '#66bb6a' },
                background: {
                  default: '#0a1929',
                  paper: '#1a2027',
                },
              }),
          warning: { main: '#f59e0b' },
          info: { main: '#2f80ed' },
        },
        shape: { borderRadius: 12 },
      }),
    [mode]
  );

  return (
    <ThemeModeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};
