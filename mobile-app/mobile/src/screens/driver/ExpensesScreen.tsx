import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useExpenses, useCreateExpense } from '../../hooks/useApi';
import { getDriverTruckId } from '../../lib/auth';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../theme/tokens';

const QUICK_CATEGORIES = ['Fuel', 'Food', 'Toll', 'Maintenance', 'Other'];

export default function ExpensesScreen() {
  const [truckId, setTruckId] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => { getDriverTruckId().then(setTruckId); }, []);

  const { data: allExpenses = [], isLoading } = useExpenses();
  const createExpense = useCreateExpense();

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayExpenses = allExpenses.filter((e: any) => new Date(e.date) >= today);
  const todayTotal = todayExpenses.reduce((s: number, e: any) => s + e.amount, 0);

  const handleAdd = async () => {
    if (!description.trim() || !amount) return Alert.alert('Error', 'Description and amount required');
    if (!truckId) return Alert.alert('Error', 'No truck selected');
    try {
      await createExpense.mutateAsync({ truckId, description, amount: Number(amount) });
      setModal(false); setDescription(''); setAmount('');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <View style={styles.container}>
      {/* Today Summary */}
      <View style={styles.summaryCard}>
        <Ionicons name="cash-outline" size={24} color={Colors.warning} />
        <View style={{ marginLeft: Spacing.md }}>
          <Text style={styles.summaryLabel}>Today's Expenses</Text>
          <Text style={styles.summaryAmt}>₹{todayTotal.toLocaleString()}</Text>
        </View>
        <Text style={styles.summaryCount}>{todayExpenses.length} entries</Text>
      </View>

      {isLoading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={allExpenses}
          keyExtractor={i => i._id}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isToday = new Date(item.date) >= today;
            return (
              <View style={[styles.expenseCard, isToday && styles.todayCard]}>
                <View style={[styles.catIcon, { backgroundColor: Colors.warning + '20' }]}>
                  <Ionicons name="receipt" size={18} color={Colors.warning} />
                </View>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseDesc}>{item.description}</Text>
                  <Text style={styles.expenseDate}>{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <Text style={styles.expenseAmt}>₹{item.amount.toLocaleString()}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="receipt-outline" size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>No expenses logged</Text></View>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.bottomSheet}>
            <Text style={styles.modalTitle}>Log Expense</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {QUICK_CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat} style={[styles.quickChip, description === cat && styles.quickChipActive]} onPress={() => setDescription(cat)}>
                    <Text style={[styles.quickText, description === cat && { color: Colors.warning }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput style={styles.fieldInput} placeholder="e.g. Fuel - 10L" placeholderTextColor={Colors.textMuted} value={description} onChangeText={setDescription} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Amount (₹)</Text>
              <TextInput style={[styles.fieldInput, { fontSize: FontSize.xl, fontWeight: '700', textAlign: 'center' }]} placeholder="0" placeholderTextColor={Colors.textMuted} keyboardType="numeric" value={amount} onChangeText={setAmount} />
            </View>
            <View style={styles.btns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAdd}>
                {createExpense.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Add Expense</Text>}
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
  summaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: Spacing.md, borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: '#E2E8F0', ...Shadows.sm },
  summaryLabel: { fontSize: FontSize.sm, color: '#64748B' },
  summaryAmt: { fontSize: FontSize['2xl'], fontWeight: '900', color: '#1E293B' },
  summaryCount: { marginLeft: 'auto', fontSize: FontSize.sm, color: '#64748B' },
  expenseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#E2E8F0', ...Shadows.sm },
  todayCard: { borderColor: Colors.warning + '40' },
  catIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: FontSize.md, fontWeight: '600', color: '#1E293B' },
  expenseDate: { fontSize: FontSize.xs, color: '#64748B', marginTop: 2 },
  expenseAmt: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.warning },
  empty: { alignItems: 'center', paddingVertical: 60, opacity: 0.5 },
  emptyText: { color: '#64748B', marginTop: 12, fontSize: FontSize.md },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.warning, alignItems: 'center', justifyContent: 'center', ...Shadows.md },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: Colors.bgSurface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  quickChipActive: { borderColor: Colors.warning, backgroundColor: Colors.warning + '15' },
  quickText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textMuted },
  fieldGroup: { marginBottom: Spacing.lg },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  fieldInput: { backgroundColor: Colors.bgInput, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, paddingHorizontal: Spacing.md, height: 46 },
  btns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, height: 46, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, height: 46, borderRadius: BorderRadius.lg, backgroundColor: Colors.warning, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#fff', fontWeight: '700' },
});
