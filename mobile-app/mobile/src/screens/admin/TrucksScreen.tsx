import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ScrollView, ActivityIndicator, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTrucks, useCreateTruck, useDeleteTruck, useTruckStock, useGodownStock, useLoadTruck, useReturnStock, useProducts } from '../../hooks/useApi';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../theme/tokens';

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

export default function TrucksScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data: trucks = [], isLoading } = useTrucks();
  const { data: godownStock = [] } = useGodownStock();
  const { data: products = [] } = useProducts();
  const createTruck = useCreateTruck();
  const deleteTruck = useDeleteTruck();
  const loadTruck = useLoadTruck();
  const returnStock = useReturnStock();

  const [addModal, setAddModal] = useState(false);
  const [loadModal, setLoadModal] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<any>(null);
  const [form, setForm] = useState({ vehicleNumber: '', driverName: '' });
  const [loadQtys, setLoadQtys] = useState<Record<string, string>>({});
  const [returning, setReturning] = useState(false);
  const [deleteId, setDeleteId] = useState<any>(null);

  const selectedId = selectedTruck?._id || selectedTruck?.id;
  const { data: truckStockData = [] } = useTruckStock(selectedId);

  /** Map of current truck stock for easy lookup */
  const truckStockMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    truckStockData.forEach((s: any) => {
      const prod = s.product || s.productId;
      const pId = prod?._id || prod?.id || prod;
      map[pId] = s.casesAvailable;
    });
    return map;
  }, [truckStockData]);

  /** Look up itemsPerCase for a stock entry */
  const getItemsPerCase = (s: any): number => {
    const prod = s.product || s.productId;
    // If product is populated, use it directly
    if (prod?.itemsPerCase) return prod.itemsPerCase;
    // Otherwise, find from products list
    const prodId = prod?._id || prod?.id || prod;
    const found = products.find((p: any) => (p._id || p.id) === prodId);
    return found?.itemsPerCase || 1;
  };

  const handleAddTruck = async () => {
    if (!form.vehicleNumber || !form.driverName) return Alert.alert('Error', 'Both fields required');
    await createTruck.mutateAsync(form);
    setAddModal(false);
    setForm({ vehicleNumber: '', driverName: '' });
  };

  const handleDelete = (t: any) => {
    if (Platform.OS === 'web') {
      setDeleteId(t);
      return;
    }

    const id = t._id || t.id;
    Alert.alert('Delete Truck', `Delete ${t.vehicleNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteTruck.mutateAsync(id); } catch (e: any) { Alert.alert('Error', e.message); } } }
    ]);
  };

  const openLoad = (truck: any) => { setSelectedTruck(truck); setLoadQtys({}); setReturning(false); setLoadModal(true); };
  const openReturn = (truck: any) => { setSelectedTruck(truck); setLoadQtys({}); setReturning(true); setLoadModal(true); };

  const handleUnloadAll = () => {
    if (!truckStockData) return;
    const allItems: Record<string, string> = {};
    truckStockData.forEach((s: any) => {
      const prod = s.product || s.productId;
      const pId = (prod?._id || prod?.id || prod).toString();
      if (s.casesAvailable > 0) {
        // Use exact value to avoid discrepancies
        allItems[pId] = String(s.casesAvailable);
      }
    });
    setLoadQtys(allItems);
  };

  const handleSubmitLoad = async () => {
    const items = Object.entries(loadQtys)
      .map(([productId, qty]) => ({ productId, quantity: Number(qty) }))
      .filter(i => i.quantity > 0);
    if (items.length === 0) return Alert.alert('Error', 'Enter at least one quantity');
    const id = selectedTruck?._id || selectedTruck?.id;
    console.log('[DEBUG] Submitting Stock Operation:', {
      type: returning ? 'RETURN' : 'LOAD',
      truckId: id,
      itemCount: items.length,
      items
    });

    try {
      if (returning) { 
        await returnStock.mutateAsync({ truckId: id, items }); 
      } else { 
        await loadTruck.mutateAsync({ truckId: id, items }); 
      }
      console.log('[DEBUG] Operation Successful');
      setLoadModal(false);
    } catch (e: any) { 
      console.error('[DEBUG] Operation Failed:', e);
      Alert.alert('Error', e.message || 'Failed to update stock'); 
    }
  };

  const stockItems = returning ? truckStockData : godownStock;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Truck Fleet</Text>
      </View>

      {isLoading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={trucks}
          keyExtractor={i => String(i._id || i.id)}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.truckIcon}>
                  <Ionicons name="car" size={24} color={Colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={styles.vehicleNo}>{item.vehicleNumber}</Text>
                  <Text style={styles.driverName}>Driver: {item.driverName}</Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                </TouchableOpacity>
              </View>
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.loadBtn} onPress={() => openLoad(item)}>
                  <Ionicons name="arrow-down-circle-outline" size={16} color={Colors.success} />
                  <Text style={[styles.loadBtnText, { color: Colors.success }]}>Load Stock</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.loadBtn, { borderColor: Colors.warning + '40' }]} onPress={() => openReturn(item)}>
                  <Ionicons name="arrow-up-circle-outline" size={16} color={Colors.warning} />
                  <Text style={[styles.loadBtnText, { color: Colors.warning }]}>Return Stock</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="car-outline" size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>No trucks added</Text></View>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setAddModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Truck Modal */}
      <Modal visible={addModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.bottomSheet}>
            <Text style={styles.modalTitle}>Add New Truck</Text>
            {[{ label: 'Vehicle Number', key: 'vehicleNumber', ph: 'KA19 AB 1234' }, { label: 'Driver Name', key: 'driverName', ph: 'Ramesh' }].map(f => (
              <View key={f.key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput style={styles.fieldInput} placeholder={f.ph} placeholderTextColor={Colors.textMuted} value={(form as any)[f.key]} onChangeText={t => setForm(p => ({ ...p, [f.key]: t }))} />
              </View>
            ))}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAddTruck}>{createTruck.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Add Truck</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Load/Return Modal */}
      <Modal visible={loadModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.bottomSheet, { maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl }}>
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>{returning ? 'Return Stock' : 'Load Stock'} — {selectedTruck?.vehicleNumber}</Text>
              {returning && (
                <TouchableOpacity style={styles.unloadAllBtn} onPress={handleUnloadAll}>
                  <Text style={styles.unloadAllText}>Unload All</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {stockItems.map((s: any) => {
                const prod = s.product || s.productId;
                const pId = (prod?._id || prod?.id || prod).toString();
                const ipc = getItemsPerCase(s);
                return (
                  <View key={s._id || s.id || pId} style={styles.stockRow}>
                    <Image 
                      source={{ uri: prod?.imageUrl || 'https://via.placeholder.com/60' }} 
                      style={styles.modalProductImg} 
                      resizeMode="contain"
                    />
                    <View style={styles.stockInfoCol}>
                      <Text style={styles.stockName} numberOfLines={1}>{prod?.name || 'Product'}</Text>
                      <View style={styles.stockBadgeContainer}>
                        <View style={[styles.stockBadge, { backgroundColor: Colors.bgInput }]}>
                          <Ionicons name="business-outline" size={12} color={Colors.textSecondary} />
                          <Text style={styles.stockBadgeLabel}>{'Godown: '}</Text>
                          <Text style={styles.stockValue}>{formatStock(s.casesAvailable, ipc)}</Text>
                        </View>
                        {!returning && (
                          <View style={[styles.stockBadge, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]}>
                            <Ionicons name="bus-outline" size={12} color={Colors.primary} />
                            <Text style={[styles.stockBadgeLabel, { color: Colors.primary }]}>{' Truck: '}</Text>
                            <Text style={[styles.stockValue, { color: Colors.primary }]}>{formatStock(truckStockMap[pId] || 0, ipc)}</Text>
                          </View>
                        )}
                        {returning && (
                          <View style={[styles.stockBadge, { backgroundColor: Colors.successBg, borderColor: Colors.success + '30' }]}>
                            <Ionicons name="bus-outline" size={12} color={Colors.success} />
                            <Text style={[styles.stockBadgeLabel, { color: Colors.success }]}>{' Truck: '}</Text>
                            <Text style={[styles.stockValue, { color: Colors.success }]}>{formatStock(s.casesAvailable, ipc)}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.qtyContainer}>
                      <TouchableOpacity 
                        style={styles.stepperBtn} 
                        onPress={() => {
                          const current = Number(loadQtys[pId] || 0);
                          if (current > 0) setLoadQtys(p => ({ ...p, [pId]: String(current - 1) }));
                        }}>
                        <Ionicons name="remove" size={18} color={Colors.textPrimary} />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.qtyInputStepper}
                        placeholder="0"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="numeric"
                        value={String(loadQtys[pId] || '')}
                        onChangeText={t => setLoadQtys(p => ({ ...p, [pId]: t }))}
                      />
                      <TouchableOpacity 
                        style={styles.stepperBtn} 
                        onPress={() => {
                          const current = Number(loadQtys[pId] || 0);
                          setLoadQtys(p => ({ ...p, [pId]: String(current + 1) }));
                        }}>
                        <Ionicons name="add" size={18} color={Colors.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setLoadModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmitLoad}><Text style={styles.confirmText}>Confirm</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal (Web) */}
      <Modal visible={!!deleteId} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={[styles.bottomSheet, { alignSelf: 'center', width: '90%', marginBottom: 'auto', marginTop: 'auto' }]}>
            <Text style={styles.modalTitle}>Delete Truck</Text>
            <Text style={{ marginTop: 10, marginBottom: 24, fontSize: 16, color: Colors.textPrimary }}>
              Are you sure you want to delete <Text style={{fontWeight:'700'}}>{deleteId?.vehicleNumber}</Text>? 
              {`\n\nAny stock currently on this truck will be automatically returned to the godown.`}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteId(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmBtn, { backgroundColor: Colors.danger }]} 
                onPress={async () => {
                  try {
                    const id = deleteId._id || deleteId.id;
                    await deleteTruck.mutateAsync(id);
                    setDeleteId(null);
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  }
                }}
              >
                <Text style={styles.confirmText}>Delete</Text>
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
  card: { backgroundColor: Colors.bgSurface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  truckIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  vehicleNo: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  driverName: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  deleteBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: Colors.dangerBg, alignItems: 'center', justifyContent: 'center' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: Spacing.md },
  loadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border },
  loadBtnText: { fontSize: FontSize.sm, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, opacity: 0.5 },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: FontSize.md },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.primary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: Colors.bgSurface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xl },
  fieldGroup: { marginBottom: Spacing.lg },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  fieldInput: { backgroundColor: Colors.bgInput, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, paddingHorizontal: Spacing.md, height: 46 },
  stockRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  modalProductImg: { width: 50, height: 50, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  stockInfoCol: { flex: 1, paddingRight: Spacing.sm },
  stockName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  stockBadgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stockBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stockBadgeLabel: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
  stockValue: { fontSize: 10, fontWeight: '700', color: Colors.textPrimary },
  qtyInput: { width: 60, backgroundColor: Colors.bgInput, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, textAlign: 'center', fontSize: FontSize.md, height: 38 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.bgInput },
  stepperBtn: { width: 32, height: 38, alignItems: 'center', justifyContent: 'center' },
  qtyInputStepper: { width: 44, color: Colors.textPrimary, textAlign: 'center', fontSize: FontSize.md, height: 38, borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: Spacing.xl },
  cancelBtn: { flex: 1, height: 46, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, height: 46, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.primary },
  confirmText: { color: '#fff', fontWeight: '700' },
  unloadAllBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#EFF6FF', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#BFDBFE' },
  unloadAllText: { fontSize: FontSize.sm, color: '#1D4ED8', fontWeight: '700' },
});
