import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGodownStock, useAddGodownStock, useProducts } from '../../hooks/useApi';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../theme/tokens';
import { TextInput, Modal, Alert } from 'react-native';

/** Convert a decimal casesAvailable + itemsPerCase into "X cs Y btl" */
function formatStock(casesAvailable: number, itemsPerCase: number): string {
  const ipc = itemsPerCase && itemsPerCase > 1 ? itemsPerCase : 1;
  if (ipc === 1) return `${Math.round(casesAvailable)} cs`;
  const totalBottles = Math.round(casesAvailable * ipc);
  const cases = Math.floor(totalBottles / ipc);
  const bottles = totalBottles % ipc;
  if (cases > 0 && bottles > 0) return `${cases} cs ${bottles} btl`;
  if (cases > 0) return `${cases} cs`;
  if (bottles > 0) return `${bottles} btl`;
  return '0';
}

export default function StockScreen() {
  const { data: stock = [], isLoading } = useGodownStock();
  const { data: products = [] } = useProducts();
  const addStock = useAddGodownStock();

  const getIPC = (item: any) => {
    const prod = item.product || item.productId;
    if (prod?.itemsPerCase) return prod.itemsPerCase;
    const prodId = prod?._id || prod?.id || prod;
    return products.find((p: any) => (p._id || p.id) === prodId)?.itemsPerCase || 1;
  };
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [qty, setQty] = useState('');

  const openAdd = (s: any) => { setSelected(s); setQty(''); setModal(true); };
  const handleAdd = async () => {
    if (!qty || Number(qty) <= 0) return Alert.alert('Error', 'Enter a valid quantity');
    try {
      await addStock.mutateAsync({ productId: selected.product?._id || selected.productId, quantity: Number(qty) });
      setModal(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const total = Math.round(stock.reduce((s: number, item: any) => s + item.casesAvailable, 0));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCard}>
          <Ionicons name="cube" size={22} color={Colors.primary} />
          <Text style={styles.headerVal}>{total}</Text>
          <Text style={styles.headerLabel}>Total Cases in Godown</Text>
        </View>
      </View>

      {isLoading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={stock}
          keyExtractor={i => i._id}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const prod = item.product || item.productId;
            const level = item.casesAvailable > 50 ? 'high' : item.casesAvailable > 20 ? 'medium' : 'low';
            const color = level === 'high' ? Colors.success : level === 'medium' ? Colors.warning : Colors.danger;
            return (
              <View style={styles.card}>
                <View style={[styles.stockIndicator, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.stockCount, { color }]}>{formatStock(item.casesAvailable, getIPC(item))}</Text>
                </View>
                <View style={styles.stockInfo}>
                  <Text style={styles.productName}>{prod?.name || 'Product'}</Text>
                  <View style={[styles.levelBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.levelText, { color }]}>{level.toUpperCase()}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => openAdd(item)}>
                  <Ionicons name="add-circle" size={28} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="cube-outline" size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>No stock data</Text></View>}
        />
      )}

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.bottomSheet}>
            <Text style={styles.modalTitle}>Add Stock</Text>
            <Text style={styles.modalSub}>{selected?.product?.name || 'Product'}</Text>
            <Text style={styles.modalCurrent}>Current: {selected ? formatStock(selected.casesAvailable, getIPC(selected)) : '0'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Cases to add"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={qty}
              onChangeText={setQty}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAdd}>
                {addStock.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Add Stock</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  header: { padding: Spacing.md },
  headerCard: { backgroundColor: Colors.bgSurface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', flexDirection: 'row', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  headerVal: { fontSize: FontSize['3xl'], fontWeight: '900', color: Colors.primary },
  headerLabel: { fontSize: FontSize.sm, color: Colors.textMuted },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSurface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm },
  stockIndicator: { width: 72, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  stockCount: { fontSize: FontSize.sm, fontWeight: '900', textAlign: 'center' },
  stockUnit: { fontSize: FontSize.xs, fontWeight: '600' },
  stockInfo: { flex: 1 },
  productName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  levelBadge: { alignSelf: 'flex-start', borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  levelText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  addBtn: { padding: Spacing.sm },
  empty: { alignItems: 'center', paddingVertical: 60, opacity: 0.5 },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: FontSize.md },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: Colors.bgSurface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  modalSub: { fontSize: FontSize.lg, color: Colors.primary, marginTop: 4 },
  modalCurrent: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.xl },
  input: { backgroundColor: Colors.bgInput, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.xl, paddingHorizontal: Spacing.md, height: 56, marginBottom: Spacing.xl, textAlign: 'center', fontWeight: '700' },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, height: 46, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, height: 46, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.primary },
  confirmText: { color: '#fff', fontWeight: '700' },
});
