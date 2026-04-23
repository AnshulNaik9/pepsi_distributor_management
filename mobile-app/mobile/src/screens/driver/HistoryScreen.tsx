import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOrders, useDeleteOrder } from '../../hooks/useApi';
import { getDriverTruckId } from '../../lib/auth';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../theme/tokens';
import { useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';

const PAY_COLORS: Record<string, string> = {
  Cash: Colors.success, UPI: '#8B5CF6', Credit: Colors.danger, Split: Colors.warning,
};

function formatQty(totalBottles: number, itemsPerCase: number): string {
  const ipc = itemsPerCase || 1;
  const btls = Math.round(totalBottles);
  const cs = Math.floor(btls / ipc);
  const rem = btls % ipc;
  if (cs > 0 && rem > 0) return `${cs}cs ${rem}btl`;
  if (cs > 0) return `${cs}cs`;
  if (rem > 0) return `${rem}btl`;
  return '0';
}

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const [truckId, setTruckId] = useState<string | null>(null);
  const [filter, setFilter] = useState('today');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { getDriverTruckId().then(setTruckId); }, []);

  const { data: allOrders = [], isLoading } = useOrders();
  const deleteOrder = useDeleteOrder();

  const printReceipt = async (orderData: any) => {
    try {
      const dateStr = new Date(orderData.date || Date.now()).toLocaleDateString();
      const custName = orderData.customer?.name || 'Walk-in Shop';
      const orderId = orderData.orderNumber || orderData._id || orderData.id || 'N/A';
      
      const consolidated = new Map();
      (orderData.items || []).forEach((item: any) => {
        const pid = String(item.product?._id || item.productId?._id || item.productId || item.product?.id || item.id || Math.random());
        const ipc = item.product?.itemsPerCase || 1;
        const btls = item.isFree ? item.quantity : Math.round(item.quantity * ipc);
        const amt = item.isFree ? 0 : Math.round((item.customPrice ?? item.product?.price ?? 0) * item.quantity);
        
        if (consolidated.has(pid)) {
          const ext = consolidated.get(pid);
          ext.btls += btls;
          ext.amt += amt;
        } else {
          consolidated.set(pid, {
            name: (item.product?.name || item.productName || 'Item').substring(0, 16),
            btls,
            amt,
            ipc
          });
        }
      });

      const itemRows = Array.from(consolidated.values()).map((item: any) => {
        const qtyText = formatQty(item.btls, item.ipc);
        const amtText = item.amt === 0 ? 'FREE' : item.amt;

        return `
        <tr>
          <td style="padding:0.5mm 0; word-break:break-word; font-weight:bold;">${item.name}</td>
          <td style="padding:0.5mm 0; text-align:center; white-space:nowrap; padding-left:1mm;">${qtyText}</td>
          <td style="padding:0.5mm 0; text-align:right; white-space:nowrap; font-weight:bold; padding-left:1mm;">${amtText}</td>
        </tr>`;
      }).join('');

      const pepsiLogoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAACXBIWXMAAAsTAAALEwEAmpwYAAAC8UlEQVR4nO2a2W3CQBBFzxUogpACEyVAVIAUmgITIEpA1EBUAKEAogSiBExv9uX4wxh7/Uv2k0bjL57H1lpnxlgsy7L8w1iWwZim+S2l3IloW0Rvxpi1iNbOub2I1iLajuO4+S84mCMAQwhrEX0655r1eh1TylsRnYnoUUrZ+b7P1R9B/KGUcyJaFkXR53leGGOenHMXEQ0i2lRVte/7/j3n3H36+oT71wDAyxgjURTd2ra9s3a3250ZY6Yp5W269mF8LwMAz4vFwj0AUErpiOhdluWH9D3M62i1WhUAwMvl8vH3Xde1AOBqmmYZY5zP0QEA3FqW5QAAyvO8W1/yEABA7DhuBwA0hmHcpmv+k1sAAEVR5AEAjWEYL+mam3LzGQDQarXKAABd172lO1zJTQ4AUJZlDgBomiYCAOR5/pS+w1RuHwEAjGEYeQAA27YfAAB93w8AgDzPMwEAJc/zHADA9/3u7Xb7nO/B1V3z3S0A0O12KwAATdMaAAAsy3oEAFiWdZ3vQdXfR9g4jmMAQDMMwwAA+L7fAABYlnWd70F1/0eI/X6/AABwHMcEAJim2QAAWJYV53tQNfcRYlVVPQAARVGMAABlWdYAAIwxzvfgau4jxLZtGwAARVH0AABlWdYAAIqiqPId/L9xHiGGYRgAAIqiGAMAsizrEQBQFEWd70HV3EeIRVFUAABVVTUAAFVVNQAARVHke1A19xFi13UNAEBVVQ8AQFVVDQBAURSZ70HV3EeIdV03AABVVU0AQFVVNQAARVHk+T+smnsLsf7+/v42Xf/T20d4R18fBfcdR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dH53/H8/n8V5+RkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZH5s3wBM72u1/v6GvUAAAAASUVORK5CYII=";

      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              @page { size: 48mm auto; margin: 0mm; }
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                width: 48mm;
                font-family: 'Courier New', Courier, monospace;
                font-size: 7.5pt;
                line-height: 1.2;
                color: #000;
                padding: 1mm 2mm;
              }
              .center { text-align: center; }
              .right { text-align: right; }
              .bold { font-weight: bold; }
              .lg { font-size: 9pt; }
              .sm { font-size: 6.5pt; }
              .divider { border-top: 1px dashed #000; margin: 1.5mm 0; }
              .solid { border-top: 1px solid #000; margin: 1.5mm 0; }
              .row { display: flex; justify-content: space-between; }
              .row .name { flex: 1; padding-right: 2mm; word-break: break-word; }
              .row .amt { white-space: nowrap; }
              .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 8.5pt; }
            </style>
          </head>
          <body>
            <div class="center">
              <img src="${pepsiLogoBase64}" alt="Pepsi" style="width:24mm; height:24mm; margin-bottom:2mm;" />
            </div>
            <p class="center bold lg">CS MARKETING</p>
            <p class="center sm">Karwar, Karnataka</p>
            <div class="divider"></div>
            <p class="center bold">INVOICE</p>
            <p class="center">Order #${orderId}</p>
            <p class="center">${dateStr}</p>
            <div class="divider"></div>
            <p>Shop: <b>${custName}</b></p>
            <div class="divider"></div>
            <p class="bold">Items:</p>
            <table style="width:100%; border-collapse:collapse; font-size:7.5pt;">
              ${itemRows}
            </table>
            <div class="solid"></div>
            <div class="total-row">
              <span>TOTAL</span>
              <span>Rs.${Math.round(orderData.totalAmount)}</span>
            </div>
            <div class="divider"></div>
            <p class="center sm">Thank You!</p>
            <p class="center sm">Visit Again</p>
            <br/><br/>
          </body>
        </html>
      `;
      await Print.printAsync({ html: htmlContent });
    } catch (error) { Alert.alert('Print Error', 'Could not generate receipt'); }
  };

  const handleDelete = async (order: any) => {
    if (Platform.OS === 'web') {
      setConfirmDelete(true);
      return;
    }

    const id = order._id || order.id;
    Alert.alert('Delete Order', 'Are you sure? This will return stock to your truck.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { 
          await deleteOrder.mutateAsync(id); 
          setSelectedOrder(null);
          Alert.alert('Deleted', 'Order has been cancelled.');
        } catch (e: any) { Alert.alert('Error', e.message); }
      }}
    ]);
  };

  const confirmDeleteAction = async () => {
    if (!selectedOrder) return;
    const id = selectedOrder._id || selectedOrder.id;
    try { 
      await deleteOrder.mutateAsync(id); 
      setConfirmDelete(false);
      setSelectedOrder(null);
      if (Platform.OS !== 'web') Alert.alert('Deleted', 'Order has been cancelled.');
    } catch (e: any) { 
      if (Platform.OS === 'web') alert('Error: ' + e.message);
      else Alert.alert('Error', e.message); 
    }
  };

  const handleEdit = (order: any) => {
    setSelectedOrder(null);
    navigation.navigate('Billing', { editOrder: order });
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  const filterFn = (o: any) => {
    const d = new Date(o.date);
    if (filter === 'today') return d >= today;
    if (filter === 'yesterday') return d >= yesterday && d < today;
    return true;
  };

  const orders = allOrders.filter(filterFn);
  const total = orders.reduce((s: number, o: any) => s + o.totalAmount, 0);

  const getPayColor = (pm: string) => {
    if (pm?.startsWith('Split')) return PAY_COLORS.Split;
    return PAY_COLORS[pm] || Colors.textMuted;
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['today', 'yesterday', 'all'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && { color: Colors.primary }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          <Text style={styles.summaryBold}>{orders.length}</Text> orders
        </Text>
        <Text style={styles.summaryTotal}>₹{total.toLocaleString()}</Text>
      </View>

      {isLoading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={orders}
          keyExtractor={i => i._id}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const color = getPayColor(item.paymentMode);
            return (
              <TouchableOpacity style={[styles.card, { borderLeftColor: color }]} onPress={() => setSelectedOrder(item)}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{item.customer?.name || 'Unknown'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.orderLabel}>#{item.orderNumber || 'N/A'}</Text>
                      <Text style={styles.time}>{new Date(item.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                  </View>
                  <View style={styles.amtBox}>
                    <Text style={styles.amt}>₹{item.totalAmount.toLocaleString()}</Text>
                    <View style={[styles.payBadge, { backgroundColor: color + '20' }]}>
                      <Text style={[styles.payText, { color }]}>{item.paymentMode?.startsWith('Split') ? 'Split' : item.paymentMode}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.itemsRow}>
                  {(item.items || []).slice(0, 3).map((it: any, idx: number) => {
                    const ipc = it.product?.itemsPerCase || 1;
                    const totalBtls = it.isFree ? it.quantity : Math.round(it.quantity * ipc);
                    const qtyStr = it.isFree ? `${it.quantity}btl` : formatQty(totalBtls, ipc);
                    return (
                      <View key={idx} style={styles.itemChip}>
                        <Text style={styles.itemChipText} numberOfLines={1}>
                          {it.isFree ? '🎁' : ''}{it.product?.name} ×{qtyStr}
                        </Text>
                      </View>
                    );
                  })}
                  {(item.items || []).length > 3 && (
                    <View style={styles.itemChip}><Text style={styles.itemChipText}>+{item.items.length - 3}</Text></View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No orders for {filter}</Text>
            </View>
          }
        />
      )}

      {/* Order Detail Modal */}
      <Modal visible={!!selectedOrder} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Order Details #{selectedOrder?.orderNumber || 'N/A'}</Text>
                <Text style={styles.modalSub}>{selectedOrder?.customer?.name || 'Walk-in'}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="close-circle" size={32} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400, width: '100%' }}>
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date/Time</Text>
                  <Text style={styles.detailVal}>{selectedOrder && new Date(selectedOrder.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Mode</Text>
                  <Text style={[styles.detailVal, { color: getPayColor(selectedOrder?.paymentMode) }]}>{selectedOrder?.paymentMode}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Amount</Text>
                  <Text style={[styles.detailVal, { fontWeight: '900', fontSize: 18, color: Colors.primary }]}>₹{selectedOrder?.totalAmount.toLocaleString()}</Text>
                </View>
              </View>

              <Text style={styles.sectionHeader}>Items</Text>
              {(() => {
                const cons = new Map();
                (selectedOrder?.items || []).forEach((it: any) => {
                  const pid = String(it.product?._id || it.productId?._id || it.productId || it.product?.id || Math.random());
                  const ipc = it.product?.itemsPerCase || 1;
                  const btls = it.isFree ? it.quantity : Math.round(it.quantity * ipc);
                  const amt = it.isFree ? 0 : Math.round((it.customPrice ?? it.product?.price ?? 0) * it.quantity);
                  if (cons.has(pid)) {
                    cons.get(pid).btls += btls;
                    cons.get(pid).amt += amt;
                  } else {
                    cons.set(pid, { name: it.product?.name || it.productName, btls, amt, ipc });
                  }
                });
                return Array.from(cons.values()).map((it: any, idx: number) => (
                  <View key={idx} style={styles.itemDetail}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{it.name}</Text>
                      <Text style={styles.itemQty}>{formatQty(it.btls, it.ipc)}</Text>
                    </View>
                    <Text style={styles.itemPrice}>
                      {it.amt === 0 ? 'FREE' : `₹${it.amt}`}
                    </Text>
                  </View>
                ));
              })()}
            </ScrollView>

            <View style={styles.actionGrid}>
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#F1F5F9'}]} onPress={() => printReceipt(selectedOrder)}>
                <Ionicons name="print" size={20} color="#475569" />
                <Text style={[styles.actionBtnText, {color: '#475569'}]}>Print Bill</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: Colors.primaryBg}]} onPress={() => handleEdit(selectedOrder)}>
                <Ionicons name="create" size={20} color={Colors.primary} />
                <Text style={[styles.actionBtnText, {color: Colors.primary}]}>Edit Order</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#FEF2F2'}]} onPress={() => handleDelete(selectedOrder)}>
                <Ionicons name="trash" size={20} color={Colors.danger} />
                <Text style={[styles.actionBtnText, {color: Colors.danger}]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Web Delete Confirmation */}
      <Modal visible={confirmDelete} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={[styles.bottomSheet, { alignSelf: 'center', width: '90%', marginBottom: 'auto', marginTop: 'auto' }]}>
            <Text style={styles.modalTitle}>Delete Order</Text>
            <Text style={{ marginTop: 10, marginBottom: 24, fontSize: 16, color: '#334155' }}>
              Are you sure you want to delete this order? This will return all items to your truck stock.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmDelete(false)}>
                <Text style={styles.cancelText}>No, Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmBtn, { backgroundColor: Colors.danger, flex: 1, height: 46, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' }]} 
                onPress={confirmDeleteAction}
              >
                {deleteOrder.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Yes, Delete</Text>}
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
  filterRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  filterBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterBtnActive: { borderBottomColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, fontWeight: '600', color: '#64748B' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  summaryText: { fontSize: FontSize.sm, color: '#64748B' },
  summaryBold: { fontWeight: '800', color: '#1E293B' },
  summaryTotal: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.primary },
  card: { backgroundColor: '#fff', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 3, ...Shadows.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  customerName: { fontSize: FontSize.lg, fontWeight: '700', color: '#1E293B' },
  orderLabel: { fontSize: FontSize.sm, fontWeight: '900', color: Colors.primary, backgroundColor: Colors.primaryBg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  time: { fontSize: FontSize.sm, color: '#64748B' },
  amtBox: { alignItems: 'flex-end' },
  amt: { fontSize: FontSize.xl, fontWeight: '800', color: '#1E293B' },
  payBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  payText: { fontSize: FontSize.xs, fontWeight: '700' },
  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  itemChip: { backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  itemChipText: { fontSize: 10, color: '#475569', fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 60, opacity: 0.5 },
  emptyText: { color: '#64748B', marginTop: 12, fontSize: FontSize.md },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, alignItems: 'center', maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '900', color: '#1E293B' },
  modalSub: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '600' },
  detailCard: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  detailVal: { fontSize: 13, color: '#1E293B', fontWeight: '700' },
  sectionHeader: { width: '100%', fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemDetail: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', width: '100%' },
  itemName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  itemQty: { fontSize: 12, color: '#64748B', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  actionGrid: { flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' },
  actionBtn: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4 },
  actionBtnText: { fontSize: 12, fontWeight: '800' },
});
