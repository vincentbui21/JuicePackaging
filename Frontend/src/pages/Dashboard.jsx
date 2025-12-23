import { Stack } from "@mui/material";
import DashboardCards from "../components/DashboardCards.jsx";
import ProductionChart from "../components/ProductionChart.jsx";
import HeroHeader from "../components/HeroHeader.jsx";

export default function Dashboard() {
  return (
    <Stack spacing={2} sx={{ pb: 2 }}>
      <HeroHeader />
      <DashboardCards />
      <ProductionChart />
    </Stack>
  );
}