import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ScrollView, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useOrders, useDeleteOrder, useCustomers, useTrucks } from '../../hooks/useApi';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../theme/tokens';

const PAY_COLORS: Record<string, string> = {
  Cash: Colors.success, UPI: '#8B5CF6', Credit: Colors.danger, Split: Colors.warning,
};

export default function OrdersScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data: orders = [], isLoading } = useOrders();
  const { data: customers = [] } = useCustomers();
  const deleteOrder = useDeleteOrder();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('today');
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [deleteId, setDeleteId] = useState<any>(null);

  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  const filterFn = (o: any) => {
    const d = new Date(o.date);
    if (filter === 'today') return d >= today;
    if (filter === 'yesterday') return d >= yesterday && d < today;
    if (filter === 'selectedDate') {
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    }
    return true;
  };

  const filtered = orders.filter((o: any) => {
    const customerName = o.customer?.name || '';
    return filterFn(o) && (
      customerName.toLowerCase().includes(search.toLowerCase()) ||
      String(o.totalAmount).includes(search)
    );
  });

  const totalRevenue = filtered.reduce((s: number, o: any) => s + o.totalAmount, 0);

  const handleDelete = (o: any) => {
    if (Platform.OS === 'web') {
      setDeleteId(o);
      return;
    }

    const id = o._id || o.id;
    const msg = `Delete order #${o.orderNumber || 'N/A'} of ₹${o.totalAmount}?`;
    Alert.alert('Delete Order', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteOrder.mutateAsync(id); } catch (e: any) { Alert.alert('Error', e.message); } } }
    ]);
  };

  const getPayColor = (pm: string) => {
    if (pm?.startsWith('Split')) return PAY_COLORS.Split;
    return PAY_COLORS[pm] || Colors.textMuted;
  };
  const getPayLabel = (pm: string) => pm?.startsWith('Split') ? 'Split' : pm;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Order History</Text>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          <Text style={styles.summaryCount}>{filtered.length}</Text> orders · <Text style={styles.summaryAmt}>₹{totalRevenue.toLocaleString()}</Text>
        </Text>
      </View>

      {/* Filters */}
      <View style={{ backgroundColor: '#fff' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 8, alignItems: 'center' }}>
          {['today', 'yesterday', 'all', 'selectedDate'].map(f => (
            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && { color: Colors.primary }]}>
                {f === 'selectedDate' ? 'Specific Date' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filter === 'selectedDate' && (
          <View style={styles.datePickerRow}>
            <Text style={styles.dateLabel}>Select Date:</Text>
            <TextInput
              style={styles.dateInput}
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
              // @ts-ignore - web only prop
              type="date"
            />
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={{ marginLeft: 12 }} />
        <TextInput style={styles.search} placeholder="Search by customer..." placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} />
      </View>

      {isLoading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(i._id || i.id)}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const color = getPayColor(item.paymentMode);
            return (
              <View style={[styles.card, { borderLeftColor: color }]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{item.customer?.name || 'Unknown'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.orderLabel}>#{item.orderNumber || 'N/A'}</Text>
                      <Text style={styles.orderDate}>{new Date(item.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                  </View>
                  <View style={styles.amountBox}>
                    <Text style={styles.amount}>₹{item.totalAmount.toLocaleString()}</Text>
                    <View style={[styles.payBadge, { backgroundColor: color + '20' }]}>
                      <Text style={[styles.payText, { color }]}>{getPayLabel(item.paymentMode)}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.itemsList}>
                  {(item.items || []).slice(0, 3).map((it: any, idx: number) => (
                    <Text key={idx} style={styles.itemText}>
                      {it.isFree ? '🎁 ' : ''}{it.product?.name || 'Item'} × {it.quantity}{it.isFree ? ' (free)' : ''}
                    </Text>
                  ))}
                  {(item.items || []).length > 3 && (
                    <Text style={styles.moreItems}>+{item.items.length - 3} more items</Text>
                  )}
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="receipt-outline" size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>No orders found</Text></View>}
        />
      )}

      {/* Delete Confirmation Modal (Web) */}
      <Modal visible={!!deleteId} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignSelf: 'center', width: '85%', maxHeight: 'auto' }]}>
            <Text style={styles.modalTitle}>Delete Order</Text>
            <Text style={{ marginTop: 10, marginBottom: 24, fontSize: 16, color: '#334155' }}>
              Delete order #{deleteId?.orderNumber || 'N/A'} of ₹{deleteId?.totalAmount}?
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[styles.promoBtnSec, { height: 48 }]} onPress={() => setDeleteId(null)}>
                <Text style={styles.promoBtnTextSec}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.promoBtnPri, { height: 48, backgroundColor: '#EF4444', shadowColor: '#EF4444' }]} 
                onPress={async () => {
                  try {
                    const id = deleteId._id || deleteId.id;
                    await deleteOrder.mutateAsync(id);
                    setDeleteId(null);
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  }
                }}
              >
                <Text style={styles.promoBtnTextPri}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  pageTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  summaryBar: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  summaryText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  summaryCount: { fontWeight: '900', color: '#1E293B' },
  summaryAmt: { fontWeight: '900', color: Colors.primary },
  filterRow: { height: 48, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  filterText: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  datePickerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12 },
  dateLabel: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  dateInput: { flex: 1, backgroundColor: '#fff', height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', px: 10, fontSize: 13, color: '#1E293B', textAlign: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 40, ...Shadows.sm },
  search: { flex: 1, color: '#1E293B', fontSize: 13, paddingHorizontal: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginHorizontal: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9', borderLeftWidth: 3, ...Shadows.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  customerName: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  orderLabel: { fontSize: 10, fontWeight: '900', color: Colors.primary, backgroundColor: Colors.primaryBg, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  orderDate: { fontSize: 10, color: '#64748B', marginTop: 1, fontWeight: '500' },
  amountBox: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontWeight: '900', color: '#1E293B' },
  payBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  payText: { fontSize: 8, fontWeight: '900' },
  itemsList: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  itemText: { fontSize: 11, color: '#475569', marginBottom: 2, fontWeight: '500' },
  moreItems: { fontSize: 10, color: '#94A3B8', fontStyle: 'italic', marginTop: 1 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#FEF2F2' },
  deleteBtnText: { fontSize: 10, color: '#EF4444', fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 60, opacity: 0.5 },
  emptyText: { color: '#64748B', marginTop: 10, fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 28, padding: Spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  promoBtnPri: { flex: 1, height: 56, backgroundColor: Colors.primary, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  promoBtnSec: { flex: 1, height: 56, backgroundColor: '#F1F5F9', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  promoBtnTextPri: { color: '#fff', fontWeight: '900', fontSize: 14 },
  promoBtnTextSec: { color: '#64748B', fontWeight: '800', fontSize: 14 },
});
