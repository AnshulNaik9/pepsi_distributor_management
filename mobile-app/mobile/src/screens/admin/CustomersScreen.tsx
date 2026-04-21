import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ScrollView, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, usePayCredit, useRoutes } from '../../hooks/useApi';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../theme/tokens';

export default function CustomersScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data: customers = [], isLoading } = useCustomers();
  const { data: routes = [] } = useRoutes();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const payCredit = usePayCredit();

  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', routeId: '', creditBalance: '0', hasSpecialDiscount: false });
  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState<{msg: string, title: string, onConfirm: () => Promise<void>} | null>(null);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', phone: '', address: '', routeId: routes[0]?._id || routes[0]?.id || '', creditBalance: '0', hasSpecialDiscount: false });
    setModal(true);
  };
  const openEdit = (c: any) => {
    setEditItem(c);
    setForm({ name: c.name, phone: c.phone, address: c.address, routeId: c.routeId, creditBalance: String(c.creditBalance), hasSpecialDiscount: c.hasSpecialDiscount });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.routeId) return Alert.alert('Error', 'Name, phone and route required');
    const data = { name: form.name, phone: form.phone, address: form.address, routeId: form.routeId, creditBalance: Number(form.creditBalance || 0), hasSpecialDiscount: form.hasSpecialDiscount };
    try {
      if (editItem) { 
        const id = editItem._id || editItem.id;
        await updateCustomer.mutateAsync({ id, data }); 
      }
      else { await createCustomer.mutateAsync(data); }
      setModal(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handlePayCredit = (c: any) => {
    const id = c._id || c.id;
    const msg = `Clear ₹${c.creditBalance} credit for ${c.name}?`;
    
    if (Platform.OS === 'web') {
      setConfirmAction({
        title: 'Clear Credit',
        msg,
        onConfirm: async () => { await payCredit.mutateAsync(id); }
      });
      return;
    }

    Alert.alert('Clear Credit', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await payCredit.mutateAsync(id); } }
    ]);
  };

  const handleDelete = (c: any) => {
    const id = c._id || c.id;
    const msg = `Delete "${c.name}"?`;

    if (Platform.OS === 'web') {
      setConfirmAction({
        title: 'Delete Customer',
        msg,
        onConfirm: async () => { await deleteCustomer.mutateAsync(id); }
      });
      return;
    }

    Alert.alert('Delete Customer', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCustomer.mutateAsync(id); } }
    ]);
  };

  const filtered = customers.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));
  const routeName = (id: string) => routes.find((r: any) => (r._id === id || r.id === id))?.name || 'Unknown Route';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Customers</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={{ marginLeft: 12 }} />
        <TextInput style={styles.search} placeholder="Search customers..." placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} />
      </View>

      {isLoading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(i._id || i.id)}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.hasSpecialDiscount && <Ionicons name="star" size={14} color={Colors.warning} />}
                  </View>
                  <Text style={styles.phone}>{item.phone}</Text>
                  <Text style={styles.route} numberOfLines={1}>{routeName(item.routeId)}</Text>
                </View>
                {item.creditBalance > 0 && (
                  <TouchableOpacity style={styles.creditBadge} onPress={() => handlePayCredit(item)}>
                    <Text style={styles.creditText}>₹{item.creditBalance}</Text>
                    <Text style={styles.creditLabel}>credit</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.address} numberOfLines={1}><Ionicons name="location-outline" size={12} /> {item.address}</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
                  <Ionicons name="create-outline" size={16} color={Colors.primary} />
                  <Text style={[styles.actionText, { color: Colors.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.dangerBg }]} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                  <Text style={[styles.actionText, { color: Colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>No customers found</Text></View>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editItem ? 'Edit Customer' : 'Add Customer'}</Text>
              <TouchableOpacity onPress={() => setModal(false)}><Ionicons name="close" size={24} color={Colors.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: 'Full Name', key: 'name', placeholder: 'Sai Stores' },
                { label: 'Phone', key: 'phone', placeholder: '9876543210', keyboardType: 'phone-pad' },
                { label: 'Address', key: 'address', placeholder: '12 Main Street' },
                { label: 'Credit Balance (₹)', key: 'creditBalance', placeholder: '0', keyboardType: 'numeric' },
              ].map(f => (
                <View key={f.key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput style={styles.fieldInput} placeholder={f.placeholder} placeholderTextColor={Colors.textMuted} value={(form as any)[f.key]} onChangeText={t => setForm(p => ({ ...p, [f.key]: t }))} keyboardType={(f as any).keyboardType || 'default'} />
                </View>
              ))}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Route</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {routes.map((r: any) => {
                      const rId = r._id || r.id;
                      return (
                        <TouchableOpacity key={rId} style={[styles.chip, form.routeId === rId && styles.chipActive]} onPress={() => setForm(p => ({ ...p, routeId: rId }))}>
                          <Text style={[styles.chipText, form.routeId === rId && { color: Colors.primary }]}>{r.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
              <TouchableOpacity style={styles.discountToggle} onPress={() => setForm(p => ({ ...p, hasSpecialDiscount: !p.hasSpecialDiscount }))}>
                <View style={[styles.toggle, form.hasSpecialDiscount && styles.toggleOn]}>
                  <View style={[styles.toggleThumb, form.hasSpecialDiscount && styles.toggleThumbOn]} />
                </View>
                <Text style={styles.discountLabel}>Special Discount (₹20 off per order)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={createCustomer.isPending || updateCustomer.isPending}>
                {(createCustomer.isPending || updateCustomer.isPending) ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editItem ? 'Update Customer' : 'Add Customer'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete/Action Confirmation Modal (Web) */}
      <Modal visible={!!confirmAction} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignSelf: 'center', width: '85%', maxHeight: 'auto' }]}>
            <Text style={styles.modalTitle}>{confirmAction?.title}</Text>
            <Text style={{ marginTop: 10, marginBottom: 24, fontSize: 16, color: '#334155' }}>
              {confirmAction?.msg}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[styles.promoBtnSec, { height: 48 }]} onPress={() => setConfirmAction(null)}>
                <Text style={styles.promoBtnTextSec}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.promoBtnPri, { height: 48, backgroundColor: '#EF4444', shadowColor: '#EF4444' }]} 
                onPress={async () => {
                  if (!confirmAction) return;
                  try {
                    await confirmAction.onConfirm();
                    setConfirmAction(null);
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  }
                }}
              >
                <Text style={styles.promoBtnTextPri}>Confirm</Text>
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
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: Spacing.md, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: '#E2E8F0', height: 46, ...Shadows.sm },
  search: { flex: 1, color: '#1E293B', fontSize: FontSize.md, paddingHorizontal: Spacing.md },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginHorizontal: Spacing.md, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  name: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  phone: { fontSize: 10, color: '#64748B', marginTop: 1 },
  route: { fontSize: 9, color: Colors.primary, marginTop: 1, fontWeight: '700' },
  creditBadge: { backgroundColor: '#FEF2F2', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, alignItems: 'center', borderWidth: 1, borderColor: '#FEE2E2' },
  creditText: { fontSize: 11, fontWeight: '900', color: '#DC2626' },
  creditLabel: { fontSize: 7, color: '#DC2626', fontWeight: '800' },
  address: { fontSize: 10, color: '#64748B', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F8FAFC' },
  actionText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 80, opacity: 0.5 },
  emptyText: { color: '#64748B', marginTop: 12, fontSize: FontSize.md, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  fieldGroup: { marginBottom: Spacing.lg },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
  fieldInput: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', color: '#1E293B', fontSize: 15, paddingHorizontal: 16, height: 48 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  chipText: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  discountToggle: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl, gap: 12, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0', justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: Colors.success },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  discountLabel: { fontSize: 13, color: '#475569', flex: 1, fontWeight: '600' },
  saveBtn: { height: 52, backgroundColor: Colors.primary, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, ...Shadows.primary },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  promoBtnPri: { flex: 1, height: 56, backgroundColor: Colors.primary, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  promoBtnSec: { flex: 1, height: 56, backgroundColor: '#F1F5F9', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  promoBtnTextPri: { color: '#fff', fontWeight: '900', fontSize: 14 },
  promoBtnTextSec: { color: '#64748B', fontWeight: '800', fontSize: 14 },
});
