import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffers, useCreateOffer, useProducts } from '../../hooks/useApi';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../theme/tokens';

export default function OffersScreen() {
  const { data: offers = [], isLoading } = useOffers();
  const { data: products = [] } = useProducts();
  const createOffer = useCreateOffer();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', buyProductId: '', buyQuantity: '1', freeProductId: '', freeQuantity: '2' });

  const handleAdd = async () => {
    if (!form.name || !form.buyProductId || !form.freeProductId) return Alert.alert('Error', 'All fields required');
    try {
      await createOffer.mutateAsync({ ...form, buyQuantity: Number(form.buyQuantity), freeQuantity: Number(form.freeQuantity) });
      setModal(false);
      setForm({ name: '', buyProductId: '', buyQuantity: '1', freeProductId: '', freeQuantity: '2' });
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const productName = (id: string) => products.find((p: any) => p._id === id)?.name || 'Select Product';

  return (
    <View style={styles.container}>
      {isLoading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={offers}
          keyExtractor={i => i._id}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.offerIcon}>
                <Ionicons name="pricetag" size={22} color={Colors.warning} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={styles.offerName}>{item.name}</Text>
                <Text style={styles.offerDesc}>
                  Buy {item.buyQuantity} → Get {item.freeQuantity} free
                </Text>
                <Text style={styles.offerProducts}>
                  {productName(item.buyProductId)} → {productName(item.freeProductId)}
                </Text>
              </View>
              <View style={[styles.activeBadge, { backgroundColor: item.isActive ? Colors.successBg : Colors.dangerBg }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: item.isActive ? Colors.success : Colors.danger }}>
                  {item.isActive ? 'ACTIVE' : 'OFF'}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="pricetag-outline" size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>No offers configured</Text></View>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.modalTitle}>Add Offer</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Offer Name</Text>
                <TextInput style={styles.input} placeholder="e.g. Buy 1 Get 2 Aquafina" placeholderTextColor={Colors.textMuted} value={form.name} onChangeText={t => setForm(p => ({ ...p, name: t }))} />
              </View>
              {[
                { label: 'Buy Product', key: 'buyProductId' },
                { label: 'Free Product', key: 'freeProductId' },
              ].map(f => (
                <View key={f.key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {products.map((p: any) => (
                        <TouchableOpacity key={p._id} style={[styles.productChip, (form as any)[f.key] === p._id && styles.productChipActive]} onPress={() => setForm(prev => ({ ...prev, [f.key]: p._id }))}>
                          <Text style={[styles.productChipText, (form as any)[f.key] === p._id && { color: Colors.primary }]} numberOfLines={1}>{p.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Buy Qty</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.buyQuantity} onChangeText={t => setForm(p => ({ ...p, buyQuantity: t }))} />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Free Qty</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.freeQuantity} onChangeText={t => setForm(p => ({ ...p, freeQuantity: t }))} />
                </View>
              </View>
              <View style={styles.btns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleAdd}>
                  {createOffer.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Add Offer</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSurface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm },
  offerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.warning + '20', alignItems: 'center', justifyContent: 'center' },
  offerName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  offerDesc: { fontSize: FontSize.sm, color: Colors.warning, marginTop: 2 },
  offerProducts: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  activeBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 4 },
  empty: { alignItems: 'center', paddingVertical: 60, opacity: 0.5 },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: FontSize.md },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.warning, alignItems: 'center', justifyContent: 'center', ...Shadows.md },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.bgSurface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, maxHeight: '90%', borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xl },
  fieldGroup: { marginBottom: Spacing.lg },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: Colors.bgInput, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, paddingHorizontal: Spacing.md, height: 46 },
  productChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, maxWidth: 130 },
  productChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  productChipText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  btns: { flexDirection: 'row', gap: 10, marginBottom: Spacing.xl },
  cancelBtn: { flex: 1, height: 46, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, height: 46, borderRadius: BorderRadius.lg, backgroundColor: Colors.warning, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#fff', fontWeight: '700' },
});
