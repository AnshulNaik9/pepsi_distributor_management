import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Dimensions, Svg, Path, Defs, LinearGradient as SvgGradient, Stop
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrders, useProducts } from '../../hooks/useApi';
import { Colors, Shadows, Spacing, BorderRadius, FontSize } from '../../theme/tokens';
import SvgComponent, { Path as SvgPath, Defs as SvgDefs, LinearGradient as LinearGrad, Stop as SvgStop } from 'react-native-svg';

const { width } = Dimensions.get('window');

const UI = {
  p: Spacing.lg,
  grid_gap: Spacing.md,
  card_radius: BorderRadius.xl,
  bg_emerald: ['#ECFDF5', '#D1FAE5'],
  bg_blue: ['#EFF6FF', '#DBEAFE'],
  bg_amber: ['#FFFBEB', '#FEF3C7'],
  text_emerald: '#059669',
  text_blue: '#2563EB',
  text_amber: '#D97706',
  text_slate_800: '#1E293B',
  text_slate_500: '#475569', // Darkened for visibility
};

function MetricCard({ title, value, icon, variant, trend }: any) {
  const colors = variant === 'emerald' ? UI.bg_emerald : variant === 'blue' ? UI.bg_blue : UI.bg_amber;
  const textColor = variant === 'emerald' ? UI.text_emerald : variant === 'blue' ? UI.text_blue : UI.text_amber;
  
  return (
    <LinearGradient colors={colors} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={styles.metricIconBox}>
          <Ionicons name={icon} size={20} color={textColor} />
        </View>
        <Text style={[styles.metricBadgeText, { color: textColor }]}>LIVE</Text>
      </View>
      <View style={styles.metricBody}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={[styles.metricLabel, { color: textColor }]}>{title}</Text>
      </View>
    </LinearGradient>
  );
}

