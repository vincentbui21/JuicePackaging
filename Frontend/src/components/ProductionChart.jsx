import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
} from "@mui/material";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import api from "../services/axios";

export default function ProductionChart() {
  const [period, setPeriod] = useState("daily"); // daily, weekly, monthly, yearly
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const periodConfig = {
    daily: { label: "Daily", days: 30 },
    weekly: { label: "Weekly", days: 90 },
    monthly: { label: "Monthly", days: 365 },
    yearly: { label: "Yearly", days: 3650 },
  };

  const loadChart = async (selectedPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const config = periodConfig[selectedPeriod];
      const { data: chartData } = await api.get("/dashboard/historical-metrics", {
        params: {
          period: selectedPeriod,
          days: config.days,
        },
      });
      setData(chartData || []);
    } catch (err) {
      console.error("Error loading chart data:", err);
      setError("Failed to load chart data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChart(period);
  }, [period]);

  const handlePeriodChange = (event, newPeriod) => {
    if (newPeriod) {
      setPeriod(newPeriod);
    }
  };

  return (
    <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, mt: 2 }}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight={800}>Production Trends</Typography>
            <ToggleButtonGroup
              value={period}
              exclusive
              onChange={handlePeriodChange}
              size="small"
            >
              <ToggleButton value="daily">Daily</ToggleButton>
              <ToggleButton value="weekly">Weekly</ToggleButton>
              <ToggleButton value="monthly">Monthly</ToggleButton>
              <ToggleButton value="yearly">Yearly</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        }
      />
      <CardContent>
        {loading && (
          <Stack alignItems="center" py={3}>
            <CircularProgress size={32} />
          </Stack>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!loading && !error && data.length > 0 && (
          <Stack spacing={2}>
            {/* Pouches Made Chart */}
            <Stack>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Pouches Made
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="pouches_made" fill="#2e7d32" name="Pouches Made" />
                </BarChart>
              </ResponsiveContainer>
            </Stack>

            {/* Kilograms Processed vs Taken In Chart */}
            <Stack>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Kilograms: Processed vs Taken In
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="kg_processed"
                    stroke="#ef6c00"
                    name="Kilograms Processed"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="kg_taken_in"
                    stroke="#1976d2"
                    name="Kilograms Taken In"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Stack>
          </Stack>
        )}

        {!loading && !error && data.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No data available for the selected period.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
