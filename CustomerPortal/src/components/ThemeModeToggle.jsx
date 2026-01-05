import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeModeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <Tooltip title={isDarkMode ? 'Light Mode' : 'Dark Mode'}>
      <IconButton
        onClick={toggleTheme}
        size="small"
        sx={{
          color: 'inherit',
          '&:hover': {
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
          },
        }}
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </IconButton>
    </Tooltip>
  );
}
