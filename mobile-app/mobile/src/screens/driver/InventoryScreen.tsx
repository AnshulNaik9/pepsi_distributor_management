import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTruckStock, useReportDamage, useProducts } from '../../hooks/useApi';
import { getDriverTruckId } from '../../lib/auth';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../theme/tokens';

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

export default function InventoryScreen() {
  const [truckId, setTruckId] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [qty, setQty] = useState('');
  const reportDamage = useReportDamage();

  useEffect(() => { getDriverTruckId().then(setTruckId); }, []);

  const { data: stock = [], isLoading } = useTruckStock(truckId || undefined);
  const { data: products = [] } = useProducts();

  const getIPC = (item: any) => {
    const prod = item.product || item.productId;
    if (prod?.itemsPerCase) return prod.itemsPerCase;
    const prodId = prod?._id || prod?.id || prod;
    return products.find((p: any) => (p._id || p.id) === prodId)?.itemsPerCase || 1;
  };

  const totalCases = Math.round(stock.reduce((s: number, i: any) => s + i.casesAvailable, 0));

  const openDamage = (s: any) => { setSelected(s); setQty(''); setModal(true); };

  const handleDamage = async () => {
    if (!qty || Number(qty) <= 0) return Alert.alert('Error', 'Enter a valid bottle quantity');
    const prod = selected.product || selected.productId;
    const ipc = getIPC(selected);
    const casesDamaged = Number(qty) / ipc;

    try {
      await reportDamage.mutateAsync({ 
        productId: prod?._id || selected.productId, 
        truckId, 
        quantity: casesDamaged 
      });
      setModal(false);
      Alert.alert('Done', `${qty} bottles recorded as damaged`);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Ionicons name="cube" size={20} color={Colors.primary} />
          <Text style={styles.summaryVal}>{totalCases}</Text>
          <Text style={styles.summaryLabel}>Total Cases</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Ionicons name="cube-outline" size={20} color={Colors.success} />
          <Text style={styles.summaryVal}>{stock.length}</Text>
          <Text style={styles.summaryLabel}>Product Types</Text>
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
            const level = item.casesAvailable > 20 ? 'good' : item.casesAvailable > 10 ? 'low' : 'critical';
            const color = level === 'good' ? Colors.success : level === 'low' ? Colors.warning : Colors.danger;
            return (
              <View style={[styles.card, { borderLeftColor: color }]}>
                <View style={styles.stockBadge}>
                  <Text style={[styles.stockNum, { color }]}>{formatStock(item.casesAvailable, getIPC(item))}</Text>
                </View>
                
                <Image 
                  source={{ uri: prod?.imageUrl || 'https://via.placeholder.com/60' }} 
                  style={styles.stockImage}
                  resizeMode="contain"
                />

                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{prod?.name || 'Product'}</Text>
                  <View style={[styles.levelChip, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.levelText, { color }]}>{level.toUpperCase()}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.dmgBtn} onPress={() => openDamage(item)}>
                  <Ionicons name="warning-outline" size={14} color={Colors.danger} />
                  <Text style={styles.dmgText}>Damage</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No stock on this truck</Text>
            </View>
          }
        />
      )}

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.warningIcon}>
              <Ionicons name="warning" size={28} color={Colors.danger} />
            </View>
            <Text style={styles.modalTitle}>Report Damage</Text>
            <Text style={styles.modalSub}>{selected?.product?.name || 'Product'}</Text>
            <Text style={styles.modalCurrent}>Available: {selected ? formatStock(selected.casesAvailable, getIPC(selected)) : '0'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Bottles damaged"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={qty}
              onChangeText={setQty}
            />
            <View style={styles.btns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: Colors.danger }]} onPress={handleDamage}>
                {reportDamage.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Report Damage</Text>}
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
  summary: { flexDirection: 'row', backgroundColor: '#fff', margin: Spacing.md, borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: '#E2E8F0', ...Shadows.sm },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryVal: { fontSize: FontSize['2xl'], fontWeight: '900', color: '#1E293B' },
  summaryLabel: { fontSize: FontSize.xs, color: '#64748B' },
  summaryDivider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: Spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 4, ...Shadows.sm },
  stockBadge: { marginRight: Spacing.md, alignItems: 'center', minWidth: 70 },
  stockNum: { fontSize: 13, fontWeight: '900' },
  stockImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#F1F5F9', marginRight: Spacing.md },
  productInfo: { flex: 1 },
  stockUnit: { fontSize: FontSize.xs, color: '#64748B' },
  productName: { fontSize: FontSize.md, fontWeight: '700', color: '#1E293B' },
  levelChip: { alignSelf: 'flex-start', borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  levelText: { fontSize: 9, fontWeight: '700' },
  dmgBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.dangerBg },
  dmgText: { fontSize: FontSize.xs, color: Colors.danger, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, opacity: 0.5 },
  emptyText: { color: '#64748B', marginTop: 12, fontSize: FontSize.md },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: Colors.bgSurface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  warningIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: Colors.dangerBg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  modalSub: { fontSize: FontSize.lg, color: Colors.primary, marginTop: 4 },
  modalCurrent: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.xl },
  input: { width: '100%', backgroundColor: Colors.bgInput, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.xl, paddingHorizontal: Spacing.md, height: 56, marginBottom: Spacing.xl, textAlign: 'center', fontWeight: '700' },
  btns: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: { flex: 1, height: 46, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, height: 46, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#fff', fontWeight: '700' },
});
