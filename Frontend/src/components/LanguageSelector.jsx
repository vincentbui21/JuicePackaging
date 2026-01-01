import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip, Typography } from "@mui/material";
import { Languages } from "lucide-react";

const languages = [
  { code: 'en', name: 'English', displayCode: 'EN' },
  { code: 'fi', name: 'Suomi', displayCode: 'FI' }
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('language', languageCode);
    handleClose();
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <>
      <Tooltip title="Change Language">
        <IconButton
          aria-label="language selector"
          aria-controls={open ? 'language-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleClick}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1.5,
            width: 40,
            height: 40
          }}
        >
          <Languages size={18} />
        </IconButton>
      </Tooltip>
      
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'language-button',
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 180,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }
        }}
      >
        {languages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={i18n.language === language.code}
            sx={{
              py: 1.5,
              px: 2,
              '&.Mui-selected': {
                bgcolor: 'primary.light',
                '&:hover': {
                  bgcolor: 'primary.light',
                }
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Typography 
                variant="body2" 
                fontWeight={600} 
                color="primary"
                sx={{ 
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.75rem'
                }}
              >
                {language.displayCode}
              </Typography>
            </ListItemIcon>
            <ListItemText 
              primary={language.name}
              primaryTypographyProps={{
                fontWeight: i18n.language === language.code ? 600 : 400
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
