import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Dimensions, Image, TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrders, useCustomers, useRoutes } from '../../hooks/useApi';
import { Colors, Shadows, Spacing, BorderRadius, FontSize } from '../../theme/tokens';

const { width } = Dimensions.get('window');

const UI = {
  p: Spacing.lg,
  card_radius: BorderRadius.xl,
  amber_grad: ['#FFFBEB', '#FEF3C7'],
  text_slate_900: '#0F172A',
  text_slate_800: '#1E293B',
  text_slate_500: '#475569', // Darkened
  text_slate_400: '#64748B', // Darkened
  primary: '#4F46E5',
};

function SummaryCard({ title, value, subValue, icon, color, bgGrad }: any) {
  const isAmber = color === 'amber';
  const iconBg = isAmber ? '#FEF3C7' : color === 'emerald' ? '#DCFCE7' : '#DBEAFE';
  const iconColor = isAmber ? '#D97706' : color === 'emerald' ? '#059669' : '#2563EB';

  return (
    <LinearGradient colors={bgGrad || ['#fff', '#fff']} style={[styles.summaryCard, !bgGrad && { borderWidth: 1, borderColor: '#F1F5F9' }]}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryIconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.summaryLabel, isAmber && { color: '#D97706' }]}>{title.toUpperCase()}</Text>
          <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
          {subValue && <Text style={[styles.summarySub, isAmber && { color: '#D97706' }]}>{subValue}</Text>}
        </View>
      </View>
    </LinearGradient>
  );
}

export default function TopPerformersScreen() {
  const insets = useSafeAreaInsets();
  const { data: orders = [], isLoading: oLoad, refetch } = useOrders();
  const { data: customers = [] } = useCustomers();
  const { data: routes = [] } = useRoutes();

  const customerStats = customers
    .map((customer: any) => {
      const cOrders = orders.filter((o: any) => {
        const oCid = o.customerId?._id || o.customerId?.id || o.customerId;
        const cId = customer._id || customer.id;
        return oCid === cId;
      });
      const totalPurchases = cOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
      return { ...customer, totalPurchases, orderCount: cOrders.length };
    }).sort((a, b) => b.totalPurchases - a.totalPurchases);

  const topCustomer = customerStats[0];
  const totalRevenue = customerStats.reduce((s, c) => s + c.totalPurchases, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={oLoad} onRefresh={refetch} tintColor="#D97706" />}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="trophy" size={28} color="#D97706" />
          <Text style={styles.title}>Top Performers</Text>
        </View>
        <Text style={styles.subtitle}>Loyal partners driving business volume.</Text>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.row}>
          <SummaryCard 
            title="TOP PERFORMANCE" 
            value={topCustomer?.name || 'N/A'} 
            subValue={`₹${(topCustomer?.totalPurchases || 0).toLocaleString()}`} 
            icon="star" 
            color="amber" 
            bgGrad={UI.amber_grad} 
          />
        </View>
        <View style={styles.row}>
          <SummaryCard title="GROSS REVENUE" value={`₹${totalRevenue >= 1000 ? (totalRevenue/1000).toFixed(1) + 'k' : totalRevenue}`} icon="wallet" color="emerald" />
          <SummaryCard title="PARTNERS" value={`${customerStats.filter(c => c.orderCount > 0).length}`} icon="people" color="blue" />
        </View>
      </View>

      <View style={styles.list}>
        {customerStats.map((item, idx) => {
          const isTop3 = idx < 3;
          const bg = idx === 0 ? '#FFFBEB' : '#FFFFFF';
          const border = idx === 0 ? '#FEF3C7' : '#F1F5F9';

          return (
            <TouchableOpacity key={item._id || item.id} style={[styles.rankCard, { backgroundColor: bg, borderColor: border }]} activeOpacity={0.8}>
              <View style={styles.rankRow}>
                <View style={[styles.rankBadge, { backgroundColor: isTop3 ? bg : '#F8FAFC' }]}>
                  {idx === 0 ? <Ionicons name="ribbon" size={20} color="#D97706" /> : 
                   idx === 1 ? <Ionicons name="medal" size={20} color="#94A3B8" /> : 
                   idx === 2 ? <Ionicons name="medal" size={20} color="#B45309" /> : 
                   <Text style={styles.rankNum}>#{idx + 1}</Text>}
                </View>

                <View style={styles.custInfo}>
                  <Text style={styles.custName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.custMeta}>
                    <Text style={styles.metaText}>{routes.find(r => (r._id || r.id) === item.routeId)?.name || 'General Route'}</Text>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.metaText}>{item.orderCount} orders</Text>
                  </View>
                </View>

                <View style={styles.rankFin}>
                  <Text style={styles.rankAmount}>₹{item.totalPurchases >= 1000 ? (item.totalPurchases/1000).toFixed(1) + 'k' : item.totalPurchases}</Text>
                  <Text style={styles.rankAvg}>Rank {idx + 1}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  header: { marginBottom: 16, marginTop: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  title: { fontSize: 22, fontWeight: '900', color: UI.text_slate_800, letterSpacing: -0.5 },
  subtitle: { fontSize: 11, color: UI.text_slate_500, fontWeight: '600' },
  summaryGrid: { gap: 10, marginBottom: 20 },
  row: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, padding: 12, borderRadius: UI.card_radius, ...Shadows.sm, backgroundColor: '#fff' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  summaryLabel: { fontSize: 8, fontWeight: '800', color: UI.text_slate_400, letterSpacing: 0.8 },
  summaryValue: { fontSize: 14, fontWeight: '900', color: UI.text_slate_800 },
  summarySub: { fontSize: 10, fontWeight: '800', color: '#10B981' },
  list: { gap: 10 },
  rankCard: { padding: 12, borderRadius: UI.card_radius, borderWidth: 1, ...Shadows.sm },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontSize: 11, fontWeight: '900', color: UI.text_slate_400 },
  custInfo: { flex: 1 },
  custName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  custMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  dot: { fontSize: 10, color: UI.text_slate_300 },
  metaText: { fontSize: 10, fontWeight: '600', color: UI.text_slate_400 },
  rankFin: { alignItems: 'flex-end' },
  rankAmount: { fontSize: 14, fontWeight: '900', color: Colors.primary },
  rankAvg: { fontSize: 8, fontWeight: '800', color: UI.text_slate_400 },
});
