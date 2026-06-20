import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Sale, Expense } from '@/types/database';
import { BarChart3, TrendingUp, PieChart, CandlestickChart, Expand, ChevronLeft, ChevronRight } from 'lucide-react-native';
import Svg, { Path, Circle, Line, Rect, G, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');

const CHART_W = SCREEN_W - 64;
const CHART_H = 280;
const PAD_L = 52;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 36;
const GRAPH_W = CHART_W - PAD_L - PAD_R;
const GRAPH_H = CHART_H - PAD_T - PAD_B;

const CANDLE_GAP = 3;

const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function getShortLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  const m = monthNames[d.getMonth()].slice(0, 3);
  return `${day} ${m}`;
}

function formatShort(val: number) {
  if (val >= 1_000_000) return 'Rp' + (val / 1_000_000).toFixed(1) + 'M';
  if (val >= 1000) return 'Rp' + (val / 1000).toFixed(1) + 'K';
  return 'Rp' + val.toLocaleString('id-ID');
}

function formatVal(val: number) {
  return 'Rp ' + val.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

interface DayData {
  date: string;
  label: string;
  value: number;
  day: number;
  month: string;
}

interface CandleData {
  date: string;
  label: string;
  open: number;
  close: number;
  high: number;
  low: number;
  color: string;
}

type ChartKind = 'bar' | 'line' | 'pie' | 'candle';

const chartTypes: { kind: ChartKind; label: string; sub: string; icon: any }[] = [
  { kind: 'bar', label: 'Bar', sub: 'Compare', icon: BarChart3 },
  { kind: 'line', label: 'Line', sub: 'Trends', icon: TrendingUp },
  { kind: 'pie', label: 'Pie', sub: 'Parts', icon: PieChart },
  { kind: 'candle', label: 'Market', sub: 'Candle', icon: CandlestickChart },
];

const metrics: { key: string; label: string; color: string }[] = [
  { key: 'penjualan', label: 'Penjualan (L)', color: '#22c55e' },
  { key: 'omzet', label: 'Omzet', color: '#06b6d4' },
  { key: 'profit', label: 'Profit', color: '#8b5cf6' },
  { key: 'pengeluaran', label: 'Pengeluaran', color: '#f97316' },
  { key: 'balance', label: 'Balance', color: '#3b82f6' },
];

export default function Grafik() {
  const [chartKind, setChartKind] = useState<ChartKind>('candle');
  const [metric, setMetric] = useState('balance');
  const [data, setData] = useState<DayData[]>([]);
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [rangeDays, setRangeDays] = useState(30);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const [candleDetail, setCandleDetail] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - rangeDays);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const [salesRes, expensesRes] = await Promise.all([
      supabase.from('sales').select('*').gte('tanggal', startStr).lte('tanggal', endStr),
      supabase.from('expenses').select('*').gte('tanggal', startStr).lte('tanggal', endStr),
    ]);

    const sales = (salesRes.data || []) as Sale[];
    const expenses = (expensesRes.data || []) as Expense[];

    const dates: string[] = [];
    for (let i = 0; i <= rangeDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    let runningBalance = 0;
    const candles: CandleData[] = [];

    const result: DayData[] = dates.map((date) => {
      const daySales = sales.filter(s => s.tanggal === date);
      const dayExpenses = expenses.filter(e => e.tanggal === date);
      const dayProfit = daySales.reduce((sum, s) => sum + Number(s.profit), 0);
      const dayOmzet = daySales.reduce((sum, s) => sum + Number(s.omzet), 0);
      const dayLiter = daySales.reduce((sum, s) => sum + Number(s.liter_terjual), 0);
      const dayPengeluaran = dayExpenses.reduce((sum, e) => sum + Number(e.nominal), 0);
      const dayBalance = dayProfit - dayPengeluaran;

      const prevBalance = runningBalance;
      runningBalance += dayBalance;

      const open = prevBalance;
      const close = runningBalance;
      const high = Math.max(open, close, open + dayProfit);
      const low = Math.min(open, close, close - dayPengeluaran);
      const color = close >= open ? '#22c55e' : '#ef4444';

      candles.push({
        date, label: getShortLabel(date),
        open, close, high, low, color,
      });

      let value = 0;
      if (metric === 'penjualan') value = dayLiter;
      else if (metric === 'omzet') value = dayOmzet;
      else if (metric === 'profit') value = dayProfit;
      else if (metric === 'pengeluaran') value = dayPengeluaran;
      else value = dayBalance;

      const d = new Date(date + 'T00:00:00');
      return { date, label: getShortLabel(date), value, day: d.getDate(), month: monthNames[d.getMonth()] };
    });

    setData(result);
    setCandleData(candles);
    setDetailIndex(null);
    setCandleDetail(null);
  }, [metric, rangeDays]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const values = data.map(d => d.value);
  const maxV = Math.max(...values, 1);
  const minV = Math.min(...values, 0);
  const avgV = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const points = values.length;

  const activeColor = metrics.find(m => m.key === metric)?.color || '#3b82f6';
  const activeMonth = data.length > 0 ? data[Math.floor(data.length / 2)].month : '';
  const activeYear = data.length > 0 ? new Date(data[Math.floor(data.length / 2)].date + 'T00:00:00').getFullYear() : new Date().getFullYear();

  const chartTitle = chartKind === 'candle'
    ? `Market Balance (${activeMonth} ${activeYear})`
    : `${metrics.find(m => m.key === metric)?.label} (${activeMonth} ${activeYear})`;

  const yScale = (v: number, min: number, max: number) => {
    const range = max - min || 1;
    return PAD_T + GRAPH_H - ((v - min) / range) * GRAPH_H;
  };

  const renderGrid = (min: number, max: number) => {
    const gridLines = [];
    const gridCount = 5;
    const range = max - min || 1;
    for (let i = 0; i <= gridCount; i++) {
      const gy = PAD_T + (i / gridCount) * GRAPH_H;
      const gv = min + ((gridCount - i) / gridCount) * range;
      gridLines.push(
        <Line key={`g${i}`} x1={PAD_L} y1={gy} x2={PAD_L + GRAPH_W} y2={gy} stroke="#334155" strokeWidth={0.5} strokeDasharray="4 4" />
      );
      gridLines.push(
        <SvgText key={`y${i}`} x={PAD_L - 6} y={gy + 4} fill="#64748b" fontSize={9} textAnchor="end">{formatShort(gv)}</SvgText>
      );
    }
    return gridLines;
  };

  const renderXLabels = (count: number, labelFn: (i: number) => string | null) => {
    const labelSkip = Math.max(1, Math.floor(count / 6));
    const labels = [];
    for (let i = 0; i < count; i++) {
      if (i % labelSkip !== 0) continue;
      const stepX = GRAPH_W / (count - 1 || 1);
      const x = PAD_L + i * stepX;
      const text = labelFn(i);
      if (text) {
        labels.push(
          <SvgText key={`l${i}`} x={x} y={CHART_H - 8} fill="#64748b" fontSize={10} textAnchor="middle">{text}</SvgText>
        );
      }
    }
    return labels;
  };

  const renderLineChart = () => {
    if (data.length < 2) return null;
    const stepX = GRAPH_W / (data.length - 1);
    const y = (v: number) => yScale(v, minV, maxV);
    const x = (i: number) => PAD_L + i * stepX;

    let pathD = '';
    data.forEach((d, i) => {
      const px = x(i);
      const py = y(d.value);
      if (i === 0) pathD += `M ${px} ${py}`;
      else pathD += ` L ${px} ${py}`;
    });

    return (
      <Svg width={CHART_W} height={CHART_H}>
        {renderGrid(minV, maxV)}
        {renderXLabels(data.length, i => data[i]?.label || null)}
        <Path d={`${pathD} L ${x(data.length - 1)} ${CHART_H - PAD_B} L ${x(0)} ${CHART_H - PAD_B} Z`} fill={activeColor} fillOpacity={0.08} />
        <Path d={pathD} fill="none" stroke={activeColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <Circle key={`p${i}`} cx={x(i)} cy={y(d.value)} r={detailIndex === i ? 6 : 3} fill={activeColor} stroke="#0f172a" strokeWidth={2} />
        ))}
        {detailIndex !== null && (
          <G>
            <Line x1={x(detailIndex)} y1={PAD_T} x2={x(detailIndex)} y2={CHART_H - PAD_B} stroke="#64748b" strokeWidth={0.5} strokeDasharray="3 3" />
            <Rect x={Math.max(0, x(detailIndex) - 55)} y={Math.max(0, y(data[detailIndex].value) - 45)} width={110} height={36} rx={8} fill="#1e293b" stroke="#334155" strokeWidth={1} />
            <SvgText x={Math.max(0, x(detailIndex) - 55) + 55} y={Math.max(0, y(data[detailIndex].value) - 45) + 14} fill="#fff" fontSize={11} fontWeight="600" textAnchor="middle">{formatVal(data[detailIndex].value)}</SvgText>
            <SvgText x={Math.max(0, x(detailIndex) - 55) + 55} y={Math.max(0, y(data[detailIndex].value) - 45) + 28} fill="#94a3b8" fontSize={9} textAnchor="middle">{data[detailIndex].label}</SvgText>
          </G>
        )}
      </Svg>
    );
  };

  const renderBarChart = () => {
    if (data.length === 0) return null;
    const barW = Math.max(3, (GRAPH_W / data.length) - 2);
    const y0 = yScale(0, minV, maxV);

    const bars = data.map((d, i) => {
      const barH = (Math.abs(d.value) / (maxV - minV || 1)) * GRAPH_H;
      const bx = PAD_L + i * (barW + 2);
      const by = d.value >= 0 ? y0 - barH : y0;
      const color = d.value >= 0 ? activeColor : '#ef4444';
      return <Rect key={i} x={bx} y={by} width={barW} height={Math.max(1, barH)} fill={color} rx={2} />;
    });

    return (
      <Svg width={CHART_W} height={CHART_H}>
        {renderGrid(minV, maxV)}
        {renderXLabels(data.length, i => data[i]?.label || null)}
        <Line x1={PAD_L} y1={y0} x2={PAD_L + GRAPH_W} y2={y0} stroke="#475569" strokeWidth={1} />
        {bars}
      </Svg>
    );
  };

  const renderPieChart = () => {
    if (data.length === 0) return null;
    const total = data.reduce((s, d) => s + Math.abs(d.value), 0);
    if (total === 0) return null;

    const cx = CHART_W / 2;
    const cy = CHART_H / 2;
    const r = 80;
    const innerR = 50;

    let startAngle = 0;
    const segments = data.map((d, i) => {
      const angle = (Math.abs(d.value) / total) * 2 * Math.PI;
      const endAngle = startAngle + angle;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      const dPath = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      const color = `hsl(${200 + (i * 360 / data.length) % 360}, 70%, 55%)`;
      startAngle = endAngle;
      return <Path key={i} d={dPath} fill={color} stroke="#0f172a" strokeWidth={1} />;
    });

    return (
      <Svg width={CHART_W} height={CHART_H}>
        {segments}
        <Circle cx={cx} cy={cy} r={innerR} fill="#0f172a" />
        <SvgText x={cx} y={cy - 8} fill="#fff" fontSize={14} fontWeight="700" textAnchor="middle">{formatShort(total)}</SvgText>
        <SvgText x={cx} y={cy + 8} fill="#94a3b8" fontSize={10} textAnchor="middle">Total</SvgText>
      </Svg>
    );
  };

  const renderCandleChart = () => {
    if (candleData.length === 0) return null;
    const flat = candleData.flatMap(c => [c.open, c.close, c.high, c.low]);
    const cMin = Math.min(...flat, 0);
    const cMax = Math.max(...flat, 1);
    const stepX = GRAPH_W / candleData.length;
    const candleWidth = Math.max(3, stepX - CANDLE_GAP);
    const y = (v: number) => yScale(v, cMin, cMax);

    return (
      <Svg width={CHART_W} height={CHART_H}>
        {renderGrid(cMin, cMax)}
        {renderXLabels(candleData.length, i => candleData[i]?.label || null)}
        {candleData.map((c, i) => {
          const x = PAD_L + i * stepX + stepX / 2;
          const yOpen = y(c.open);
          const yClose = y(c.close);
          const yHigh = y(c.high);
          const yLow = y(c.low);
          const top = Math.min(yOpen, yClose);
          const bottom = Math.max(yOpen, yClose);
          const bodyH = Math.max(1, bottom - top);
          const isGreen = c.close >= c.open;
          const color = isGreen ? '#22c55e' : '#ef4444';
          const isActive = candleDetail === i;

          return (
            <G key={i}>
              <Line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth={isActive ? 2 : 1} />
              <Rect x={x - candleWidth / 2} y={top} width={candleWidth} height={bodyH} fill={color} rx={1} />
              {isActive && (
                <G>
                  <Rect x={Math.max(0, x - 55)} y={Math.max(0, top - 52)} width={110} height={44} rx={8} fill="#1e293b" stroke={color} strokeWidth={1} />
                  <SvgText x={x} y={Math.max(0, top - 52) + 14} fill="#fff" fontSize={10} fontWeight="600" textAnchor="middle">O: {formatShort(c.open)} C: {formatShort(c.close)}</SvgText>
                  <SvgText x={x} y={Math.max(0, top - 52) + 26} fill="#94a3b8" fontSize={9} textAnchor="middle">H: {formatShort(c.high)} L: {formatShort(c.low)}</SvgText>
                  <SvgText x={x} y={Math.max(0, top - 52) + 38} fill={color} fontSize={9} fontWeight="600" textAnchor="middle">{c.label} | {isGreen ? 'Bullish' : 'Bearish'}</SvgText>
                </G>
              )}
            </G>
          );
        })}
      </Svg>
    );
  };

  const renderChart = () => {
    if (chartKind === 'line') return renderLineChart();
    if (chartKind === 'bar') return renderBarChart();
    if (chartKind === 'pie') return renderPieChart();
    return renderCandleChart();
  };

  const handleChartPress = (evt: any) => {
    const { locationX } = evt.nativeEvent;
    if (chartKind === 'line') {
      const stepX = GRAPH_W / (data.length - 1 || 1);
      const index = Math.round((locationX - PAD_L) / stepX);
      if (index >= 0 && index < data.length) setDetailIndex(index === detailIndex ? null : index);
    } else if (chartKind === 'candle') {
      const stepX = GRAPH_W / candleData.length;
      const index = Math.floor((locationX - PAD_L) / stepX);
      if (index >= 0 && index < candleData.length) setCandleDetail(index === candleDetail ? null : index);
    }
  };

  const candleStats = candleData.length > 0 ? {
    totalGreen: candleData.filter(c => c.close >= c.open).length,
    totalRed: candleData.filter(c => c.close < c.open).length,
    lastClose: candleData[candleData.length - 1].close,
    lastOpen: candleData[candleData.length - 1].open,
    maxHigh: Math.max(...candleData.map(c => c.high)),
    minLow: Math.min(...candleData.map(c => c.low)),
  } : null;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}>

        <Text style={styles.sectionLabel}>CHART TYPE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll} contentContainerStyle={styles.typeScrollContent}>
          {chartTypes.map(t => {
            const Icon = t.icon;
            const active = chartKind === t.kind;
            return (
              <TouchableOpacity key={t.kind} style={[styles.typeCard, active && styles.typeCardActive]} onPress={() => setChartKind(t.kind)}>
                <Icon size={24} color={active ? '#fff' : '#94a3b8'} />
                <Text style={[styles.typeCardLabel, active && styles.typeCardLabelActive]}>{t.label}</Text>
                <Text style={[styles.typeCardSub, active && styles.typeCardSubActive]}>{t.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {chartKind !== 'candle' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricScroll} contentContainerStyle={styles.metricScrollContent}>
            {metrics.map(m => {
              const active = metric === m.key;
              return (
                <TouchableOpacity key={m.key} style={[styles.metricChip, active && { backgroundColor: m.color + '25', borderColor: m.color }]} onPress={() => setMetric(m.key)}>
                  <View style={[styles.metricDot, { backgroundColor: m.color }]} />
                  <Text style={[styles.metricText, active && { color: m.color }]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {chartKind === 'candle' && candleStats && (
          <View style={styles.candleSummary}>
            <View style={[styles.candleBadge, { backgroundColor: '#22c55e20' }]}>
              <Text style={[styles.candleBadgeText, { color: '#22c55e' }]}>{candleStats.totalGreen} Bull</Text>
            </View>
            <View style={[styles.candleBadge, { backgroundColor: '#ef444420' }]}>
              <Text style={[styles.candleBadgeText, { color: '#ef4444' }]}>{candleStats.totalRed} Bear</Text>
            </View>
            <View style={[styles.candleBadge, { backgroundColor: '#3b82f620' }]}>
              <Text style={[styles.candleBadgeText, { color: '#3b82f6' }]}>Close {formatShort(candleStats.lastClose)}</Text>
            </View>
          </View>
        )}

        <View style={styles.rangeRow}>
          <TouchableOpacity style={styles.rangeBtn} onPress={() => setRangeDays(d => Math.max(7, d - 7))}>
            <ChevronLeft size={16} color="#94a3b8" />
          </TouchableOpacity>
          <Text style={styles.rangeText}>{rangeDays} Hari</Text>
          <TouchableOpacity style={styles.rangeBtn} onPress={() => setRangeDays(d => Math.min(90, d + 7))}>
            <ChevronRight size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>{chartTitle}</Text>
            <TouchableOpacity style={styles.expandBtn}>
              <Expand size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity activeOpacity={1} onPress={handleChartPress}>
            {renderChart()}
          </TouchableOpacity>

          {detailIndex !== null && chartKind === 'line' && (
            <View style={styles.detailBar}>
              <Text style={styles.detailText}>{data[detailIndex].label}: <Text style={[styles.detailValue, { color: activeColor }]}>{formatVal(data[detailIndex].value)}</Text></Text>
            </View>
          )}

          <View style={styles.statsFooter}>
            {chartKind === 'candle' && candleStats ? (
              <>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatShort(candleStats.maxHigh)}</Text>
                  <Text style={styles.statLabel}>HIGHEST</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatShort(candleStats.minLow)}</Text>
                  <Text style={styles.statLabel}>LOWEST</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatShort((candleStats.maxHigh + candleStats.minLow) / 2)}</Text>
                  <Text style={styles.statLabel}>MID</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{candleData.length}</Text>
                  <Text style={styles.statLabel}>CANDLES</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatShort(maxV)}</Text>
                  <Text style={styles.statLabel}>HIGHEST</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatShort(minV)}</Text>
                  <Text style={styles.statLabel}>LOWEST</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatShort(avgV)}</Text>
                  <Text style={styles.statLabel}>AVERAGE</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{points}</Text>
                  <Text style={styles.statLabel}>POINTS</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.insightRow}>
          <View style={[styles.insightCard, { backgroundColor: '#1e3a5f' }]}>
            <Text style={styles.insightLabel}>Total Hari Ini</Text>
            <Text style={[styles.insightValue, { color: activeColor }]}>
              {formatVal(data.find(d => d.date === new Date().toISOString().split('T')[0])?.value || 0)}
            </Text>
          </View>
          <View style={[styles.insightCard, { backgroundColor: '#1e3a5f' }]}>
            <Text style={styles.insightLabel}>Tren 7 Hari</Text>
            <Text style={[styles.insightValue, { color: avgV > 0 ? '#22c55e' : '#ef4444' }]}>
              {data.length > 7
                ? (((data[data.length - 1].value - data[data.length - 8].value) / Math.max(Math.abs(data[data.length - 8].value), 1)) * 100).toFixed(1) + '%'
                : '0%'}
            </Text>
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1121' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 8 },

  sectionLabel: { color: '#64748b', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 12, marginTop: 4 },

  typeScroll: { maxHeight: 100, marginBottom: 16 },
  typeScrollContent: { gap: 10, paddingRight: 16 },
  typeCard: {
    width: 100,
    height: 88,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeCardActive: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  typeCardLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  typeCardLabelActive: { color: '#fff' },
  typeCardSub: { color: '#64748b', fontSize: 10 },
  typeCardSubActive: { color: 'rgba(255,255,255,0.7)' },

  metricScroll: { maxHeight: 40, marginBottom: 12 },
  metricScrollContent: { gap: 8, paddingRight: 16 },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricDot: { width: 8, height: 8, borderRadius: 4 },
  metricText: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },

  candleSummary: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  candleBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  candleBadgeText: { fontSize: 11, fontWeight: '600' },

  rangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 },
  rangeBtn: { padding: 6, backgroundColor: '#1e293b', borderRadius: 8 },
  rangeText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },

  chartCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  chartTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  expandBtn: { padding: 8, backgroundColor: '#334155', borderRadius: 10 },

  detailBar: { backgroundColor: '#334155', borderRadius: 10, padding: 10, marginTop: 8, alignItems: 'center' },
  detailText: { color: '#94a3b8', fontSize: 13 },
  detailValue: { fontWeight: '700', fontSize: 14 },

  statsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: '#fff', fontSize: 15, fontWeight: '700' },
  statLabel: { color: '#64748b', fontSize: 9, fontWeight: '600', marginTop: 4, letterSpacing: 0.5 },
  statDivider: { width: 1, height: 30, backgroundColor: '#334155' },

  insightRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  insightCard: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155' },
  insightLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  insightValue: { fontSize: 18, fontWeight: '700' },
});
