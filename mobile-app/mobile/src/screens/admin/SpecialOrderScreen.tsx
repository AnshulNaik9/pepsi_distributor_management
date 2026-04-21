import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomers, useProducts, useRoutes, useCheckout } from '../../hooks/useApi';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../theme/tokens';

export default function SpecialOrderScreen() {
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const { data: routes = [] } = useRoutes();
  const checkout = useCheckout();

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; customPrice?: number }>>([]);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [note, setNote] = useState('');

  const addItem = () => setItems(p => [...p, { productId: '', quantity: 1 }]);
  const removeItem = (idx: number) => setItems(p => p.filter((_, i) => i !== idx));
  const updateItem = (idx: number, key: string, val: any) => setItems(p => p.map((item, i) => i === idx ? { ...item, [key]: val } : item));

  const total = items.reduce((sum, item) => {
    const prod = products.find((p: any) => p._id === item.productId);
    return sum + (item.customPrice ?? prod?.price ?? 0) * item.quantity;
  }, 0);

  const handleSubmit = async () => {
    if (!selectedCustomer) return Alert.alert('Error', 'Select a customer');
    const validItems = items.filter(i => i.productId && i.quantity > 0);
    if (validItems.length === 0) return Alert.alert('Error', 'Add at least one item');
    try {
      await checkout.mutateAsync({ customerId: selectedCustomer._id, truckId: selectedTruckId || '000000000000000000000000', paymentMode, items: validItems });
      Alert.alert('✅ Success', 'Special order placed!');
      setSelectedCustomer(null); setItems([]); setNote(''); setPaymentMode('Cash');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Special Order</Text>
      <Text style={styles.pageSubtitle}>Create orders outside normal delivery routes</Text>

      {/* Customer Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Customer</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {customers.map((c: any) => (
              <TouchableOpacity key={c._id} style={[styles.chip, selectedCustomer?._id === c._id && styles.chipActive]} onPress={() => setSelectedCustomer(c)}>
                <Text style={[styles.chipText, selectedCustomer?._id === c._id && { color: Colors.primary }]} numberOfLines={1}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        {selectedCustomer && (
          <View style={styles.selectedCustomer}>
            <Ionicons name="person" size={14} color={Colors.primary} />
            <Text style={styles.selectedCustomerText}>{selectedCustomer.name} · {selectedCustomer.phone}</Text>
            {selectedCustomer.hasSpecialDiscount && <Ionicons name="star" size={14} color={Colors.warning} />}
          </View>
        )}
      </View>

      {/* Items */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Order Items</Text>
          <TouchableOpacity onPress={addItem} style={styles.addItemBtn}>
            <Ionicons name="add" size={16} color={Colors.primary} />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>
        {items.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {products.map((p: any) => (
                  <TouchableOpacity key={p._id} style={[styles.productChip, item.productId === p._id && styles.productChipActive]} onPress={() => updateItem(idx, 'productId', p._id)}>
                    <Text style={[styles.productChipText, item.productId === p._id && { color: Colors.primary }]} numberOfLines={1}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.itemControls}>
              <TextInput style={styles.qtyIn} placeholder="Qty" placeholderTextColor={Colors.textMuted} keyboardType="numeric" value={String(item.quantity)} onChangeText={t => updateItem(idx, 'quantity', Number(t) || 1)} />
              <TextInput style={styles.priceIn} placeholder="Custom ₹" placeholderTextColor={Colors.textMuted} keyboardType="numeric" value={item.customPrice != null ? String(item.customPrice) : ''} onChangeText={t => updateItem(idx, 'customPrice', t ? Number(t) : undefined)} />
              <TouchableOpacity onPress={() => removeItem(idx)} style={styles.removeBtn}>
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {items.length === 0 && (
          <View style={styles.emptyItems}>
            <Ionicons name="cart-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyItemsText}>No items added</Text>
          </View>
        )}
      </View>

      {/* Payment Mode */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Payment Mode</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {['Cash', 'UPI', 'Credit', 'Split'].map(pm => (
            <TouchableOpacity key={pm} style={[styles.payChip, paymentMode === pm && styles.payChipActive]} onPress={() => setPaymentMode(pm)}>
              <Text style={[styles.payChipText, paymentMode === pm && { color: Colors.primary }]}>{pm}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Total */}
      {items.length > 0 && (
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Order Total</Text>
          <Text style={styles.totalAmt}>₹{total.toLocaleString()}</Text>
          {selectedCustomer?.hasSpecialDiscount && <Text style={styles.discountNote}>⭐️ -₹20 special discount will apply</Text>}
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={checkout.isPending} activeOpacity={0.85}>
        {checkout.isPending ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.submitText}>Place Special Order</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  pageTitle: { fontSize: FontSize['3xl'], fontWeight: '900', color: Colors.textPrimary },
  pageSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.xl },
  section: { backgroundColor: Colors.bgSurface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, maxWidth: 140 },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  chipText: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
  selectedCustomer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md, backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.lg, padding: Spacing.sm },
  selectedCustomerText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', flex: 1 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  addItemText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  itemRow: { backgroundColor: Colors.bgDark, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  itemControls: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  qtyIn: { width: 50, backgroundColor: Colors.bgInput, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, textAlign: 'center', height: 36, fontSize: FontSize.md },
  priceIn: { flex: 1, backgroundColor: Colors.bgInput, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, paddingHorizontal: 8, height: 36, fontSize: FontSize.md },
  removeBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: Colors.dangerBg, alignItems: 'center', justifyContent: 'center' },
  emptyItems: { alignItems: 'center', paddingVertical: Spacing.xl, opacity: 0.5 },
  emptyItemsText: { color: Colors.textMuted, marginTop: 8, fontSize: FontSize.sm },
  productChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, maxWidth: 120 },
  productChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  productChipText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  payChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  payChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  payChipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textMuted },
  totalCard: { backgroundColor: Colors.bgSurface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '40', alignItems: 'center' },
  totalLabel: { fontSize: FontSize.md, color: Colors.textMuted },
  totalAmt: { fontSize: FontSize['4xl'], fontWeight: '900', color: Colors.primary, marginTop: 4 },
  discountNote: { fontSize: FontSize.sm, color: Colors.warning, marginTop: 6 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, ...Shadows.primary },
  submitText: { fontSize: FontSize.lg, fontWeight: '800', color: '#fff' },
});
