import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useOrders, useProducts } from '../../hooks/useApi';
import { Colors, Shadows, Spacing, BorderRadius, FontSize } from '../../theme/tokens';

const { width } = Dimensions.get('window');

const UI = {
  p: Spacing.lg,
  card_radius: BorderRadius.xl,
  emerald_grad: ['#059669', '#0D9488'],
  blue_grad: ['#2563EB', '#4F46E5'],
  indigo_grad: ['#4F46E5', '#7C3AED'],
  red_grad: ['#DC2626', '#E11D48'],
  text_slate_900: '#0F172A',
  text_slate_800: '#1E293B',
  text_slate_500: '#64748B',
  text_slate_400: '#94A3B8',
};

function FinancialCard({ title, value, subtitle, icon, color, width }: any) {
  const grad = color === 'emerald' ? UI.emerald_grad : color === 'blue' ? UI.blue_grad : color === 'indigo' ? UI.indigo_grad : UI.red_grad;
  
  return (
    <LinearGradient colors={grad} start={{x:0, y:0}} end={{x:1, y:1}} style={[styles.finCard, { width }]}>
      <View style={styles.finHeader}>
        <View style={styles.finIconBox}>
          <Ionicons name={icon} size={20} color="#fff" />
        </View>
        <Text style={styles.finInsight}>FINANCE</Text>
      </View>
      <View style={styles.finBody}>
        <Text style={styles.finValue}>{value}</Text>
        <Text style={styles.finTitle}>{title}</Text>
        <Text style={styles.finSubtitle}>{subtitle}</Text>
      </View>
    </LinearGradient>
  );
}

export default function ProfitPulseScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { data: orders = [], isLoading: oLoad, refetch } = useOrders();
  const { data: products = [] } = useProducts();

  const productStats = products.map((p: any) => {
    let rev = 0;
    let qty = 0;
    orders.forEach((o: any) => {
      (o.items || []).forEach((item: any) => {
        const prodId = typeof item.product === 'object' ? item.product?.id : item.productId;
        if ((prodId === p.id || prodId === p._id) && !item.isFree) {
          qty += item.quantity;
          rev += item.quantity * (item.customPrice ?? p.price);
        }
      });
    });
    const cost = qty * (p.purchasePrice || p.price * 0.7);
    const profit = rev - cost;
    const margin = rev > 0 ? (profit / rev) * 100 : 0;
    return { ...p, rev, qty, profit, margin, cost };
  }).filter((p: any) => p.qty > 0).sort((a: any, b: any) => b.profit - a.profit);

  const totalRevenue = productStats.reduce((s: number, p: any) => s + p.rev, 0);
  const totalCost = productStats.reduce((s: number, p: any) => s + p.cost, 0);
  const profit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={[styles.mainHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Profit Pulse</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={oLoad} onRefresh={refetch} tintColor="#059669" />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Metrics Overview</Text>
            <Text style={styles.subtitle}>Business profitability & ROI</Text>
          </View>
          <View style={styles.syncBadge}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>LIVE</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: UI.p, gap: 12, marginBottom: 20 }}>
          <FinancialCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} subtitle="Gross flow" icon="wallet" color="emerald" width={(width - UI.p * 2 - 12) / 2} />
          <FinancialCard title="Total Cost" value={`₹${totalCost.toLocaleString()}`} subtitle="Overhead" icon="stats-chart" color="blue" width={(width - UI.p * 2 - 12) / 2} />
          <FinancialCard title="Net Profit" value={`₹${profit.toLocaleString()}`} subtitle="Net yield" icon="trending-up" color={profit >= 0 ? "emerald" : "red"} width={(width - UI.p * 2 - 12) / 2} />
          <FinancialCard title="Margin" value={`${margin.toFixed(1)}%`} subtitle="Yield ROI" icon="pie-chart" color="indigo" width={(width - UI.p * 2 - 12) / 2} />
        </View>

      <View style={styles.breakdownCard}>
        <View style={styles.breakdownHeader}>
          <View style={styles.breakdownTitleRow}>
            <Ionicons name="pie-chart" size={20} color="#4F46E5" />
            <Text style={styles.breakdownTitle}>Product Breakdown</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.colHeader, { flex: 2 }]}>SKU</Text>
          <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>SALES</Text>
          <Text style={[styles.colHeader, { flex: 1.2, textAlign: 'right' }]}>ROI</Text>
        </View>

        {productStats.length === 0 && (
          <Text style={{ textAlign: 'center', padding: 20, color: '#94A3B8' }}>No sales data available</Text>
        )}
        {productStats.slice(0, 15).map((p: any) => {
          let badgeColor = '#ECFDF5';
          let textColor = '#065F46';
          let label = p.margin >= 20 ? 'HIGH' : p.margin >= 10 ? 'MED' : 'LOW';
          if (p.margin < 10) { badgeColor = '#FEF2F2'; textColor = '#991B1B'; }
          else if (p.margin < 20) { badgeColor = '#FFFBEB'; textColor = '#92400E'; }

          return (
            <View key={p.id} style={styles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.skuName}>{p.name}</Text>
                <Text style={styles.skuReserve}>₹{p.price} / unit</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.finRev}>₹{(p.rev).toLocaleString()}</Text>
                <Text style={styles.unitsLabel}>{p.qty} UNITS</Text>
              </View>
              <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                <Text style={[styles.yieldText, p.profit < 0 && { color: '#DC2626' }]}>
                  {p.profit >= 0 ? '+' : ''}₹{p.profit.toLocaleString()}
                </Text>
                <View style={[styles.roiBadge, { backgroundColor: badgeColor }]}>
                  <Text style={[styles.roiText, { color: textColor }]}>{p.margin.toFixed(1)}%</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  mainHeader: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  pageTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  content: { padding: 0 },
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  title: { fontSize: 22, fontWeight: '900', color: '#059669', letterSpacing: -0.5 },
  subtitle: { fontSize: 11, color: UI.text_slate_500, fontWeight: '600' },
  syncBadge: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#ECFDF5', flexDirection: 'row', alignItems: 'center', gap: 4, ...Shadows.sm },
  syncDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  syncText: { fontSize: 8, fontWeight: '900', color: '#065F46' },
  finCard: { padding: 16, borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadows.sm },
  finHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  finIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  finInsight: { fontSize: 7, fontWeight: '900', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.8 },
  finValue: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  finTitle: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  finSubtitle: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  breakdownCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: BorderRadius.lg, ...Shadows.sm, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  breakdownHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  breakdownTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breakdownTitle: { fontSize: 15, fontWeight: '900', color: UI.text_slate_800 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 8, paddingHorizontal: 16 },
  colHeader: { fontSize: 8, fontWeight: '900', color: UI.text_slate_400, letterSpacing: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  skuName: { fontSize: 12, fontWeight: '800', color: UI.text_slate_800 },
  skuReserve: { fontSize: 10, color: UI.text_slate_400, fontWeight: '600' },
  unitsLabel: { fontSize: 8, fontWeight: '800', color: UI.text_slate_400 },
  finRev: { fontSize: 12, fontWeight: '800', color: '#059669' },
  yieldText: { fontSize: 12, fontWeight: '800', color: '#059669' },
  roiBadge: { marginTop: 2, backgroundColor: '#ECFDF5', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  roiText: { fontSize: 7, fontWeight: '900', color: '#065F46' },
});
