import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  IconButton,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Tooltip,
  Stack,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  Snackbar,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Phone,
  Mail,
  Weight,
  MessageSquare,
  Check,
  X,
  Clock,
  List,
  Grid3X3,
  Lock,
  LockOpen,
  Plus,
  Trash2,
  Printer,
} from 'lucide-react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useTranslation } from 'react-i18next';
import api from '../services/axios';

dayjs.extend(isoWeek);

export default function ReservationManagement() {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [viewMode, setViewMode] = useState('week'); // 'week', 'day', or 'list'
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [lockedTimeSlots, setLockedTimeSlots] = useState([]);
  const [systemLocked, setSystemLocked] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [newLockStart, setNewLockStart] = useState(null);
  const [newLockEnd, setNewLockEnd] = useState(null);
  const [newLockReason, setNewLockReason] = useState('');
  const [lockedSlotDialogOpen, setLockedSlotDialogOpen] = useState(false);
  const [selectedLockedSlot, setSelectedLockedSlot] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const actionButtonSx = { px: 3, py: 1.5, fontWeight: 600, fontSize: '0.95rem', minWidth: 240 };

  useEffect(() => {
    fetchReservationData();
  }, []);

  const mapReservation = (reservation) => ({
    id: reservation.reservation_id || reservation.id,
    name: String(reservation.customer_name || reservation.name || ''),
    phone: String(reservation.phone || ''),
    email: String(reservation.email || ''),
    appleWeight: Number(reservation.apple_weight_kg ?? reservation.appleWeight ?? 0),
    dateTime: reservation.reservation_datetime || reservation.dateTime,
    message: String(reservation.message || ''),
    checked_in_at: reservation.checked_in_at || reservation.checkedInAt || null,
    order_id: reservation.order_id || null,
  });

  const mapLockedSlot = (slot) => ({
    id: slot.slot_id || slot.id,
    startTime: slot.start_time || slot.startTime,
    endTime: slot.end_time || slot.endTime,
    reason: slot.reason || '',
  });

  const fetchReservations = async () => {
    try {
      const res = await api.get('/api/reservations');
      if (res.data?.ok) {
        const mapped = (res.data.reservations || []).map(mapReservation);
        setReservations(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
    }
  };

  const fetchLockedSlots = async () => {
    try {
      const res = await api.get('/api/locked-time-slots');
      if (res.data?.ok) {
        const mapped = (res.data.slots || []).map(mapLockedSlot);
        setLockedTimeSlots(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch locked time slots:', error);
    }
  };

  const fetchSystemLockStatus = async () => {
    try {
      const res = await api.get('/api/reservation-settings');
      if (res.data?.ok) {
        setSystemLocked(!!res.data.settings?.system_locked);
      }
    } catch (error) {
      console.error('Failed to fetch reservation settings:', error);
    }
  };

  const fetchReservationData = () => {
    fetchReservations();
    fetchLockedSlots();
    fetchSystemLockStatus();
  };

  const handlePrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(currentDate.subtract(1, 'week'));
    } else {
      setCurrentDate(currentDate.subtract(1, 'day'));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(currentDate.add(1, 'week'));
    } else {
      setCurrentDate(currentDate.add(1, 'day'));
    }
  };

  const handleToday = () => {
    setCurrentDate(dayjs());
  };

  const handleReservationClick = (reservation) => {
    setSelectedReservation(reservation);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedReservation(null);
  };

  const handleCheckInCustomer = () => {
    if (!selectedReservation?.id) return;
    api.post(`/api/reservations/${selectedReservation.id}/check-in`)
      .then((response) => {
        const checkedInAt = new Date().toISOString();
        const orderId = response.data?.order_id;
        setReservations((prev) => prev.map((res) => (
          res.id === selectedReservation.id
            ? { ...res, checked_in_at: checkedInAt, order_id: orderId ?? res.order_id }
            : res
        )));
        handleCloseDialog();
      })
      .catch((error) => {
        console.error('Failed to check in reservation:', error);
      });
  };

  const handlePrintReservation = (reservation) => {
    if (!reservation) return;

    const trackingNumber = reservation.order_id || t('reservation.na');
    const printWindow = window.open('', '_blank', 'width=520,height=640');

    if (!printWindow) {
      setSnackbar({
        open: true,
        message: t('reservation.print_error'),
        severity: 'error'
      });
      return;
    }

    const formatLabel = (label) => (label.trim().endsWith(':') ? label : `${label}:`);
    const doc = printWindow.document;
    doc.title = t('reservation.reservation_details');

    const style = doc.createElement('style');
    style.textContent = `
      @page { margin: 18mm; }
      body {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
        color: #111;
      }
      .print-wrap {
        max-width: 480px;
        margin: 0 auto;
      }
      h1 {
        font-size: 20px;
        margin: 0 0 16px;
      }
      .tracking {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: 1px;
        margin-bottom: 16px;
      }
      .order-id {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 16px;
      }
      .meta {
        font-size: 14px;
        margin: 6px 0;
      }
      .label {
        font-weight: 600;
        margin-right: 6px;
      }
      .message {
        margin-top: 14px;
        padding-top: 10px;
        border-top: 1px solid #ddd;
      }
    `;
    doc.head.appendChild(style);

    const wrapper = doc.createElement('div');
    wrapper.className = 'print-wrap';

    const heading = doc.createElement('h1');
    heading.textContent = t('reservation.reservation_details');

    const tracking = doc.createElement('div');
    tracking.className = 'tracking';
    tracking.textContent = trackingNumber;

    wrapper.appendChild(heading);
    wrapper.appendChild(tracking);

    const orderIdLabel = doc.createElement('div');
    orderIdLabel.className = 'label';
    orderIdLabel.textContent = formatLabel(t('reservation.order_id_label'));

    const orderId = doc.createElement('div');
    orderId.className = 'order-id';
    orderId.textContent = reservation.order_id || t('reservation.na');

    wrapper.appendChild(orderIdLabel);
    wrapper.appendChild(orderId);

    const reservationDate = dayjs(reservation.dateTime).format('MMMM D, YYYY [at] HH:mm');
    const details = [
      { label: formatLabel(t('reservation.customer_name')), value: reservation.name },
      { label: formatLabel(t('reservation.date_time_label')), value: reservationDate },
      { label: formatLabel(t('reservation.phone_label')), value: reservation.phone },
      { label: formatLabel(t('reservation.email_label')), value: reservation.email || t('reservation.na') },
      {
        label: formatLabel(t('reservation.apple_weight_label')),
        value: `${reservation.appleWeight} ${t('reservation.kg_unit')}`
      },
    ];

    details.forEach(({ label, value }) => {
      const row = doc.createElement('div');
      row.className = 'meta';

      const labelEl = doc.createElement('span');
      labelEl.className = 'label';
      labelEl.textContent = label;

      const valueEl = doc.createElement('span');
      valueEl.textContent = value || t('reservation.na');

      row.appendChild(labelEl);
      row.appendChild(valueEl);
      wrapper.appendChild(row);
    });

    if (reservation.message) {
      const messageWrap = doc.createElement('div');
      messageWrap.className = 'message';

      const messageLabel = doc.createElement('div');
      messageLabel.className = 'label';
      messageLabel.textContent = formatLabel(t('reservation.message_label'));

      const messageValue = doc.createElement('div');
      messageValue.textContent = reservation.message;

      messageWrap.appendChild(messageLabel);
      messageWrap.appendChild(messageValue);
      wrapper.appendChild(messageWrap);
    }

    doc.body.appendChild(wrapper);
    doc.close();

    let didPrint = false;
    const triggerPrint = () => {
      if (didPrint) return;
      didPrint = true;
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };

    if (doc.readyState === 'complete') {
      setTimeout(triggerPrint, 50);
    } else {
      printWindow.onload = () => setTimeout(triggerPrint, 50);
    }

    setSnackbar({
      open: true,
      message: t('reservation.print_success'),
      severity: 'success'
    });
  };

  const handleToggleSystemLock = async () => {
    try {
      const res = await api.post('/api/reservation-settings/toggle-lock');
      if (res.data?.ok) {
        setSystemLocked(!!res.data.locked);
      }
    } catch (error) {
      console.error('Failed to toggle reservation lock:', error);
    }
  };

  const handleAddLockedSlot = () => {
    if (!newLockStart || !newLockEnd) return;
    
    api.post('/api/locked-time-slots', {
      start_time: newLockStart.toISOString(),
      end_time: newLockEnd.toISOString(),
      reason: newLockReason || t('reservation.blocked_by_admin'),
    })
      .then((res) => {
        if (res.data?.ok && res.data.slot) {
          setLockedTimeSlots((prev) => [...prev, mapLockedSlot(res.data.slot)]);
        } else {
          fetchLockedSlots();
        }
      })
      .catch((error) => {
        console.error('Failed to create locked time slot:', error);
      })
      .finally(() => {
        setLockDialogOpen(false);
        setNewLockStart(null);
        setNewLockEnd(null);
        setNewLockReason('');
      });
  };

  const handleDeleteLockedSlot = (slotId) => {
    if (!slotId) return;
    api.delete(`/api/locked-time-slots/${slotId}`)
      .then(() => {
        setLockedTimeSlots((prev) => prev.filter(slot => slot.id !== slotId));
      })
      .catch((error) => {
        console.error('Failed to delete locked time slot:', error);
      });
  };

  const handleLockedSlotClick = (slot) => {
    setSelectedLockedSlot(slot);
    setLockedSlotDialogOpen(true);
  };

  const getWeekDays = () => {
    const startOfWeek = currentDate.startOf('isoWeek');
    return Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'));
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      slots.push(hour);
    }
    return slots;
  };

  const getReservationsForDay = (date) => {
    return reservations.filter(res => 
      dayjs(res.dateTime).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
    );
  };

  const getLockedSlotsForDay = (date) => {
    return lockedTimeSlots.filter(slot => {
      const slotStart = dayjs(slot.startTime);
      const slotEnd = dayjs(slot.endTime);
      const dayStart = date.startOf('day');
      const dayEnd = date.endOf('day');
      
      // Check if the locked slot overlaps with this day
      return (slotStart.isBefore(dayEnd) && slotEnd.isAfter(dayStart));
    });
  };

  const getLockedSlotPosition = (slot, date) => {
    const slotStart = dayjs(slot.startTime);
    const slotEnd = dayjs(slot.endTime);
    const dayStart = date.startOf('day').hour(8); // Start at 8 AM
    const dayEnd = date.endOf('day').hour(20); // End at 8 PM
    
    // Clamp to the visible time range
    const displayStart = slotStart.isBefore(dayStart) ? dayStart : slotStart;
    const displayEnd = slotEnd.isAfter(dayEnd) ? dayEnd : slotEnd;
    
    const startHour = displayStart.hour();
    const startMinute = displayStart.minute();
    const endHour = displayEnd.hour();
    const endMinute = displayEnd.minute();
    
    if (startHour < 8 || startHour > 20) return null;
    
    const topPosition = ((startHour - 8) * 60 + startMinute);
    const duration = ((endHour - 8) * 60 + endMinute) - topPosition;
    
    return { top: topPosition, height: Math.max(duration, 30) };
  };

  const getReservationPosition = (reservation) => {
    const time = dayjs(reservation.dateTime);
    const hour = time.hour();
    const minute = time.minute();
    const startHour = 8;
    
    if (hour < startHour || hour > 20) return null;
    
    const topPosition = ((hour - startHour) * 60 + minute) * (60 / 60); // 60px per hour
    return topPosition;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      case 'completed':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const timeSlots = getTimeSlots();

    return (
      <Box sx={{ display: 'flex', height: 'calc(100vh - 250px)', overflow: 'auto' }}>
        {/* Time column */}
        <Box sx={{ width: 60, flexShrink: 0, borderRight: '1px solid #e0e0e0' }}>
          <Box sx={{ height: 60, borderBottom: '1px solid #e0e0e0' }} />
          {timeSlots.map(hour => (
            <Box
              key={hour}
              sx={{
                height: 60,
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                pt: 0.5,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {`${hour}:00`}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Days columns */}
        <Box sx={{ display: 'flex', flex: 1, position: 'relative' }}>
          {weekDays.map((day, dayIndex) => {
            const dayReservations = getReservationsForDay(day);
            const isToday = day.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');

            return (
              <Box
                key={day.format('YYYY-MM-DD')}
                sx={{
                  flex: 1,
                  borderRight: dayIndex < 6 ? '1px solid #e0e0e0' : 'none',
                  position: 'relative',
                  bgcolor: isToday ? 'rgba(76, 175, 80, 0.05)' : 'transparent',
                }}
              >
                {/* Day header */}
                <Box
                  sx={{
                    height: 60,
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isToday ? '#4CAF50' : 'transparent',
                    color: isToday ? 'white' : 'text.primary',
                  }}
                >
                  <Typography variant="caption">
                    {day.format('ddd').toUpperCase()}
                  </Typography>
                  <Typography variant="h6">
                    {day.format('D')}
                  </Typography>
                </Box>

                {/* Time grid */}
                {timeSlots.map(hour => (
                  <Box
                    key={hour}
                    sx={{
                      height: 60,
                      borderBottom: '1px solid #e0e0e0',
                    }}
                  />
                ))}

                {/* Reservations */}
                {dayReservations.map(reservation => {
                  const topPosition = getReservationPosition(reservation);
                  if (topPosition === null) return null;

                  const isCheckedIn = !!reservation.checked_in_at;

                  return (
                    <Card
                      key={reservation.id}
                      sx={{
                        position: 'absolute',
                        top: topPosition + 60, // +60 for header
                        left: 4,
                        right: 4,
                        minHeight: 50,
                        bgcolor: isCheckedIn ? '#9E9E9E' : '#4CAF50',
                        color: 'white',
                        opacity: isCheckedIn ? 0.7 : 1,
                        border: isCheckedIn ? '2px dashed rgba(255, 255, 255, 0.75)' : 'none',
                        cursor: 'pointer',
                        '&:hover': {
                          opacity: 0.9,
                          transform: 'scale(1.02)',
                        },
                        transition: 'all 0.2s',
                        zIndex: 1,
                      }}
                      onClick={() => handleReservationClick(reservation)}
                    >
                      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                          {dayjs(reservation.dateTime).format('HH:mm')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {reservation.name}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                          {reservation.appleWeight} kg
                        </Typography>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Locked Time Slots */}
                {getLockedSlotsForDay(day).map(slot => {
                  const position = getLockedSlotPosition(slot, day);
                  if (!position) return null;

                  return (
                    <Box
                      key={slot.id}
                      onClick={() => handleLockedSlotClick(slot)}
                      sx={{
                        position: 'absolute',
                        top: position.top + 60, // +60 for header
                        left: 4,
                        right: 4,
                        height: position.height,
                        bgcolor: 'rgba(255, 152, 0, 0.2)',
                        border: '2px dashed #FF9800',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 0,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'rgba(255, 152, 0, 0.35)',
                        },
                      }}
                    >
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Lock size={14} color="#FF9800" />
                        <Typography variant="caption" sx={{ color: '#FF9800', fontWeight: 600 }}>
                          {t('reservation.locked_slot')}
                        </Typography>
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderDayView = () => {
    const timeSlots = getTimeSlots();
    const dayReservations = getReservationsForDay(currentDate);
    const isToday = currentDate.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');

    return (
      <Box sx={{ display: 'flex', height: 'calc(100vh - 250px)', overflow: 'auto' }}>
        {/* Time column */}
        <Box sx={{ width: 80, flexShrink: 0, borderRight: '1px solid #e0e0e0' }}>
          <Box sx={{ height: 60, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: isToday ? '#4CAF50' : 'transparent', color: isToday ? 'white' : 'text.primary' }}>
            <Typography variant="body2" fontWeight={600}>
              {currentDate.format('ddd, MMM D')}
            </Typography>
          </Box>
          {timeSlots.map(hour => (
            <Box
              key={hour}
              sx={{
                height: 80,
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                pt: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {`${hour}:00`}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Day column */}
        <Box sx={{ flex: 1, position: 'relative', bgcolor: isToday ? 'rgba(76, 175, 80, 0.05)' : 'transparent' }}>
          <Box sx={{ height: 60, borderBottom: '1px solid #e0e0e0' }} />
          
          {/* Time grid */}
          {timeSlots.map(hour => (
            <Box
              key={hour}
              sx={{
                height: 80,
                borderBottom: '1px solid #e0e0e0',
              }}
            />
          ))}

          {/* Reservations */}
          {dayReservations.map(reservation => {
            const topPosition = getReservationPosition(reservation);
            const isCheckedIn = !!reservation.checked_in_at;
            if (topPosition === null) return null;

            return (
              <Card
                key={reservation.id}
                sx={{
                  position: 'absolute',
                  top: (topPosition * 80/60) + 60, // Scale for 80px per hour
                  left: 16,
                  right: 16,
                  minHeight: 70,
                  bgcolor: isCheckedIn ? '#9E9E9E' : '#4CAF50',
                  color: 'white',
                  cursor: 'pointer',
                  opacity: isCheckedIn ? 0.7 : 1,
                  border: isCheckedIn ? '2px dashed rgba(255, 255, 255, 0.75)' : 'none',
                  '&:hover': {
                    opacity: 0.9,
                    transform: 'scale(1.01)',
                  },
                  transition: 'all 0.2s',
                  zIndex: 1,
                }}
                onClick={() => handleReservationClick(reservation)}
              >
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Clock size={16} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {dayjs(reservation.dateTime).format('HH:mm')}
                    </Typography>
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {reservation.name}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    📞 {reservation.phone} | ⚖️ {reservation.appleWeight} kg
                  </Typography>
                </CardContent>
              </Card>
            );
          })}

          {/* Locked Time Slots */}
          {getLockedSlotsForDay(currentDate).map(slot => {
            const position = getLockedSlotPosition(slot, currentDate);
            if (!position) return null;

            return (
              <Box
                key={slot.id}
                onClick={() => handleLockedSlotClick(slot)}
                sx={{
                  position: 'absolute',
                  top: (position.top * 80/60) + 60, // Scale for 80px per hour
                  left: 16,
                  right: 16,
                  height: (position.height * 80/60),
                  bgcolor: 'rgba(255, 152, 0, 0.15)',
                  border: '2px dashed #FF9800',
                  borderRadius: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 1,
                  zIndex: 0,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'rgba(255, 152, 0, 0.3)',
                  },
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  <Lock size={18} color="#FF9800" />
                  <Typography variant="body2" sx={{ color: '#FF9800', fontWeight: 600 }}>
                    {t('reservation.locked_slot')}
                  </Typography>
                </Stack>
                {slot.reason && (
                  <Typography variant="caption" sx={{ color: '#F57C00', textAlign: 'center' }}>
                    {slot.reason}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderListView = () => {
    const columns = [
      { field: 'id', headerName: t('reservation.id'), width: 70 },
      { field: 'name', headerName: t('reservation.customer_name'), flex: 1.5, minWidth: 150 },
      { field: 'phone', headerName: t('reservation.phone'), flex: 1.2, minWidth: 130 },
      { field: 'email', headerName: t('reservation.email'), flex: 1.5, minWidth: 150 },
      { 
        field: 'appleWeight', 
        headerName: t('reservation.weight_kg'), 
        width: 120,
        renderCell: (params) => `${params.value} ${t('reservation.kg_unit')}`
      },
      { 
        field: 'dateTime', 
        headerName: t('reservation.date_time'), 
        flex: 1.5,
        minWidth: 180,
        renderCell: (params) => dayjs(params.value).format('MMM D, YYYY HH:mm')
      },
      {
        field: 'message',
        headerName: t('reservation.message'),
        flex: 1.5,
        minWidth: 150,
        renderCell: (params) => params.value || '-'
      },
      {
        field: 'actions',
        headerName: t('reservation.actions'),
        width: 150,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleReservationClick(params.row)}
            >
              {t('reservation.view')}
            </Button>
            <Tooltip title={t('reservation.print_tracking')}>
              <IconButton
                size="small"
                onClick={() => handlePrintReservation(params.row)}
              >
                <Printer size={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ];

    const filteredReservations = reservations.filter(res =>
      res.name.toLowerCase().includes(searchText.toLowerCase()) ||
      res.phone.toLowerCase().includes(searchText.toLowerCase()) ||
      (res.email && res.email.toLowerCase().includes(searchText.toLowerCase()))
    );

    return (
      <Box sx={{ height: 'calc(100vh - 300px)', width: '100%' }}>
        <DataGrid
          rows={filteredReservations}
          columns={columns}
          getRowClassName={(params) => (params.row.checked_in_at ? 'reservation-checked-in' : '')}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          sx={{
            '& .reservation-checked-in': {
              bgcolor: 'rgba(158, 158, 158, 0.12)',
              color: 'text.secondary',
            },
            '& .reservation-checked-in:hover': {
              bgcolor: 'rgba(158, 158, 158, 0.2)',
            },
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-row:hover': {
              bgcolor: 'rgba(76, 175, 80, 0.08)',
            },
          }}
        />
      </Box>
    );
  };

  return (
    <Box className="page-transition">
      {/* System Lock Alert */}
      {systemLocked && (
        <Alert severity="warning" sx={{ mb: 2 }} className="animate-slide-in-down">
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography>
              <strong>{t('reservation.system_locked_message')}</strong>
            </Typography>
            <Button 
              startIcon={<LockOpen />} 
              onClick={handleToggleSystemLock}
              size="small"
              variant="outlined"
            >
              {t('reservation.unlock_system')}
            </Button>
          </Stack>
        </Alert>
      )}

      {/* Header with controls */}
      <Paper sx={{ p: 2, mb: 2 }} className="animate-slide-in-up">
        <Stack spacing={2}>
          {/* Top row: Navigation and view controls */}
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
            <Stack direction="row" spacing={2} alignItems="center">
              {viewMode !== 'list' && (
                <>
                  <IconButton onClick={handlePrevious}>
                    <ChevronLeft />
                  </IconButton>
                  <IconButton onClick={handleNext}>
                    <ChevronRight />
                  </IconButton>
                  <Button onClick={handleToday} variant="outlined">
                    {t('reservation.today')}
                  </Button>
                  <Typography variant="h6">
                    {viewMode === 'week' 
                      ? `${getWeekDays()[0].format('MMM D')} - ${getWeekDays()[6].format('MMM D, YYYY')}`
                      : currentDate.format('MMMM D, YYYY')
                    }
                  </Typography>
                </>
              )}
              {viewMode === 'list' && (
                <Typography variant="h6">{t('reservation.all_reservations')}</Typography>
              )}
            </Stack>

            <ButtonGroup variant="outlined">
              <Button
                startIcon={<CalendarIcon size={18} />}
                onClick={() => setViewMode('day')}
                variant={viewMode === 'day' ? 'contained' : 'outlined'}
              >
                {t('reservation.day')}
              </Button>
              <Button
                startIcon={<CalendarIcon size={18} />}
                onClick={() => setViewMode('week')}
                variant={viewMode === 'week' ? 'contained' : 'outlined'}
              >
                {t('reservation.week')}
              </Button>
              <Button
                startIcon={<List size={18} />}
                onClick={() => setViewMode('list')}
                variant={viewMode === 'list' ? 'contained' : 'outlined'}
              >
                {t('reservation.list')}
              </Button>
            </ButtonGroup>
          </Stack>

          <Divider />

          {/* Bottom row: Actions and search */}
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={systemLocked}
                    onChange={handleToggleSystemLock}
                    color="warning"
                  />
                }
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    {systemLocked ? <Lock size={18} /> : <LockOpen size={18} />}
                    <Typography variant="body2">
                      {systemLocked ? t('reservation.system_locked') : t('reservation.system_open')}
                    </Typography>
                  </Stack>
                }
              />
              
              <Button
                startIcon={<Plus />}
                variant="outlined"
                onClick={() => setLockDialogOpen(true)}
              >
                {t('reservation.lock_time_slot')}
              </Button>

              <Chip 
                label={`${lockedTimeSlots.length} ${t('reservation.locked_slots')}`} 
                color="warning"
                variant="outlined"
              />
            </Stack>

            {viewMode === 'list' && (
              <TextField
                size="small"
                placeholder={t('reservation.search_placeholder')}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                sx={{ minWidth: 300 }}
              />
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Calendar/List view */}
      <Paper>
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'list' && renderListView()}
      </Paper>

      {/* Reservation Details Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        {selectedReservation && (
          <>
            <DialogTitle>
              <Typography variant="h6">{t('reservation.reservation_details')}</Typography>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarIcon size={20} />
                    <Typography variant="body1">
                      <strong>{t('reservation.date_time_label')}</strong> {dayjs(selectedReservation.dateTime).format('MMMM D, YYYY [at] HH:mm')}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body1">
                      <strong>{t('reservation.order_id_label')}</strong>{' '}
                      <Box component="span" sx={{ fontWeight: 700 }}>
                        {selectedReservation.order_id || t('reservation.na')}
                      </Box>
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Phone size={20} />
                    <Typography variant="body1">
                      <strong>{t('reservation.phone_label')}</strong> {selectedReservation.phone}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Mail size={20} />
                    <Typography variant="body1">
                      <strong>{t('reservation.email_label')}</strong> {selectedReservation.email || t('reservation.na')}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Weight size={20} />
                    <Typography variant="body1">
                      <strong>{t('reservation.apple_weight_label')}</strong> {selectedReservation.appleWeight} {t('reservation.kg_unit')}
                    </Typography>
                  </Stack>
                </Grid>
                {selectedReservation.message && (
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <MessageSquare size={20} />
                      <Box>
                        <Typography variant="body1" fontWeight={600}>{t('reservation.message_label')}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedReservation.message}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                )}
                {selectedReservation.checked_in_at && (
                  <Grid item xs={12}>
                    <Chip
                      label={`✓ ${t('reservation.in_progress')} - ${dayjs(selectedReservation.checked_in_at).format('MMM D, HH:mm')}`}
                      color="success"
                      variant="outlined"
                      sx={{ width: '100%' }}
                    />
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between' }}>
              <Button onClick={handleCloseDialog} variant="text">
                {t('reservation.close')}
              </Button>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flex: 1, justifyContent: 'flex-end' }}>
                <Button
                  startIcon={<Printer size={20} />}
                  variant="contained"
                  color="success"
                  size="large"
                  onClick={() => handlePrintReservation(selectedReservation)}
                  sx={actionButtonSx}
                >
                  {t('reservation.print_tracking')}
                </Button>
                {!selectedReservation.checked_in_at && (
                  <Button
                    startIcon={<Check size={20} />}
                    variant="contained"
                    color="success"
                    size="large"
                    onClick={handleCheckInCustomer}
                    sx={actionButtonSx}
                  >
                    {t('reservation.customer_arrived')}
                  </Button>
                )}
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Lock Time Slot Dialog */}
      <Dialog open={lockDialogOpen} onClose={() => setLockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('reservation.lock_dialog_title')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('reservation.lock_dialog_description')}
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack spacing={3}>
              <DateTimePicker
                label={t('reservation.start_time')}
                value={newLockStart}
                onChange={setNewLockStart}
                slotProps={{
                  textField: { fullWidth: true }
                }}
              />
              <DateTimePicker
                label={t('reservation.end_time')}
                value={newLockEnd}
                onChange={setNewLockEnd}
                minDateTime={newLockStart}
                slotProps={{
                  textField: { fullWidth: true }
                }}
              />
              <TextField
                label={t('reservation.reason_optional')}
                value={newLockReason}
                onChange={(e) => setNewLockReason(e.target.value)}
                placeholder={t('reservation.reason_placeholder')}
                fullWidth
                multiline
                rows={2}
              />
            </Stack>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLockDialogOpen(false)}>{t('reservation.cancel')}</Button>
          <Button 
            onClick={handleAddLockedSlot} 
            variant="contained" 
            color="warning"
            disabled={!newLockStart || !newLockEnd}
          >
            {t('reservation.lock_slot')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Locked Slot Details Dialog */}
      <Dialog 
        open={lockedSlotDialogOpen} 
        onClose={() => setLockedSlotDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <Lock size={24} color="#FF9800" />
            <Typography variant="h6">
              {t('reservation.locked_slot_details')}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedLockedSlot && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('reservation.start_time')}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {dayjs(selectedLockedSlot.startTime).format('MMMM D, YYYY h:mm A')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('reservation.end_time')}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {dayjs(selectedLockedSlot.endTime).format('MMMM D, YYYY h:mm A')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('reservation.reason')}
                </Typography>
                <Typography variant="body1">
                  {selectedLockedSlot.reason || t('reservation.no_reason_provided')}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLockedSlotDialogOpen(false)}>
            {t('reservation.close')}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Locked Slot Details Dialog */}
      <Dialog 
        open={lockedSlotDialogOpen} 
        onClose={() => setLockedSlotDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <Lock size={24} color="#FF9800" />
            <Typography variant="h6">
              {t('reservation.locked_slot_details')}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedLockedSlot && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('reservation.start_time')}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {dayjs(selectedLockedSlot.startTime).format('MMMM D, YYYY h:mm A')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('reservation.end_time')}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {dayjs(selectedLockedSlot.endTime).format('MMMM D, YYYY h:mm A')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('reservation.reason')}
                </Typography>
                <Typography variant="body1">
                  {selectedLockedSlot.reason || t('reservation.no_reason_provided')}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLockedSlotDialogOpen(false)}>
            {t('reservation.close')}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Locked Time Slots Management */}
      {lockedTimeSlots.length > 0 && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">{t('reservation.locked_time_slots')}</Typography>
            <Grid container spacing={2}>
              {lockedTimeSlots.map((slot) => (
                <Grid item xs={12} sm={6} md={4} key={slot.id}>
                  <Card variant="outlined" sx={{ borderColor: 'warning.main' }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                            <Lock size={16} color="#FF9800" />
                            <Typography variant="body2" fontWeight={600}>
                              {t('reservation.locked_slot')}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {dayjs(slot.startTime).format('MMM D, YYYY HH:mm')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {t('reservation.to')} {dayjs(slot.endTime).format('MMM D, YYYY HH:mm')}
                          </Typography>
                          {slot.reason && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                              {slot.reason}
                            </Typography>
                          )}
                        </Box>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteLockedSlot(slot.id)}
                        >
                          <Trash2 size={18} />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Paper>
      )}

      {/* Print Snackbar Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      />
    </Box>
  );
}
