const YIELD_RATE = 0.65;
const POUCH_LITERS = 3;

const toNumber = (value) => {
  const v = Number(value);
  return Number.isFinite(v) ? v : 0;
};

const round = (value, digits = 2) => {
  const v = toNumber(value);
  return Number(v.toFixed(digits));
};

const expectedPouchesFromKg = (kg) => Math.floor((toNumber(kg) * YIELD_RATE) / POUCH_LITERS);

const dateKey = (raw) => {
  if (!raw) return "";
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  return String(raw).slice(0, 10);
};

const monthKey = (raw) => {
  const d = dateKey(raw);
  return d ? d.slice(0, 7) : "Unknown";
};

export function buildAdminReport(rows = [], costTotals = {}, pricing = {}) {
  const rawPrice = toNumber(pricing?.price);
  const basePrice = rawPrice > 0 ? rawPrice : 8;
  const shippingFee = toNumber(pricing?.shipping_fee);

  const enriched = rows.map((row) => {
    const kilos = round(row.kilos, 2);
    const pouches = toNumber(row.pouches_produced);
    const city = String(row.city || "").trim().toLowerCase();
    const fallbackUnitPrice = basePrice + (city === "kuopio" ? 0 : shippingFee);
    const totalCost = toNumber(row.total_cost);
    const useTotalCostForUnit = totalCost > 0 && pouches > 0;
    const unitPrice = useTotalCostForUnit ? round(totalCost / pouches, 2) : fallbackUnitPrice;
    const revenue = totalCost > 0 ? round(totalCost, 2) : (pouches > 0 ? round(pouches * unitPrice, 2) : 0);

    // TODO: replace with real COGS once available in the data model.
    const directCost = round(row.direct_cost, 2);
    const grossProfit = round(revenue - directCost, 2);
    const grossMarginPct = revenue > 0 ? round((grossProfit / revenue) * 100, 2) : 0;

    const expectedPouches = expectedPouchesFromKg(kilos);
    const variancePouches = pouches - expectedPouches;
    const variancePct = expectedPouches > 0 ? round((variancePouches / expectedPouches) * 100, 2) : 0;

    return {
      ...row,
      production_date: dateKey(row.production_date),
      kilos,
      pouches_produced: pouches,
      revenue,
      unit_price: unitPrice,
      direct_cost: directCost,
      gross_profit: grossProfit,
      gross_margin_pct: grossMarginPct,
      expected_pouches: expectedPouches,
      variance_pouches: variancePouches,
      variance_pct: variancePct,
    };
  });

  const totals = enriched.reduce(
    (acc, row) => {
      acc.kilos += row.kilos;
      acc.pouches += row.pouches_produced;
      acc.revenue += row.revenue;
      acc.order_direct_cost += row.direct_cost;
      acc.expected_pouches += row.expected_pouches;
      acc.orders += 1;
      return acc;
    },
    {
      kilos: 0,
      pouches: 0,
      revenue: 0,
      order_direct_cost: 0,
      expected_pouches: 0,
      orders: 0,
    }
  );

  totals.kilos = round(totals.kilos, 2);
  totals.revenue = round(totals.revenue, 2);
  const directFromCenters = toNumber(costTotals.direct);
  const overheadFromCenters = toNumber(costTotals.overhead);
  const directCostTotal = round(totals.order_direct_cost + directFromCenters, 2);
  const overheadCostTotal = round(overheadFromCenters, 2);
  const totalCosts = round(directCostTotal + overheadCostTotal, 2);

  totals.direct_cost = directCostTotal;
  totals.overhead_cost = overheadCostTotal;
  totals.total_costs = totalCosts;
  totals.gross_profit = round(totals.revenue - directCostTotal, 2);
  totals.net_profit = round(totals.revenue - totalCosts, 2);
  totals.gross_margin_pct = totals.revenue > 0 ? round((totals.gross_profit / totals.revenue) * 100, 2) : 0;
  totals.net_margin_pct = totals.revenue > 0 ? round((totals.net_profit / totals.revenue) * 100, 2) : 0;
  totals.avg_weight_per_pouch_g = totals.pouches > 0 ? round((totals.kilos * 1000) / totals.pouches, 1) : 0;
  totals.avg_order_value = totals.orders > 0 ? round(totals.revenue / totals.orders, 2) : 0;
  totals.yield_pct = totals.expected_pouches > 0 ? round((totals.pouches / totals.expected_pouches) * 100, 2) : 0;

  const byDate = new Map();
  const byCity = new Map();
  const byMonth = new Map();

  enriched.forEach((row) => {
    const dKey = dateKey(row.production_date);
    if (dKey) {
      const bucket = byDate.get(dKey) || { date: dKey, kilos: 0, pouches: 0, revenue: 0 };
      bucket.kilos += row.kilos;
      bucket.pouches += row.pouches_produced;
      bucket.revenue += row.revenue;
      byDate.set(dKey, bucket);
    }

    const cKey = row.city || "Unknown";
    const cBucket = byCity.get(cKey) || { city: cKey, kilos: 0, pouches: 0, revenue: 0, gross_profit: 0 };
    cBucket.kilos += row.kilos;
    cBucket.pouches += row.pouches_produced;
    cBucket.revenue += row.revenue;
    cBucket.gross_profit += row.gross_profit;
    byCity.set(cKey, cBucket);

    const mKey = monthKey(row.production_date);
    const mBucket = byMonth.get(mKey) || { period: mKey, kilos: 0, pouches: 0, expected_pouches: 0 };
    mBucket.kilos += row.kilos;
    mBucket.pouches += row.pouches_produced;
    mBucket.expected_pouches += row.expected_pouches;
    byMonth.set(mKey, mBucket);
  });

  const timeSeries = [...byDate.values()]
    .map((item) => ({
      ...item,
      kilos: round(item.kilos, 2),
      revenue: round(item.revenue, 2),
    }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  const citySeries = [...byCity.values()]
    .map((item) => ({
      ...item,
      kilos: round(item.kilos, 2),
      revenue: round(item.revenue, 2),
      gross_profit: round(item.gross_profit, 2),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const varianceSeries = [...byMonth.values()]
    .map((item) => ({
      ...item,
      kilos: round(item.kilos, 2),
      variance_pct: item.expected_pouches > 0
        ? round(((item.pouches - item.expected_pouches) / item.expected_pouches) * 100, 2)
        : 0,
    }))
    .sort((a, b) => (a.period > b.period ? 1 : -1));

  const topCity = citySeries[0]?.city || "—";

  return {
    rows: enriched,
    totals,
    timeSeries,
    citySeries,
    varianceSeries,
    topCity,
  };
}
