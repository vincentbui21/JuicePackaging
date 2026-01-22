import React, { useState, useEffect } from 'react';
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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import duration from 'dayjs/plugin/duration';
import 'dayjs/locale/en';
import 'dayjs/locale/fi';
import LanguageSelector from '../components/LanguageSelector';
import ThemeModeToggle from '../components/ThemeModeToggle';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';

dayjs.extend(duration);

// Auto-detect API URL based on environment
const getApiBaseUrl = () => {
  // If explicitly set, use that
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // If running on production domain, use production API
  if (window.location.hostname === 'customer.mehustaja.fi') {
    return 'https://api.mehustaja.fi';
  }
  
  // Default to localhost for development
  return 'http://localhost:5001';
};

const API_BASE_URL = getApiBaseUrl().replace(/\/+$/, '');

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function CustomerPortalPage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useCustomTheme();
  const [tabValue, setTabValue] = useState(0);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
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
  const [systemLocked, setSystemLocked] = useState(false);
  const [reservationSettings, setReservationSettings] = useState({
    time_slot_minutes: 30,
    hours_start: 8,
    hours_end: 20,
    advance_booking_days: 14
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successReservationDate, setSuccessReservationDate] = useState(null);
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [trackingStatusHistory, setTrackingStatusHistory] = useState([]);

  // Set dayjs locale based on i18n language
  React.useEffect(() => {
    dayjs.locale(i18n.language);
  }, [i18n.language]);

  // Fetch blocked time slots (reservations + admin locks)
  React.useEffect(() => {
    fetchBlockedTimeSlots();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!successDialogOpen || !successReservationDate) return;

    const interval = setInterval(() => {
      const now = dayjs();
      const target = dayjs(successReservationDate);
      const diffMs = target.diff(now, 'millisecond');

      if (diffMs <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
        return;
      }

      const duration = dayjs.duration(diffMs, 'millisecond');
      setCountdown({
        days: Math.floor(duration.asDays()),
        hours: duration.hours(),
        minutes: duration.minutes(),
        seconds: duration.seconds(),
      });
    }, 100);

    return () => clearInterval(interval);
  }, [successDialogOpen, successReservationDate]);

  const fetchBlockedTimeSlots = async () => {
    try {
      setLoading(true);
      
      // Fetch reservation settings (including system lock status)
      const settingsResponse = await fetch(`${API_BASE_URL}/api/reservation-settings`);
      const settingsData = await settingsResponse.json();
      const timeSlotMinutes = Number.parseInt(settingsData?.settings?.time_slot_minutes, 10) || reservationSettings.time_slot_minutes;
      
      if (settingsData.ok) {
        setSystemLocked(settingsData.settings.system_locked);
        setReservationSettings({
          time_slot_minutes: timeSlotMinutes,
          hours_start: settingsData.settings.hours_start,
          hours_end: settingsData.settings.hours_end,
          advance_booking_days: settingsData.settings.advance_booking_days || 14
        });
      }
      
      // Fetch existing reservations
      const reservationsResponse = await fetch(`${API_BASE_URL}/api/reservations`);
      const reservationsData = await reservationsResponse.json();
      
      // Fetch locked time slots
      const lockedSlotsResponse = await fetch(`${API_BASE_URL}/api/locked-time-slots`);
      const lockedSlotsData = await lockedSlotsResponse.json();
      
      const blocked = [];
      
      // Add existing reservations to blocked list
      if (reservationsData.ok && reservationsData.reservations) {
        reservationsData.reservations.forEach(res => {
          blocked.push({
            datetime: res.reservation_datetime,
            type: 'reservation'
          });
        });
      }
      
      // Add admin-locked time slots to blocked list
      if (lockedSlotsData.ok && lockedSlotsData.slots) {
        lockedSlotsData.slots.forEach(slot => {
          // For locked slots, we need to block every configured interval within the range
          const start = dayjs(slot.start_time);
          const end = dayjs(slot.end_time);
          let current = start;
          
          while (current.isBefore(end) || current.isSame(end)) {
            blocked.push({
              datetime: current.toISOString(),
              type: 'admin_lock',
              reason: slot.reason
            });
            current = current.add(timeSlotMinutes, 'minute');
          }
        });
      }
      
      setBlockedTimeSlots(blocked);
    } catch (error) {
      console.error('Error fetching blocked time slots:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if a datetime is within the configured time slot window of any blocked slot
  const isTimeSlotBlocked = (dateTime) => {
    if (!dateTime) return false;
    
    const selectedTime = dayjs(dateTime);
    
    return blockedTimeSlots.some((blocked) => {
      const blockedTime = dayjs(blocked.datetime);
      const diffInMinutes = Math.abs(selectedTime.diff(blockedTime, 'minute'));
      
      // Block if within the configured time slot window (before or after)
      return diffInMinutes < reservationSettings.time_slot_minutes;
    });
  };

  // Disable specific times in the DateTimePicker
  const shouldDisableTime = (value, view) => {
    if (!value) return false;
    
    const hour = value.hour();
    
    // Disable hours outside the configured range
    if (hour < reservationSettings.hours_start || hour >= reservationSettings.hours_end) {
      return true;
    }
    
    // Check if the time is blocked
    return isTimeSlotBlocked(value);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleInputChange = (e) => {
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

  const handleSubmit = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // Check if system is locked
    if (systemLocked) {
      setSubmitError(t('booking.system_locked'));
      return;
    }
    
    try {
      setSubmitting(true);
      setSubmitError('');
      
      const response = await fetch(`${API_BASE_URL}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          apple_weight_kg: parseFloat(formData.appleWeight),
          reservation_datetime: formData.dateTime.toISOString(),
          message: formData.message || null,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.ok) {
        setSubmitError(data.error || t('booking.submission_error'));
        return;
      }
      
      // Success - open success dialog
      setSuccessReservationDate(formData.dateTime);
      setSuccessDialogOpen(true);
      
      // Clear form
      setFormData({
        name: '',
        phone: '',
        email: '',
        appleWeight: '',
        dateTime: null,
        message: '',
      });
      
      // Refresh blocked time slots
      fetchBlockedTimeSlots();
      
    } catch (error) {
      console.error('Error submitting reservation:', error);
      setSubmitError(t('booking.submission_error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookAnother = () => {
    setSuccessDialogOpen(false);
    setSuccessReservationDate(null);
    setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  };

  const handleCloseDialog = () => {
    setSuccessDialogOpen(false);
    setSuccessReservationDate(null);
    setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  };

  const normalizeStatus = (status) => String(status || '').toLowerCase().replace(/\s+/g, ' ').trim();

  const getTrackingStep = (status) => {
    const normalized = normalizeStatus(status);

    if (!normalized) return -1;
    if (['pending', 'received', 'order received', 'submitted'].includes(normalized)) return 0;
    if (['processing', 'in processing'].includes(normalized)) return 1;
    if (['processing complete', 'processed', 'ready for pallet', 'ready for pickup', 'ready'].includes(normalized)) return 2;
    if (['picked up', 'picked', 'completed', 'complete', 'collected'].includes(normalized)) return 3;
    return -1;
  };

  const handleTrackOrder = async () => {
    const trimmed = trackingNumber.trim();

    if (!trimmed) {
      setTrackingError(t('tracking.input_required'));
      setTrackingResult(null);
      setTrackingStatusHistory([]);
      return;
    }

    try {
      setTrackingLoading(true);
      setTrackingError('');

      // Fetch current status
      const statusResponse = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(trimmed)}/status`);
      const statusData = await statusResponse.json();

      if (!statusResponse.ok || !statusData.ok) {
        const notFound = statusResponse.status === 404 || statusData?.error === 'not_found';
        setTrackingError(notFound ? t('tracking.not_found') : t('tracking.lookup_error'));
        setTrackingResult(null);
        setTrackingStatusHistory([]);
        return;
      }

      setTrackingResult({ status: statusData.status || '' });

      // Fetch status history
      try {
        const historyResponse = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(trimmed)}/status-history`);
        const historyData = await historyResponse.json();
        
        if (historyData.ok && historyData.history) {
          // Sort by changed_at to show progression
          const sortedHistory = historyData.history.sort((a, b) => {
            return new Date(a.changed_at) - new Date(b.changed_at);
          });
          setTrackingStatusHistory(sortedHistory);
        } else {
          setTrackingStatusHistory([]);
        }
      } catch (historyError) {
        console.error('Error fetching status history:', historyError);
        setTrackingStatusHistory([]);
      }
    } catch (error) {
      console.error('Error fetching order status:', error);
      setTrackingError(t('tracking.lookup_error'));
      setTrackingResult(null);
      setTrackingStatusHistory([]);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleTrackingInputChange = (event) => {
    setTrackingNumber(event.target.value);
    if (trackingError) {
      setTrackingError('');
    }
    if (trackingResult) {
      setTrackingResult(null);
    }
  };

  const trackingStep = trackingResult ? getTrackingStep(trackingResult.status) : -1;
  const trackingStatusText = trackingResult?.status ? trackingResult.status : t('tracking.status_unknown');

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
      className="page-transition"
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: 'background.paper',
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
                  color: 'text.primary',
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
              <ThemeModeToggle />
              <LanguageSelector />
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                  <Phone fontSize="small" /> 020 7699920
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
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
              bgcolor: isDarkMode ? 'background.paper' : '#f8f9fa',
              '& .MuiTab-root': {
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
                minHeight: 64,
                color: isDarkMode ? 'text.secondary' : 'text.primary',
              },
              '& .Mui-selected': {
                color: isDarkMode ? 'primary.light !important' : 'primary.main !important',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: isDarkMode ? 'primary.light' : 'primary.main',
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
              <Typography variant="h5" gutterBottom sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
                {t('booking.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {t('booking.subtitle')}
              </Typography>

              {/* Kuopio Branch Notice */}
              <Alert 
                severity="info" 
                sx={{ 
                  mb: 4,
                  backgroundColor: 'rgba(33, 150, 243, 0.1)',
                  borderLeft: '4px solid #2196F3',
                  '& .MuiAlert-icon': {
                    color: '#2196F3',
                  }
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {t('booking.kuopio_notice')}
                </Typography>
              </Alert>

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
                        maxDateTime={dayjs().add(reservationSettings.advance_booking_days, 'day')}
                        minTime={dayjs().hour(reservationSettings.hours_start).minute(0)}
                        maxTime={dayjs().hour(reservationSettings.hours_end - 1).minute(59)}
                        shouldDisableTime={shouldDisableTime}
                        shouldDisableDate={(date) => {
                          const minDate = dayjs().add(1, 'hour').startOf('day');
                          const maxDate = dayjs().add(reservationSettings.advance_booking_days, 'day').endOf('day');
                          return date.isBefore(minDate) || date.isAfter(maxDate);
                        }}
                        timeSteps={{ minutes: reservationSettings.time_slot_minutes }}
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

                {/* System Locked Alert */}
                {systemLocked && (
                  <Alert severity="error" sx={{ mt: 3 }}>
                    {t('booking.system_locked')}
                  </Alert>
                )}

                {/* Success Message */}
                {submitSuccess && (
                  <Alert severity="success" sx={{ mt: 3 }} onClose={() => setSubmitSuccess(false)}>
                    {t('booking.submission_success')}
                  </Alert>
                )}

                {/* Error Message */}
                {submitError && (
                  <Alert severity="error" sx={{ mt: 3 }} onClose={() => setSubmitError('')}>
                    {submitError}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleSubmit}
                    color="primary"
                    disabled={submitting || systemLocked}
                  >
                    {submitting ? t('booking.submitting') : t('booking.submit')}
                  </Button>
                </Box>
              </LocalizationProvider>
            </Box>
          </TabPanel>

          {/* Track Order Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h5" gutterBottom sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
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
                onChange={handleTrackingInputChange}
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
                startIcon={trackingLoading ? <CircularProgress size={18} color="inherit" /> : <Search />}
                sx={{
                  bgcolor: '#4CAF50',
                  px: 4,
                  '&:hover': {
                    bgcolor: '#45a049',
                  },
                }}
                disabled={trackingLoading}
                onClick={handleTrackOrder}
              >
                {trackingLoading ? t('tracking.searching') : t('tracking.search_button')}
              </Button>
            </Box>

            {trackingError && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setTrackingError('')}>
                {trackingError}
              </Alert>
            )}

            <Divider sx={{ my: 4 }} />

            {/* Order Status Display with History */}
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <LocalShipping sx={{ fontSize: 40, color: '#4CAF50', mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                      {t('tracking.status_title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {trackingResult
                        ? t('tracking.current_status', { status: trackingStatusText })
                        : t('tracking.status_subtitle')}
                    </Typography>
                  </Box>
                </Box>

                {/* Status History Timeline */}
                {trackingStatusHistory.length > 0 ? (
                  <Stepper orientation="vertical">
                    {trackingStatusHistory.map((entry, idx) => (
                      <Step key={idx} completed={true}>
                        <StepLabel>
                          <Typography variant="body1" fontWeight={500} sx={{ color: 'text.primary' }}>
                            {entry.status}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(entry.changed_at).format('LLLL')}
                          </Typography>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                ) : trackingResult ? (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {t('tracking.no_history')}
                    </Typography>
                    <Stepper orientation="vertical" activeStep={trackingStep}>
                      <Step>
                        <StepLabel>
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
                  </Box>
                ) : (
                  <Stepper orientation="vertical" activeStep={-1}>
                    <Step>
                      <StepLabel>
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
                )}
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

      {/* Success Dialog with Countdown */}
      <Dialog
        open={successDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 700, fontSize: '1.5rem', pt: 3 }}>
          {t('booking.success_title')}
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 3 }}>
          <Box sx={{ mb: 3 }}>
            <CheckCircle sx={{ fontSize: 60, color: '#4CAF50', mb: 2 }} />
            <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
              {t('booking.success_message')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('booking.tracking_notice')}
            </Typography>
          </Box>

          {/* Countdown Timer */}
          <Box sx={{ 
            bgcolor: 'rgba(76, 175, 80, 0.1)', 
            p: 2, 
            borderRadius: 1, 
            mb: 3,
            border: '2px solid #4CAF50'
          }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 2, color: '#4CAF50' }}>
              {t('booking.countdown_title')}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                  {countdown.days}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Days
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                  {countdown.hours}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Hours
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                  {countdown.minutes}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Minutes
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                  {countdown.seconds}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Seconds
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Reservation Date Display */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Reservation: {successReservationDate ? dayjs(successReservationDate).format('LLLL') : ''}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1, justifyContent: 'center' }}>
          <Button
            onClick={handleBookAnother}
            variant="contained"
            color="primary"
            sx={{ minWidth: 120 }}
          >
            {t('booking.book_another')}
          </Button>
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            color="primary"
            sx={{ minWidth: 120 }}
          >
            {t('booking.close')}
          </Button>
        </DialogActions>
      </Dialog>

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
