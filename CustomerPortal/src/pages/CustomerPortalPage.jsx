import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Tab,
  Tabs,
  Card,
  CardContent,
  Grid,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  CalendarMonth,
  Search,
  LocalShipping,
  Phone,
  Email,
  LocationOn,
  CheckCircle,
  Person,
  Scale,
  Message as MessageIcon,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/fi';
import LanguageSelector from '../components/LanguageSelector';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function CustomerPortalPage() {
  const { t, i18n } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    appleWeight: '',
    dateTime: null,
    message: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [blockedTimeSlots, setBlockedTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Set dayjs locale based on i18n language
  React.useEffect(() => {
    dayjs.locale(i18n.language);
  }, [i18n.language]);

  // Fetch blocked time slots (reservations + admin locks)
  React.useEffect(() => {
    fetchBlockedTimeSlots();
  }, []);

  const fetchBlockedTimeSlots = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint
      // const response = await fetch('/api/blocked-time-slots');
      // const data = await response.json();
      // Expected format: [{ datetime: '2026-01-15T10:00:00', type: 'reservation' | 'admin_lock' }, ...]
      // setBlockedTimeSlots(data);
      
      // For now, set empty array until API is ready
      setBlockedTimeSlots([]);
    } catch (error) {
      console.error('Error fetching blocked time slots:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if a datetime is within 30 minutes of any blocked slot
  const isTimeSlotBlocked = (dateTime) => {
    if (!dateTime) return false;
    
    const selectedTime = dayjs(dateTime);
    
    return blockedTimeSlots.some((blocked) => {
      const blockedTime = dayjs(blocked.datetime);
      const diffInMinutes = Math.abs(selectedTime.diff(blockedTime, 'minute'));
      
      // Block if within 30 minutes (before or after)
      return diffInMinutes < 30;
    });
  };

  // Disable specific times in the DateTimePicker
  const shouldDisableTime = (value, view) => {
    if (!value) return false;
    
    // Check if the time is blocked
    return isTimeSlotBlocked(value);
  };

  const handleTabChange = (event, newValue) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: '',
      });
    }
  };

  const handleDateTimeChange = (newValue) => {
    setFormData({
      ...formData,
      dateTime: newValue,
    });
    
    // Clear or set error based on time slot availability
    if (newValue && isTimeSlotBlocked(newValue)) {
      setFormErrors({
        ...formErrors,
        dateTime: t('booking.timeslot_unavailable'),
      });
    } else if (formErrors.dateTime) {
      setFormErrors({
        ...formErrors,
        dateTime: '',
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = t('booking.name_required');
    }
    if (!formData.phone.trim()) {
      errors.phone = t('booking.phone_required');
    }
    if (!formData.appleWeight || formData.appleWeight <= 0) {
      errors.appleWeight = t('booking.weight_required');
    }
    if (!formData.dateTime) {
      errors.dateTime = t('booking.datetime_required');
    } else if (isTimeSlotBlocked(formData.dateTime)) {
      errors.dateTime = t('booking.timeslot_unavailable');
    }
    return errors;
  };

  const handleSubmit = () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    // TODO: Call API to backend
    console.log('Form submitted:', formData);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error for this field
    if (formErrors[e.target.name]) {
      setFormErrors({
        ...formErrors,
        [e.target.name]: '',
      });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f5f7fa',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: 'white',
          borderBottom: '3px solid #4CAF50',
          py: 3,
          mb: 4,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  color: '#2c3e50',
                  fontWeight: 700,
                  mb: 0.5,
                }}
              >
                {t('header.title')}
              </Typography>
              <Typography variant="subtitle1" sx={{ color: '#4CAF50', fontWeight: 500 }}>
                {t('header.subtitle')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <LanguageSelector />
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#555' }}>
                  <Phone fontSize="small" /> 020 7699920
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#555' }}>
                  <Email fontSize="small" /> info@mehustaja.fi
                </Typography>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: '#f8f9fa',
              '& .MuiTab-root': {
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
                minHeight: 64,
              },
              '& .Mui-selected': {
                color: '#4CAF50 !important',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#4CAF50',
                height: 3,
              },
            }}
          >
            <Tab label={t('tabs.book_reservation')} icon={<CalendarMonth />} iconPosition="start" />
            <Tab label={t('tabs.track_order')} icon={<Search />} iconPosition="start" />
          </Tabs>

          {/* Book Reservation Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ width: "min(90%, 800px)", mx: "auto" }}>
              <Typography variant="h5" gutterBottom sx={{ mb: 1, color: '#2c3e50', fontWeight: 600 }}>
                {t('booking.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                {t('booking.subtitle')}
              </Typography>

              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={i18n.language}>
                <Paper elevation={1}>
                  <Grid container sx={{ height: "auto", rowGap: "5px", borderRadius: "10px", paddingTop: "15px", paddingBottom: "15px" }}>
                    <Grid item size={4} sx={{ display: "flex", alignItems: "center", paddingLeft: "min(45px, 10%)", paddingRight: "min(45px, 10%)" }}>
                      <Typography variant="body1">{t('booking.name')}</Typography>
                    </Grid>
                    <Grid item size={8} sx={{ display: "flex", alignItems: "center" }}>
                      <TextField
                        name="name"
                        value={formData.name}
                        required
                        variant="filled"
                        label={t('booking.name')}
                        onChange={handleInputChange}
                        error={!!formErrors.name}
                        helperText={formErrors.name}
                        sx={{ width: "min(600px, 90%)" }}
                      />
                    </Grid>

                    <Grid item size={4} sx={{ display: "flex", alignItems: "center", paddingLeft: "min(45px, 10%)", paddingRight: "min(45px, 10%)" }}>
                      <Typography variant="body1">{t('booking.phone')}</Typography>
                    </Grid>
                    <Grid item size={8} sx={{ display: "flex", alignItems: "center" }}>
                      <TextField
                        name="phone"
                        value={formData.phone}
                        required
                        variant="filled"
                        label={t('booking.phone')}
                        onChange={handleInputChange}
                        error={!!formErrors.phone}
                        helperText={formErrors.phone}
                        sx={{ width: "min(600px, 90%)" }}
                      />
                    </Grid>

                    <Grid item size={4} sx={{ display: "flex", alignItems: "center", paddingLeft: "min(45px, 10%)", paddingRight: "min(45px, 10%)" }}>
                      <Typography variant="body1">{t('booking.email')}</Typography>
                    </Grid>
                    <Grid item size={8} sx={{ display: "flex", alignItems: "center" }}>
                      <TextField
                        name="email"
                        type="email"
                        value={formData.email}
                        variant="filled"
                        label={t('booking.email')}
                        onChange={handleInputChange}
                        sx={{ width: "min(600px, 90%)" }}
                      />
                    </Grid>

                    <Grid item size={4} sx={{ display: "flex", alignItems: "center", paddingLeft: "min(45px, 10%)", paddingRight: "min(45px, 10%)" }}>
                      <Typography variant="body1">{t('booking.apple_weight')}</Typography>
                    </Grid>
                    <Grid item size={8} sx={{ display: "flex", alignItems: "center" }}>
                      <TextField
                        name="appleWeight"
                        type="number"
                        value={formData.appleWeight}
                        required
                        variant="filled"
                        label={t('booking.apple_weight')}
                        onChange={handleInputChange}
                        error={!!formErrors.appleWeight}
                        helperText={formErrors.appleWeight}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                        }}
                        sx={{ width: "min(600px, 90%)" }}
                      />
                    </Grid>

                    <Grid item size={4} sx={{ display: "flex", alignItems: "center", paddingLeft: "min(45px, 10%)", paddingRight: "min(45px, 10%)" }}>
                      <Typography variant="body1">{t('booking.date_time')}</Typography>
                    </Grid>
                    <Grid item size={8} sx={{ display: "flex", alignItems: "center" }}>
                      <DateTimePicker
                        label={t('booking.date_time')}
                        value={formData.dateTime}
                        onChange={handleDateTimeChange}
                        minDateTime={dayjs().add(1, 'hour')}
                        maxDateTime={dayjs().add(14, 'day')}
                        shouldDisableTime={shouldDisableTime}
                        shouldDisableDate={(date) => {
                          const minDate = dayjs().add(1, 'hour').startOf('day');
                          const maxDate = dayjs().add(14, 'day').endOf('day');
                          return date.isBefore(minDate) || date.isAfter(maxDate);
                        }}
                        timeSteps={{ minutes: 15 }}
                        skipDisabled
                        slotProps={{
                          textField: {
                            required: true,
                            error: !!formErrors.dateTime,
                            helperText: formErrors.dateTime || t('booking.timeslot_helper'),
                            sx: { width: "min(600px, 90%)" },
                          },
                        }}
                      />
                    </Grid>

                    <Grid item size={4} sx={{ display: "flex", alignItems: "flex-start", paddingTop: "16px", paddingLeft: "min(45px, 10%)", paddingRight: "min(45px, 10%)" }}>
                      <Typography variant="body1">{t('booking.message')}</Typography>
                    </Grid>
                    <Grid item size={8} sx={{ display: "flex", alignItems: "center" }}>
                      <TextField
                        name="message"
                        value={formData.message}
                        multiline
                        rows={4}
                        variant="filled"
                        label={t('booking.message')}
                        onChange={handleInputChange}
                        sx={{ width: "min(600px, 90%)" }}
                      />
                    </Grid>
                  </Grid>
                </Paper>

                <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleSubmit}
                    color="primary"
                  >
                    {t('booking.submit')}
                  </Button>
                </Box>
              </LocalizationProvider>
            </Box>
          </TabPanel>

          {/* Track Order Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h5" gutterBottom sx={{ mb: 1, color: '#2c3e50', fontWeight: 600 }}>
              {t('tracking.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              {t('tracking.subtitle')}
            </Typography>
            <Box sx={{ mb: 4 }}>
              <TextField
                fullWidth
                label={t('tracking.input_label')}
                variant="outlined"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#4CAF50',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4CAF50',
                    },
                  },
                }}
              />
              <Button
                variant="contained"
                size="large"
                startIcon={<Search />}
                sx={{
                  bgcolor: '#4CAF50',
                  px: 4,
                  '&:hover': {
                    bgcolor: '#45a049',
                  },
                }}
              >
                {t('tracking.search_button')}
              </Button>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Sample Order Status Display */}
            <Card sx={{ bgcolor: '#f9fafb', border: '1px solid #e0e0e0' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <LocalShipping sx={{ fontSize: 40, color: '#4CAF50', mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ color: '#2c3e50', fontWeight: 600 }}>
                      {t('tracking.status_title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('tracking.status_subtitle')}
                    </Typography>
                  </Box>
                </Box>

                <Stepper orientation="vertical" activeStep={-1}>
                  <Step>
                    <StepLabel
                      StepIconComponent={() => <CheckCircle sx={{ color: '#4CAF50' }} />}
                    >
                      <Typography variant="body1" fontWeight={500}>
                        {t('tracking.step_received')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('tracking.step_received_desc')}
                      </Typography>
                    </StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>
                      <Typography variant="body1" fontWeight={500}>
                        {t('tracking.step_processing')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('tracking.step_processing_desc')}
                      </Typography>
                    </StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>
                      <Typography variant="body1" fontWeight={500}>
                        {t('tracking.step_ready')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('tracking.step_ready_desc')}
                      </Typography>
                    </StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>
                      <Typography variant="body1" fontWeight={500}>
                        {t('tracking.step_completed')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('tracking.step_completed_desc')}
                      </Typography>
                    </StepLabel>
                  </Step>
                </Stepper>
              </CardContent>
            </Card>
          </TabPanel>
        </Paper>

        {/* Info Cards */}
        <Grid container spacing={3} sx={{ mt: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              height: '100%', 
              border: '1px solid #e0e0e0',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 8px 24px rgba(76, 175, 80, 0.3)',
                borderColor: '#4CAF50',
              }
            }}>
              <CardContent>
                <LocationOn sx={{ fontSize: 40, color: '#4CAF50', mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  {t('info_cards.location_title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('info_cards.location_address')}<br />
                  {t('info_cards.location_city')}<br />
                  {t('info_cards.location_hours')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              height: '100%', 
              border: '1px solid #e0e0e0',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 8px 24px rgba(76, 175, 80, 0.3)',
                borderColor: '#4CAF50',
              }
            }}>
              <CardContent>
                <Phone sx={{ fontSize: 40, color: '#4CAF50', mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  {t('info_cards.contact_title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('info_cards.contact_phone')}<br />
                  {t('info_cards.contact_email')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              height: '100%', 
              border: '1px solid #e0e0e0',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 8px 24px rgba(76, 175, 80, 0.3)',
                borderColor: '#4CAF50',
              }
            }}>
              <CardContent>
                <CheckCircle sx={{ fontSize: 40, color: '#4CAF50', mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  {t('info_cards.pricing_title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('info_cards.pricing_price')}<br />
                  {t('info_cards.pricing_vat')}<br />
                  {t('info_cards.pricing_shelf_life')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Footer */}
      <Box sx={{ bgcolor: '#2c3e50', py: 4, mt: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                {t('footer.company_name')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                {t('footer.tagline')}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                {t('footer.address')}<br />
                {t('footer.copyright')}
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}

export default CustomerPortalPage;
