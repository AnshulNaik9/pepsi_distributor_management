import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ScrollView, ActivityIndicator, Image, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { 
  useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, 
  useAddGodownStock, useGodownStock, useCreateOffer 
} from '../../hooks/useApi';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../theme/tokens';
import { getApiUrl, setApiUrl } from '../../lib/api';

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

const CATEGORIES = [
  { value: '2_25_ltr', label: '2.25 Ltr' },
  { value: '1_ltr', label: '1 Ltr' },
  { value: '750_ml', label: '750 ml' },
  { value: '400_ml', label: '400 ml' },
  { value: 'others', label: 'Others' },
];

export default function ProductsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: products = [], isLoading, error } = useProducts();
   const { data: stock = [], isLoading: stockLoading } = useGodownStock();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const remove = useDeleteProduct();
  const addStock = useAddGodownStock();
  const createOffer = useCreateOffer();

  // Alert user if API fails
  React.useEffect(() => {
    if (error) {
      Alert.alert('Connection Error', 'Could not sync with backend. Please check if the server is running on port 5000.');
    }
  }, [error]);

  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState<any>(null);
  const [newlyCreated, setNewlyCreated] = useState<any>(null);
  const [promoModal, setPromoModal] = useState(false);
  const [promoStep, setPromoStep] = useState(1);
  const [promoQty, setPromoQty] = useState('');
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ 
    name: '', price: '', category: 'others', purchasePrice: '', 
    imageUrl: '', quantity: '0', itemsPerCase: '24'
  });
  const [search, setSearch] = useState('');
  const [debugUrl, setDebugUrl] = useState('');

  const openAdd = () => { setEditItem(null); setForm({ name: '', price: '', category: 'others', purchasePrice: '', imageUrl: '', quantity: '0', itemsPerCase: '24' }); setModal(true); };
  const openEdit = (p: any) => {
    setEditItem(p);
    setForm({ 
      name: p.name, price: String(p.price), category: p.category || 'others', 
      purchasePrice: String(p.purchasePrice || 0), imageUrl: p.imageUrl || '', 
      itemsPerCase: String(p.itemsPerCase || 24), quantity: '0'
    });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert('Error', 'Product name is required');
    if (!form.price) return Alert.alert('Error', 'Price is required');

    const data = { 
      name: form.name.trim(), 
      price: Number(form.price), 
      category: form.category, 
      purchasePrice: Number(form.purchasePrice || 0), 
      imageUrl: form.imageUrl.trim(),
      itemsPerCase: Number(form.itemsPerCase || 24)
    };
    
    try {
      if (editItem) { 
        const id = editItem._id || editItem.id;
        await update.mutateAsync({ id, data }); 
      } else { 
        const newProd = await create.mutateAsync(data); 
        const newId = newProd._id || newProd.id;
        
        if (Number(form.quantity) > 0) {
          await addStock.mutateAsync({ productId: newId, quantity: Number(form.quantity) });
        }
        
        setNewlyCreated(newProd);
        setTimeout(() => {
          setPromoStep(1);
          setPromoQty('');
          setPromoModal(true);
        }, 500);
      }
      setModal(false);
    } catch (e: any) { 
      Alert.alert('Save Error', e.message || 'Something went wrong'); 
    }
  };

  const handleDelete = (p: any) => {
    if (Platform.OS === 'web') {
      setDeleteId(p);
      return;
    }

    const id = p._id || p.id;
    const msg = `Delete "${p.name}"?`;
    Alert.alert('Delete Product', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await remove.mutateAsync(id); } catch (e: any) { Alert.alert('Error', e.message); } } }
    ]);
  };

  const productsByCategory = CATEGORIES.map(cat => ({
    ...cat,
    items: (products || []).filter((p: any) => 
      p.category === cat.value && 
      p.name.toLowerCase().includes(search.toLowerCase())
    )
  }));

  const renderProduct = (item: any) => {
    const pId = item._id || item.id;
    const qty = (stock || []).find((s: any) => (s.productId === pId))?.casesAvailable || 0;
    const stockColor = qty > 20 ? '#10B981' : qty > 5 ? '#F59E0B' : '#EF4444';
    const catLabel = (c: string) => CATEGORIES.find(x => x.value === c)?.label || c;
    
    return (
      <View key={pId} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.imageBox}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="contain" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="cube-outline" size={24} color="#94A3B8" />
              </View>
            )}
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            <View style={styles.stockRow}>
              <Text style={styles.stockLabel}>STOCK IN GODOWN</Text>
              <Text style={[styles.stockValue, { color: stockColor }]}>{formatStock(qty, item.itemsPerCase || 1)}</Text>
            </View>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>SELLING</Text>
            <Text style={styles.price}>₹{item.price}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.packingText}>{item.itemsPerCase} units/cs · {catLabel(item.category)}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
              <Ionicons name="create-outline" size={16} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const [apiUrl, setApiUrlState] = useState(getApiUrl());
  const [isServerUp, setIsServerUp] = useState(false);
  // Ping server to check status
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/products`);
        setIsServerUp(res.ok);
      } catch (e) {
        setIsServerUp(false);
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const handleUpdateApi = () => {
    setApiUrl(apiUrl);
    setApiUrlState(apiUrl);
    qc.invalidateQueries();
    Alert.alert('API Updated', `Target set to: ${apiUrl}`);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Product Catalog</Text>
        </View>

        <View style={styles.connBar}>
          <View style={[styles.statusDot, { backgroundColor: isServerUp ? '#10B981' : '#EF4444' }]} />
          <TextInput
            style={styles.connInput}
            value={apiUrl}
            onChangeText={setApiUrlState}
            placeholder="http://192.168.x.x:5000"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.connBtn} onPress={handleUpdateApi}>
            <Text style={styles.connBtnText}>UPDATE</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRow}>
          <Ionicons name="search" size={20} color="#94A3B8" style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.search}
            placeholder="Search products..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity 
          style={styles.syncBtn} 
          onPress={() => {
            qc.invalidateQueries({ queryKey: ['/api/products'] });
            qc.invalidateQueries({ queryKey: ['/api/godown-stock'] });
          }}
        >
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }}>
          {productsByCategory.map(section => (
            <View key={section.value} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.label} Products</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{section.items.length}</Text>
                </View>
              </View>
              
              {section.items.length === 0 ? (
                <Text style={styles.emptyText}>No products in this category yet.</Text>
              ) : (
                section.items.map(p => renderProduct(p))
              )}
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editItem ? 'Edit Product' : 'Add Product'}</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Product Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Pepsi 2.25L"
                  placeholderTextColor={Colors.textMuted}
                  value={form.name}
                  onChangeText={t => setForm(p => ({ ...p, name: t }))}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Image URL</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="https://..."
                  placeholderTextColor={Colors.textMuted}
                  value={form.imageUrl}
                  onChangeText={t => setForm(p => ({ ...p, imageUrl: t }))}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Selling Price (₹)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="100"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textMuted}
                  value={form.price}
                  onChangeText={t => setForm(p => ({ ...p, price: t }))}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Purchase Price (₹)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="80"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textMuted}
                  value={form.purchasePrice}
                  onChangeText={t => setForm(p => ({ ...p, purchasePrice: t }))}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Packing (1 Case = ? items)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="24"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textMuted}
                  value={form.itemsPerCase}
                  onChangeText={t => setForm(p => ({ ...p, itemsPerCase: t }))}
                />
              </View>
              {!editItem && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Quantity (in Cases)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="100"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.textMuted}
                    value={form.quantity}
                    onChangeText={t => setForm(p => ({ ...p, quantity: t }))}
                  />
                </View>
              )}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.catRow}>
                    {CATEGORIES.map(c => (
                      <TouchableOpacity
                        key={c.value}
                        style={[styles.catChip, form.category === c.value && styles.catChipActive]}
                        onPress={() => setForm(p => ({ ...p, category: c.value }))}
                      >
                        <Text style={[styles.catChipText, form.category === c.value && { color: Colors.primary }]}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={create.isPending || update.isPending}
              >
                {(create.isPending || update.isPending)
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>{editItem ? 'Update Product' : 'Add Product'}</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Promotion Setup Modal */}
      <Modal visible={promoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.promoContent}>
            <View style={styles.promoHeader}>
              <View style={styles.promoIconBg}>
                <Ionicons name="gift" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.promoTitle}>New Product Promotion</Text>
              <Text style={styles.promoSubtitle}>Set up free bottle offers for your customers.</Text>
            </View>

            {promoStep === 1 && (
              <View style={styles.promoBody}>
                <Text style={styles.promoQuestion}>
                  Does <Text style={styles.highlight}>{newlyCreated?.name}</Text> qualify for a free bottle promotion?
                </Text>
                <View style={styles.promoActions}>
                  <TouchableOpacity style={styles.promoBtnSec} onPress={() => setPromoModal(false)}>
                    <Text style={styles.promoBtnTextSec}>NO, SKIP</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.promoBtnPri} onPress={() => setPromoStep(2)}>
                    <Text style={styles.promoBtnTextPri}>YES, PROCEED</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {promoStep === 2 && (
              <View style={styles.promoBody}>
                <Text style={styles.promoQuestion}>
                  Is the free promotional bottle <Text style={styles.highlight}>Aquafina 1 Liter</Text>?
                </Text>
                <View style={styles.promoActions}>
                  <TouchableOpacity 
                    style={styles.promoBtnSec} 
                    onPress={() => {
                      Alert.alert('Custom Offers', 'You can set up custom promotions in the Web Admin "Offers" section later.');
                      setPromoModal(false);
                    }}
                  >
                    <Text style={styles.promoBtnTextSec}>NO</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.promoBtnPri} onPress={() => setPromoStep(3)}>
                    <Text style={styles.promoBtnTextPri}>YES</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {promoStep === 3 && (
              <View style={styles.promoBody}>
                <Text style={styles.promoLabel}>How many free bottles of Aquafina 1L should be applied per case?</Text>
                <TextInput
                  style={styles.promoInput}
                  placeholder="2"
                  keyboardType="numeric"
                  autoFocus
                  value={promoQty}
                  onChangeText={setPromoQty}
                />
                <TouchableOpacity 
                  style={[styles.promoBtnPri, { width: '100%', marginTop: 20 }]} 
                  onPress={async () => {
                  const qty = parseInt(promoQty);
                    const aquafina = products.find((p: any) => p.name.toLowerCase().includes("aquafina"));
                    
                    if (qty > 0 && newlyCreated && aquafina) {
                      try {
                        const buyId = newlyCreated._id || newlyCreated.id;
                        const freeId = aquafina._id || aquafina.id;
                        await createOffer.mutateAsync({
                          name: `Buy 1 ${newlyCreated.name} Get ${qty} Aquafina 1L Free`,
                          buyProductId: buyId,
                          buyQuantity: 1,
                          freeProductId: freeId,
                          freeQuantity: qty,
                          isActive: true
                        });
                        Alert.alert('Success', 'Promotion setup complete!');
                        setPromoModal(false);
                      } catch (e) {
                        Alert.alert('Error', 'Failed to create offer.');
                      }
                    } else {
                      if (!aquafina) Alert.alert('Error', 'Aquafina 1L not found in catalog.');
                      setPromoModal(false);
                    }
                  }}
                >
                  <Text style={styles.promoBtnTextPri}>CONFIRM PROMOTION</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Delete Confirmation Modal (Web) */}
      <Modal visible={!!deleteId} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignSelf: 'center', width: '85%', maxHeight: 'auto' }]}>
            <Text style={styles.modalTitle}>Delete Product</Text>
            <Text style={{ marginTop: 10, marginBottom: 24, fontSize: 16, color: '#334155' }}>
              Delete "{deleteId?.name}"?
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
                    await remove.mutateAsync(id);
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
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  topHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  pageTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  connBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10, backgroundColor: '#F8FAFC' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  connInput: { flex: 1, fontSize: 13, height: 36, color: '#64748B', fontWeight: '800' },
  connBtn: { paddingHorizontal: 10, height: 28, backgroundColor: Colors.primary + '10', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  connBtnText: { color: Colors.primary, fontSize: 10, fontWeight: '900' },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', height: 46, ...Shadows.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: Spacing.md },
  syncBtn: { backgroundColor: '#fff', height: 46, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', ...Shadows.sm, flexDirection: 'row', gap: 4 },
  syncText: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  search: { flex: 1, color: '#1E293B', fontSize: 14, paddingHorizontal: Spacing.md },
  // Card Styles
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginHorizontal: Spacing.md, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  imageBox: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F8FAFC', padding: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  productImage: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 15, fontWeight: '900', color: '#1E293B', marginBottom: 4 },
  stockRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  stockLabel: { fontSize: 8, fontWeight: '700', color: '#94A3B8' },
  stockValue: { fontSize: 13, fontWeight: '900' },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: 18, fontWeight: '900', color: Colors.primary },
  priceLabel: { fontSize: 8, color: '#64748B', fontWeight: '700', marginBottom: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  packingText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  
  // Section Styles
  section: { marginTop: 24, paddingHorizontal: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.md, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  countBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  countText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  emptyText: { fontSize: 12, fontStyle: 'italic', color: '#94A3B8', marginHorizontal: Spacing.md + 4, marginBottom: 12 },

  // Promo Modal Styles
  promoContent: { backgroundColor: '#fff', width: '90%', borderRadius: 32, padding: 24, alignItems: 'center', alignSelf: 'center', marginBottom: 'auto', marginTop: 'auto' },
  promoHeader: { alignItems: 'center', marginBottom: 24 },
  promoIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  promoTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B', textAlign: 'center' },
  promoSubtitle: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 },
  promoBody: { width: '100%', alignItems: 'center' },
  promoQuestion: { fontSize: 16, fontWeight: '700', color: '#334155', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  highlight: { color: Colors.primary },
  promoActions: { flexDirection: 'row', gap: 12, width: '100%' },
  promoBtnPri: { flex: 1, height: 56, backgroundColor: Colors.primary, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  promoBtnSec: { flex: 1, height: 56, backgroundColor: '#F1F5F9', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  promoBtnTextPri: { color: '#fff', fontWeight: '900', fontSize: 14 },
  promoBtnTextSec: { color: '#64748B', fontWeight: '800', fontSize: 14 },
  promoLabel: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 12, textAlign: 'center' },
  promoInput: { width: '100%', height: 64, backgroundColor: '#F8FAFC', borderRadius: 16, textAlign: 'center', fontSize: 32, fontWeight: '900', color: Colors.primary, borderWidth: 1, borderColor: '#E2E8F0' },

  // Restored Base Styles
  fab: { position: 'absolute', bottom: 30, right: 20, width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  fieldGroup: { marginBottom: Spacing.lg },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
  fieldInput: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', color: '#1E293B', fontSize: 15, paddingHorizontal: 16, height: 48 },
  catRow: { flexDirection: 'row', gap: 8 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: 'transparent' },
  catChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  catChipText: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  saveBtn: { height: 52, backgroundColor: Colors.primary, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, ...Shadows.primary },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
