import { IconButton, Tooltip } from '@mui/material';
import { Moon, Sun } from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function ThemeModeToggle() {
  const { t } = useTranslation();
  const { mode, toggleTheme } = useThemeMode();

  return (
    <Tooltip title={mode === 'light' ? t('app.dark_mode') : t('app.light_mode')}>
      <IconButton
        onClick={toggleTheme}
        sx={{
          color: 'text.primary',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        {mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </IconButton>
    </Tooltip>
  );
}