function QuickActionCard({ title, desc, icon, color, onPress }: any) {
  const bgColor = color === 'emerald' ? '#F0FDF4' : color === 'blue' ? '#EFF6FF' : '#FFFBEB';
  const iconColor = color === 'emerald' ? '#059669' : color === 'blue' ? '#3B82F6' : '#D97706';
  const borderColor = color === 'emerald' ? '#DCFCE7' : color === 'blue' ? '#DBEAFE' : '#FEF3C7';

  return (
    <TouchableOpacity 
      style={[styles.quickCard, { backgroundColor: '#fff', borderColor: borderColor, borderWidth: 2 }]} 
      onPress={onPress} 
      activeOpacity={0.9}
    >
      <View style={styles.quickHeader}>
        <View style={styles.quickIconBox}>
          <Ionicons name={icon} size={32} color={iconColor} />
        </View>
        <View style={styles.quickArrow}>
          <Ionicons name="arrow-forward" size={20} color="#94A3B8" />
        </View>
      </View>
      <View style={styles.quickBody}>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickDesc}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AdminDashboard({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: orders = [], isLoading: oLoad, refetch } = useOrders();
  const { data: products = [] } = useProducts();
  
  const totalRevenue = orders.reduce((s: number, o: any) => s + o.totalAmount, 0);
  
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0,0,0,0);
    const dayOrders = orders.filter((o: any) => new Date(o.date).toDateString() === d.toDateString());
    return dayOrders.reduce((s: number, o: any) => s + o.totalAmount, 0);
  });
  const maxChartVal = Math.max(...chartData, 1000);
  const chartH = 150;
  const chartW = width - (UI.p * 2) - 40;
  const graphPoints = chartData.map((v, i) => `${(i / (chartData.length - 1)) * chartW},${chartH - (v / maxChartVal) * chartH}`);
  const areaD = `M0,${chartH} L${graphPoints.join(' L')} L${chartW},${chartH} Z`;
  const lineD = `M${graphPoints.join(' L')}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={oLoad} onRefresh={refetch} tintColor={UI.text_blue} />}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>Distribution Overview</Text>
        </View>
        <View style={styles.dateActive}>
          <Text style={styles.dateText}>{new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</Text>
        </View>
      </View>

      {/* Metric Cards Grid - 2 per row */}
      <View style={styles.metricGrid}>
        <View style={styles.metricRow}>
          <MetricCard title="Revenue" value={`₹${totalRevenue >= 1000 ? (totalRevenue/1000).toFixed(1) + 'k' : totalRevenue}`} icon="wallet" variant="emerald" />
          <MetricCard title="Active SKU" value={products.length.toString()} icon="cube" variant="blue" />
        </View>
        <View style={styles.metricRow}>
          <MetricCard title="Orders" value={orders.length.toString()} icon="receipt" variant="amber" />
          <MetricCard title="Inventory" value="1.6k" icon="car" variant="emerald" />
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.grid}>
        <QuickActionCard 
          title="Truck and loading" 
          desc="Manage truck inventory" 
          icon="car" 
          color="emerald" 
          onPress={() => navigation.navigate('AdminTrucks')}
        />
        <QuickActionCard 
          title="Bill History" 
          desc="Manage all invoices" 
          icon="time" 
          color="blue" 
          onPress={() => navigation.navigate('AdminOrders')}
        />
      </View>

      {/* Revenue Trend Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartZap}>
          <Ionicons name="flash" size={100} color="#4F46E5" style={{opacity: 0.05}} />
        </View>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>Revenue Trend</Text>
            <Text style={styles.chartSubtitle}>Daily sales performance for the last 10 records</Text>
          </View>
          <View style={styles.chartToggle}>
            <View style={styles.toggleActive}><Text style={styles.toggleTextActive}>Sales</Text></View>
            <View style={styles.toggleInactive}><Text style={styles.toggleTextInactive}>Volume</Text></View>
          </View>
        </View>

        <View style={styles.graphWrap}>
          <SvgComponent height={chartH} width={chartW}>
            <SvgDefs>
              <LinearGrad id="grad" x1="0" y1="0" x2="0" y2="1">
                <SvgStop offset="0" stopColor="#4F46E5" stopOpacity="0.3" />
                <SvgStop offset="1" stopColor="#4F46E5" stopOpacity="0" />
              </LinearGrad>
            </SvgDefs>
            <SvgPath d={areaD} fill="url(#grad)" />
            <SvgPath d={lineD} fill="none" stroke="#4F46E5" strokeWidth={4} />
          </SvgComponent>
          <View style={styles.xAxis}>
            <Text style={styles.axisText}>{new Date(new Date().setDate(new Date().getDate()-6)).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</Text>
            <Text style={styles.axisText}>{new Date().toLocaleDateString(undefined, {month:'short', day:'numeric'})}</Text>
          </View>
        </View>
      </View>

      {/* Recent Sales Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recently Dispatched</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AdminOrders')}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.listCard}>
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={32} color="#CBD5E1" />
            <Text style={styles.emptyText}>No sales recorded yet</Text>
          </View>
        ) : (
          orders.slice(0, 5).map((order: any, idx: number) => (
            <View key={order.id} style={[styles.listItem, idx === 0 && { borderTopWidth: 0 }]}>
              <View style={styles.listIcon}>
                <Ionicons name="cart" size={18} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle} numberOfLines={1}>{order.customer?.name || 'Walk-in Customer'}</Text>
                <Text style={styles.listSubtitle}>{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {order.paymentMode}</Text>
              </View>
              <Text style={styles.listValue}>₹{order.totalAmount.toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>

      {/* Inventory Snapshot */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SKU Performance</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AdminProducts')}>
          <Text style={styles.viewAll}>Inventory</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listCard}>
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={32} color="#CBD5E1" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        ) : (
          products.slice(0, 4).map((product: any, idx: number) => (
            <View key={product.id} style={[styles.listItem, idx === 0 && { borderTopWidth: 0 }]}>
              <View style={[styles.listIcon, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="cube" size={18} color="#64748B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.listSubtitle}>{product.category}</Text>
              </View>
              <Text style={[styles.listValue, { color: '#0F172A' }]}>₹{product.price}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 4 },
  title: { fontSize: 20, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 11, color: UI.text_slate_500, fontWeight: '600' },
  dateActive: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, ...Shadows.sm, borderWidth: 1, borderColor: '#F1F5F9' },
  dateText: { fontSize: 10, fontWeight: '800', color: '#4F46E5' },
  metricGrid: { gap: 10, marginBottom: 20 },
  metricRow: { flexDirection: 'row', gap: 10 },
  metricCard: { flex: 1, padding: 12, borderRadius: UI.card_radius, ...Shadows.sm },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  metricBadgeText: { fontSize: 8, fontWeight: '900', opacity: 0.6 },
  metricBody: { marginTop: 10 },
  metricValue: { fontSize: 20, fontWeight: '900', color: '#1E293B', letterSpacing: -0.5 },
  metricLabel: { fontSize: 9, fontWeight: '800', marginTop: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#1E293B', marginBottom: 10, marginLeft: 4 },
  grid: { gap: 10, marginBottom: 20 },
  quickCard: { padding: 14, borderRadius: UI.card_radius, ...Shadows.sm },
  quickHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickIconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  quickArrow: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  quickBody: { marginTop: 10 },
  quickTitle: { fontSize: 14, fontWeight: '900', color: '#1E293B' },
  quickDesc: { fontSize: 10, color: UI.text_slate_500, marginTop: 1, fontWeight: '500' },
  chartCard: { backgroundColor: '#fff', padding: 24, borderRadius: UI.card_radius, ...Shadows.md },
  chartZap: { position: 'absolute', top: 0, right: 0, padding: 16 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  chartTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  chartSubtitle: { fontSize: 11, color: UI.text_slate_500, marginTop: 2, fontWeight: '500' },
  chartToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 3, borderRadius: 8 },
  toggleActive: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, ...Shadows.sm },
  toggleInactive: { paddingHorizontal: 10, paddingVertical: 4 },
  toggleTextActive: { fontSize: 9, fontWeight: '800', color: '#1E293B' },
  toggleTextInactive: { fontSize: 9, fontWeight: '800', color: '#94A3B8' },
  graphWrap: { marginTop: 8 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  axisText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8, paddingHorizontal: 4 },
  viewAll: { fontSize: 11, fontWeight: '800', color: '#4F46E5' },
  listCard: { backgroundColor: '#fff', borderRadius: UI.card_radius, ...Shadows.sm, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 8 },
  listIcon: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  listTitle: { fontSize: 12, fontWeight: '800', color: '#1E293B' },
  listSubtitle: { fontSize: 9, color: '#64748B', fontWeight: '600', marginTop: 1 },
  listValue: { fontSize: 13, fontWeight: '900', color: '#059669' },
  emptyState: { padding: 30, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 6 },
});
