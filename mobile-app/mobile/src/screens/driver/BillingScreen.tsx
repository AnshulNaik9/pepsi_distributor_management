import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ScrollView, Alert, Modal, KeyboardAvoidingView, Platform, Dimensions, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCustomers, useCreateCustomer, useProducts, useOffers, useGodownStock, useTruckStock, useCheckout, useRoutes, useUpdateOrder } from '../../hooks/useApi';
import { getDriverTruckId, getDriverRouteId } from '../../lib/auth';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../theme/tokens';
import * as Print from 'expo-print';

function formatStock(casesAvailable: number, itemsPerCase: number): string {
  const ipc = itemsPerCase || 1;
  const totalBottles = Math.round(casesAvailable * ipc);
  const cases = Math.floor(totalBottles / ipc);
  const rem = totalBottles % ipc;
  
  if (cases > 0 && rem > 0) return `${cases}cs ${rem}btl`;
  if (cases > 0) return `${cases}cs`;
  if (rem > 0) return `${rem}btl`;
  return '0';
}

export default function BillingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editOrderData = route.params?.editOrder;
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const topTabsRef = useRef<FlatList>(null);
  const [truckId, setTruckId] = useState<string | null>(null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [splitAmounts, setSplitAmounts] = useState({ cash: 0, upi: 0, credit: 0 });
  const [customerModal, setCustomerModal] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [shopPhone, setShopPhone] = useState('');
  const [showAddCustomerDetails, setShowAddCustomerDetails] = useState(false);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartPrices, setCartPrices] = useState<Record<string, number>>({});
  const [cartCustomFree, setCartCustomFree] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<string>('2_25_ltr');
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isPrinterSearching, setIsPrinterSearching] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<any>(null);
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);

  const { data: allCustomers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const { data: offers = [] } = useOffers();
  const { data: truckStock = [] } = useTruckStock(truckId || undefined);
  const { data: godownStock = [] } = useGodownStock();
  const { data: routes = [] } = useRoutes();
  const createCustomer = useCreateCustomer();
  const checkout = useCheckout();
  const updateOrder = useUpdateOrder();

  // Load edit order data if present
  useEffect(() => {
    if (editOrderData) {
      // 1. Set Customer
      const custId = editOrderData.customerId?._id || editOrderData.customerId?.id || editOrderData.customerId;
      const customerObj = allCustomers.find((c: any) => (c._id || c.id) === custId) || editOrderData.customer || editOrderData.customerId;
      setSelectedCustomer(customerObj);

      // 2. Set Payment Mode
      if (editOrderData.paymentMode?.startsWith('Split')) {
        setPaymentMode('Split');
        // Extract split amounts if possible (regex or parse)
        const cashMatch = editOrderData.paymentMode.match(/Cash:\s*(\d+)/);
        const upiMatch = editOrderData.paymentMode.match(/UPI:\s*(\d+)/);
        const creditMatch = editOrderData.paymentMode.match(/Credit:\s*(\d+)/);
        setSplitAmounts({
          cash: cashMatch ? parseInt(cashMatch[1], 10) : 0,
          upi: upiMatch ? parseInt(upiMatch[1], 10) : 0,
          credit: creditMatch ? parseInt(creditMatch[1], 10) : 0,
        });
      } else {
        setPaymentMode(editOrderData.paymentMode);
      }

      // 3. Set Cart
      const newCart: Record<string, number> = {};
      const newPrices: Record<string, number> = {};
      const newFree: Record<string, number> = {};

      (editOrderData.items || []).forEach((it: any) => {
        const pid = String(it.productId?._id || it.productId?.id || it.productId);
        const prod = products.find((p: any) => (p._id || p.id) === pid);
        const ipc = prod?.itemsPerCase || it.product?.itemsPerCase || 1;

        if (it.isFree) {
          // Free items are stored in bottles in backend usually, or special if custom
          newFree[pid] = (newFree[pid] || 0) + it.quantity;
        } else {
          newCart[pid] = (newCart[pid] || 0) + (it.quantity * ipc);
          if (it.customPrice) newPrices[pid] = it.customPrice;
        }
      });

      setCart(newCart);
      setCartPrices(newPrices);
      setCartCustomFree(newFree);
      setEditingOrderId(editOrderData._id || editOrderData.id);
      
      // Clear params so it doesn't re-trigger
      navigation.setParams({ editOrder: null });
    }
  }, [editOrderData, allCustomers, products, navigation]);

  useEffect(() => {
    getDriverTruckId().then(setTruckId);
    getDriverRouteId().then(setRouteId);
  }, []);

  const customers = allCustomers.filter((c: any) => String(c.routeId) === String(routeId) || !routeId);
  const filteredCustomers = customers.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleQty = (productId: string | number, delta: number, max: number) => {
    const sId = String(productId);
    setCart(prev => {
      const current = prev[sId] || 0;
      const next = Math.max(0, Math.min(max, current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[sId];
        setCartPrices(cp => {
          const cpCopy = { ...cp };
          delete cpCopy[sId];
          return cpCopy;
        });
        return copy;
      }
      return { ...prev, [sId]: next };
    });
  };

  const isExcludedFromDefaultFree = (productName: string) => {
    const name = productName.toLowerCase();
    return (
      (name.includes("soda") && name.includes("2.25")) ||
      (name.includes("pepsi") && name.includes("1") && (name.includes("ltr") || name.includes("ltr.") || name.includes("1l"))) ||
      (name.includes("lehar") && name.includes("soda") && name.includes("750"))
    );
  };

  const isPromoEligible = (product: any) => {
    const nameMatch = (product?.name || "").toLowerCase();
    const isPromoSize = nameMatch.includes("2.25") || nameMatch.includes("750") || product?.category === "2_25_ltr" || product?.category === "750_ml";
    if (!isPromoSize) return false;
    if (isExcludedFromDefaultFree(nameMatch)) return false;
    return true;
  };

  const computeFreeItems = () => {
    const freeItems: Record<string, number> = {};
    const fallbackAquafinaId = products.find((p: any) => p.name.toLowerCase().includes("aquafina 1l") || p.name.toLowerCase().includes("aquafina"))?.id || '';

    let totalPromoCases = 0;

    Object.entries(cart).forEach(([id, qtyBtls]) => {
      const p = products.find((prod: any) => String(prod.id) === id);
      const itemsPerCase = p?.itemsPerCase || 1;
      const cases = qtyBtls / itemsPerCase;

      let pFree = 0;
      let freeProductId = fallbackAquafinaId;

      offers.forEach((offer: any) => {
        if (String(offer.buyProductId) === id && cases >= offer.buyQuantity) {
          const offerMultiplier = Math.floor(cases / offer.buyQuantity);
          const quantityFromOffer = offerMultiplier * offer.freeQuantity;
          if (quantityFromOffer > pFree) {
            pFree = quantityFromOffer;
          }
          freeProductId = offer.freeProductId || freeProductId;
        }
      });

      const customFree = cartCustomFree[id];

      if (customFree && customFree > 0 && freeProductId) {
        freeItems[String(freeProductId)] = (freeItems[String(freeProductId)] || 0) + customFree;
      }

      if (pFree > 0 && freeProductId) {
         freeItems[String(freeProductId)] = (freeItems[String(freeProductId)] || 0) + pFree;
      } else if (isPromoEligible(p)) {
         totalPromoCases += cases;
      }
    });

    const globalPromoFreeBottles = Math.floor(totalPromoCases) * 2;
    if (globalPromoFreeBottles > 0 && fallbackAquafinaId) {
      freeItems[String(fallbackAquafinaId)] = (freeItems[String(fallbackAquafinaId)] || 0) + globalPromoFreeBottles;
    }

    return freeItems;
  };

  const calculateTotal = () => {
    let sum = Object.entries(cart).reduce((s, [id, qtyBtls]) => {
      const p = products.find((prod:any) => String(prod.id) === id);
      const itemsPerCase = p?.itemsPerCase || 1;
      const cases = qtyBtls / itemsPerCase;
      const price = cartPrices[id] !== undefined ? cartPrices[id] : (p?.price || 0);
      return s + (price * cases);
    }, 0);

    if (selectedCustomer?.hasSpecialDiscount && sum > 0) {
      sum = Math.max(0, sum - 20);
    }
    return Math.round(sum);
  };
  
  const total = calculateTotal();
  const cartItemCount = Object.keys(cart).length;
  const freeItemsMap = computeFreeItems();
  const totalFree = Object.values(freeItemsMap).reduce((a, b) => a + b, 0);

  const scanForPrinters = async () => {
    setIsPrinterSearching(true);
    setTimeout(() => {
      setAvailablePrinters([
        { id: '00:11:22:33:44:55', name: 'Thermal Printer (2 Inch)', type: 'Bluetooth' }
      ]);
      setIsPrinterSearching(false);
    }, 1500);
  };

  const connectToPrinter = (printer: any) => {
    setConnectedPrinter(printer);
    Alert.alert('Success', `Connected to ${printer.name}`);
  };

  const printReceipt = async (orderData: any) => {
    try {
      const dateStr = new Date(orderData.date || Date.now()).toLocaleDateString();
      const custName = orderData.customer?.name || 'Walk-in Shop';
      const orderId = orderData.orderNumber || orderData.id || 'N/A';
      
      const itemRows = orderData.items?.map((item: any) => {
        const qtyText = item.isFree
          ? `${item.quantity}btls`
          : `${item.quantity}cs`;
        
        const name = item.product?.name || 'Item';
        const unitPrice = item.customPrice !== undefined ? item.customPrice : (item.product?.price || 0);
        const amtText = item.isFree ? 'FREE' : `₹${Math.round(unitPrice * item.quantity)}`;

        return `
          <tr>
            <td style="padding: 2px 0;">${name} x ${qtyText}</td>
            <td style="text-align:right; padding: 2px 0;">${amtText}</td>
          </tr>
        `;
      }).join('');

      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              @page { size: 50.8mm auto; margin: 0; }
              body { 
                margin: 0; padding: 2mm; width: 46.8mm;
                font-family: 'Courier New', Courier, monospace; color: #000;
              }
              .receipt { font-size: 10px; line-height: 1.1; }
              .center { text-align: center; }
              .bold { font-weight: 700; }
              .line { border-top: 1px dashed #ccc; margin: 4px 0; }
              table { width: 100%; border-collapse: collapse; }
              .total-row { border-top: 1px dashed #ccc; margin-top: 3px; padding-top: 3px; display: flex; justify-content: space-between; font-weight: 700; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="center bold" style="font-size:12px;">CS MARKETING</div>
              <div class="line"></div>
              <div class="center bold">INVOICE</div>
              <div class="center">Order #${orderId}</div>
              <div class="center">${dateStr}</div>
              <div class="line"></div>
              <div>Shop Name - ${custName}</div>
              <div class="line"></div>
              <div class="bold">Items</div>
              <table style="width:100%">${itemRows}</table>
              <div class="line"></div>
              <div class="total-row">
                <span>Total</span>
                <span>₹${orderData.totalAmount}</span>
              </div>
            </div>
          </body>
        </html>
      `;

      await Print.printAsync({ html: htmlContent });
      setShowPrintPreview(false);
    } catch (error) {
      console.log("Print error", error);
    }
  };

  const handleCheckout = async () => {
    if (!selectedCustomer) return Alert.alert('Validation Error', 'Please select or create a shop first');
    if (Object.keys(cart).length === 0) return Alert.alert('Validation Error', 'Your cart is empty');
    if (!truckId) return Alert.alert('System Error', 'No active truck found. Please re-login.');

    if (selectedCustomer.id === 'NEW' && !selectedCustomer.name?.trim()) {
      return Alert.alert('Validation Error', 'Please enter a shop name');
    }

    if (paymentMode === "Split") {
      const splitTotal = Math.round(splitAmounts.cash + splitAmounts.upi + splitAmounts.credit);
      const diff = Math.round(total - splitTotal);
      if (diff !== 0) {
        return Alert.alert(
          'Payment Error', 
          `Split amounts do not match total! \n\nTotal: ₹${Math.round(total)}\nSplit: ₹${splitTotal}\nDifference: ₹${diff}`
        );
      }
    }

    const freeItemsMap = computeFreeItems();
    
    const items = Object.entries(cart).map(([id, qtyBtls]) => {
      const p = products.find((prod:any) => String(prod.id) === id);
      const itemsPerCase = p?.itemsPerCase || 1;
      const cases = parseFloat((qtyBtls / itemsPerCase).toFixed(4));
      return {
        productId: String(id),
        quantity: cases,
        customPrice: cartPrices[id] !== undefined ? Number(cartPrices[id]) : undefined,
        customFreeQty: cartCustomFree[id] !== undefined ? Number(cartCustomFree[id]) : undefined,
      };
    });

    try {
      let finalCustomerId = selectedCustomer.id;
      if (finalCustomerId === 'NEW') {
         const routeName = routes.find((r: any) => String(r.id) === String(routeId))?.name || 'Walk-in Shop';
         const fallbackRoute = routes.find((r: any) => r.name.toLowerCase().includes('unassigned')) || routes[0];
         const newCust = await createCustomer.mutateAsync({
           name: selectedCustomer.name,
           phone: selectedCustomer.phone,
           address: routeName,
           routeId: routeId ? String(routeId) : (fallbackRoute ? fallbackRoute.id : ""),
           creditBalance: 0
         });
         finalCustomerId = newCust.id;
      }

      let result;
      if (editingOrderId) {
        result = await updateOrder.mutateAsync({
          id: editingOrderId,
          data: {
            customerId: String(finalCustomerId),
            truckId: String(truckId),
            paymentMode,
            splitAmounts: paymentMode === 'Split' ? splitAmounts : undefined,
            items,
          }
        });
      } else {
        result = await checkout.mutateAsync({
          customerId: String(finalCustomerId),
          truckId: String(truckId),
          paymentMode,
          splitAmounts: paymentMode === 'Split' ? splitAmounts : undefined,
          items,
        });
      }

      setCart({});
      setCartPrices({});
      setCartCustomFree({});
      setSelectedCustomer(null);
      setEditingOrderId(null);
      setCheckoutModal(false);
      
      setCompletedOrder(result);
      setShowPrintPreview(true);
    } catch (e: any) {
      console.log("[CHECKOUT ERROR]", e);
      let errorMsg = e.message || 'An unexpected error occurred';
      
      if (errorMsg.includes('{')) {
        try {
          const jsonPart = errorMsg.substring(errorMsg.indexOf('{'));
          const parsed = JSON.parse(jsonPart);
          errorMsg = parsed.message || parsed.error || errorMsg;
        } catch(err) {}
      }

      Alert.alert('Order Failed', errorMsg);
    }
  };

  const catGroups = [
    { label: '2.25L PET', cat: '2_25_ltr' },
    { label: '1L PET', cat: '1_ltr' },
    { label: '750ml PET', cat: '750_ml' },
    { label: '400ml PET', cat: '400_ml' },
    { label: 'Others', cat: 'others' },
  ];

  const { width: SCREEN_WIDTH } = useWindowDimensions();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.customerBar} onPress={() => setCustomerModal(true)}>
        <Ionicons name="storefront" size={24} color={Colors.primary} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          {selectedCustomer ? (
            <>
              <Text style={styles.customerName}>{selectedCustomer.name}</Text>
              <Text style={styles.customerPhone}>{selectedCustomer.phone || 'No phone'}</Text>
            </>
          ) : (
            <Text style={styles.customerPlaceholder}>Select Shop / Customer</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </TouchableOpacity>
      
      {editingOrderId && (
        <View style={styles.editBanner}>
          <Ionicons name="create" size={16} color="#854D0E" />
          <Text style={styles.editBannerText}>EDITING ORDER #{editingOrderId.slice(-6).toUpperCase()}</Text>
          <TouchableOpacity onPress={() => {
            setCart({});
            setCartPrices({});
            setCartCustomFree({});
            setSelectedCustomer(null);
            setEditingOrderId(null);
          }}>
            <Text style={styles.editCancelText}>CANCEL EDIT</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.catScroll}>
        <FlatList
          ref={topTabsRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={catGroups}
          keyExtractor={i => i.cat}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 10 }}
          renderItem={({ item: group, index }) => (
            <TouchableOpacity 
              style={[styles.catTab, selectedCategory === group.cat && styles.catTabActive]}
              onPress={() => {
                setSelectedCategory(group.cat);
                try {
                  scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
                } catch(e) {}
              }}
            >
              <Text style={[styles.catTabText, selectedCategory === group.cat && styles.catTabTextActive]}>{group.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const pageIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            if (catGroups[pageIndex]) {
              setSelectedCategory(catGroups[pageIndex].cat);
            }
          }}
        >
          {catGroups.map((group, gIdx) => (
            <View key={group.cat} style={{ width: SCREEN_WIDTH, flex: 1 }}>
              <FlatList
                data={products.filter((p: any) => p.category === group.cat)}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 180, flexGrow: 1 }}
                renderItem={({ item: product }) => {
                  let truckQty = truckStock.find((s: any) => (s.product?.id || s.productId) === product.id)?.casesAvailable || 0;
                  let godownQty = godownStock.find((g: any) => (g.product?.id || g.productId) === product.id)?.casesAvailable || 0;
                  let totalQtyCases = truckQty + godownQty;

                  const sId = String(product.id);
                  const qtyBtls = cart[sId] || 0;
                  const itemsPerCase = product.itemsPerCase || 1;
                  const cases = qtyBtls / itemsPerCase;
                  
                  let autocalcFree = 0;
                  offers.forEach((o: any) => {
                    if (o.buyProductId === product.id && cases >= o.buyQuantity) {
                      autocalcFree = Math.floor(cases / o.buyQuantity) * o.freeQuantity;
                    }
                  });
                  if (autocalcFree === 0 && isPromoEligible(product)) {
                    autocalcFree = Math.floor(cases) * 2;
                  }
                  const totalItemFree = autocalcFree + (cartCustomFree[sId] || 0);

                  return (
                    <View key={product.id} style={[styles.productCard, qtyBtls > 0 && styles.productCardActive]}>
                      <Image 
                        source={{ uri: product.imageUrl || 'https://via.placeholder.com/80' }} 
                        style={styles.productImage} 
                        resizeMode="contain"
                      />
                      <View style={styles.productLeft}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>₹</Text>
                          <TextInput
                              style={styles.priceInput}
                              value={String(cartPrices[sId] !== undefined ? cartPrices[sId] : product.price)}
                              onChangeText={(v) => {
                                const n = parseInt(v);
                                if (!isNaN(n)) setCartPrices(prev => ({ ...prev, [sId]: n }));
                                else if (v === '') setCartPrices(prev => ({ ...prev, [sId]: 0 }));
                              }}
                              keyboardType="numeric"
                              underlineColorAndroid="transparent"
                            />
                          <Text style={styles.priceUnit}>/ case</Text>
                        </View>

                        <View style={styles.stockStatusContainer}>
                          <View style={styles.stockStatusMini}>
                            <Ionicons name="business" size={10} color="#64748B" />
                            <Text style={styles.stockStatusLabel}>W:</Text>
                            <Text style={styles.stockStatusVal}>{formatStock(godownQty, itemsPerCase)}</Text>
                          </View>
                          <View style={[styles.stockStatusMini, { backgroundColor: Colors.primary + '10' }]}>
                            <Ionicons name="bus" size={10} color={Colors.primary} />
                            <Text style={[styles.stockStatusLabel, { color: Colors.primary }]}>T:</Text>
                            <Text style={[styles.stockStatusVal, { color: Colors.primary }]}>{formatStock(truckQty, itemsPerCase)}</Text>
                          </View>
                        </View>

                        {(((product.name.toLowerCase().includes('aquafina 1l') && product.price > 0) || qtyBtls > 0 || (cartCustomFree[sId] || 0) > 0) && (totalItemFree > 0 || (product.name.toLowerCase().includes('aquafina 1l') && product.price > 0))) && (
                          <View style={styles.freeOverlay}>
                            <View style={styles.freeLabelBadge}>
                              <Ionicons name="flash" size={12} color="#2563EB" />
                              <Text style={styles.freeLabelText}>{totalItemFree} Free</Text>
                            </View>
                            <View style={styles.freeControls}>
                              <TouchableOpacity style={styles.freeBtn} onPress={() => {
                                const cur = cartCustomFree[sId] || 0;
                                setCartCustomFree(prev => ({...prev, [sId]: Math.max(0, cur - 1)}));
                              }}><Ionicons name="remove" size={14} color="#2563EB"/></TouchableOpacity>
                              <Text style={styles.freeVal}>{totalItemFree}</Text>
                              <TouchableOpacity style={styles.freeBtn} onPress={() => {
                                const cur = cartCustomFree[sId] || 0;
                                setCartCustomFree(prev => ({...prev, [sId]: cur + 1}));
                              }}><Ionicons name="add" size={14} color="#2563EB"/></TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>

                      <View style={styles.productRight}>
                        <View style={styles.stepperContainer}>
                          <Text style={styles.stepperLabel}>CS</Text>
                          <TouchableOpacity style={styles.stepperBtn} onPress={() => handleQty(product.id, -itemsPerCase, totalQtyCases * itemsPerCase)}><Ionicons name="remove-outline" size={16} color="#1E293B"/></TouchableOpacity>
                          <Text style={styles.stepperVal}>{Math.floor(qtyBtls / itemsPerCase)}</Text>
                          <TouchableOpacity style={[styles.stepperBtn, { backgroundColor: Colors.primary, borderColor: Colors.primary }]} onPress={() => handleQty(product.id, itemsPerCase, totalQtyCases * itemsPerCase)}><Ionicons name="add-outline" size={16} color="#fff"/></TouchableOpacity>
                        </View>

                        <View style={[styles.stepperContainer, { marginTop: 6 }]}>
                          <Text style={styles.stepperLabel}>BTL</Text>
                          <TouchableOpacity style={styles.stepperBtn} onPress={() => handleQty(product.id, -1, totalQtyCases * itemsPerCase)}><Ionicons name="remove-outline" size={16} color="#1E293B"/></TouchableOpacity>
                          <Text style={styles.stepperVal}>{Math.round(qtyBtls % itemsPerCase)}</Text>
                          <TouchableOpacity style={[styles.stepperBtn, { backgroundColor: Colors.primary, borderColor: Colors.primary }]} onPress={() => handleQty(product.id, 1, totalQtyCases * itemsPerCase)}><Ionicons name="add-outline" size={16} color="#fff"/></TouchableOpacity>
                        </View>

                        {qtyBtls > 0 && (
                          <Text style={styles.itemTotal}>
                            T: ₹{Math.round((cartPrices[sId] !== undefined ? cartPrices[sId] : product.price) * cases)}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={() => (
                  <Text style={{ textAlign: 'center', marginTop: 40, color: Colors.textMuted }}>No products found in this category.</Text>
                )}
              />
            </View>
          ))}
        </ScrollView>
      </View>

      {cartItemCount > 0 && (
        <View style={styles.cartBarContainer}>
          <TouchableOpacity style={styles.checkoutBarBtn} onPress={() => setCheckoutModal(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.cartCountBadge}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{cartItemCount} ITEMS</Text>
              </View>
              {totalFree > 0 && (
                <View style={[styles.cartCountBadge, { backgroundColor: '#FDE047' }]}>
                  <Ionicons name="flash" size={10} color="#854D0E" />
                  <Text style={{ color: '#854D0E', fontWeight: '800', fontSize: 10 }}>{totalFree} FREE</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 14 }}>CHECKOUT</Text>
              <View style={{ backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                <Text style={{ color: Colors.primary, fontWeight: '900', fontSize: 15 }}>₹{total.toLocaleString()}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={customerModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <View style={styles.bottomSheet}>
            <Text style={styles.modalTitle}>{showAddCustomerDetails ? 'Add New Shop Details' : 'Select Customer / Shop'}</Text>
            {!showAddCustomerDetails ? (
              <>
                <TextInput style={styles.modalSearch} placeholder="Search shops..." placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} autoFocus />
                <FlatList
                  data={filteredCustomers}
                  keyExtractor={i => String(i.id)}
                  style={{ maxHeight: 400 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.customerOption} onPress={() => { setSelectedCustomer(item); setCustomerModal(false); setSearch(''); }}>
                      <View style={styles.custAvatar}><Text style={styles.custAvatarText}>{item.name[0]}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.custName}>{item.name}</Text>
                        <Text style={styles.custPhone}>{item.phone}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListFooterComponent={() => {
                    const exactMatch = filteredCustomers.find(c => c.name.toLowerCase() === search.trim().toLowerCase());
                    if (search.trim() && !exactMatch) {
                      return (
                        <TouchableOpacity 
                          style={[styles.customerOption, { borderBottomWidth: 0, marginTop: 10, backgroundColor: '#ECFDF5', borderRadius: 12, paddingHorizontal: 16 }]}
                          onPress={() => setShowAddCustomerDetails(true)}
                        >
                          <Ionicons name="add-circle" size={24} color="#059669" style={{ marginRight: 12 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.custName, { color: '#065F46' }]}>Create Shop "{search.trim()}"</Text>
                            <Text style={[styles.custPhone, { color: '#059669' }]}>Tap to add phone number</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    }
                    return null;
                  }}
                  ListEmptyComponent={!search.trim() ? <Text style={styles.noResults}>No shops found on this route</Text> : null}
                />
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCustomerModal(false)}>
                  <Text style={styles.cancelText}>Close</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ maxHeight: 400 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: 10 }}>Shop Name</Text>
                <TextInput 
                  style={[styles.modalSearch, { marginBottom: 16 }]} 
                  value={search} 
                  onChangeText={setSearch}
                />
                <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 }}>Mobile Number (Optional)</Text>
                <TextInput 
                  style={[styles.modalSearch, { marginBottom: 24 }]} 
                  placeholder="Enter phone number" 
                  placeholderTextColor={Colors.textMuted} 
                  value={shopPhone} 
                  onChangeText={setShopPhone} 
                  keyboardType="phone-pad" 
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[styles.cancelBtn, { flex: 1, marginTop: 0 }]} onPress={() => setShowAddCustomerDetails(false)}>
                    <Text style={styles.cancelText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.confirmBtn, { flex: 1, marginTop: 0 }]} onPress={() => {
                    setSelectedCustomer({ id: 'NEW', name: search.trim(), phone: shopPhone.trim() });
                    setCustomerModal(false);
                    setShowAddCustomerDetails(false);
                    setSearch('');
                    setShopPhone('');
                  }}>
                    <Text style={styles.confirmText}>Set Shop</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={checkoutModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Checkout Summary</Text>
                <Text style={[styles.customerSub, !selectedCustomer && { color: Colors.danger, fontWeight: '700' }]}>
                  {selectedCustomer?.name || "please enter shop details"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCheckoutModal(false)}>
                <Ionicons name="close-circle" size={32} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300, marginVertical: Spacing.md }}>
              {Object.entries(cart).map(([id, qtyBtls]) => {
                const p = products.find((prod: any) => String(prod.id) === id);
                const itemsPerCase = p?.itemsPerCase || 1;
                const cases = qtyBtls / itemsPerCase;
                const price = cartPrices[id] !== undefined ? cartPrices[id] : (p?.price || 0);

                return (
                  <View key={id} style={styles.cartItem}>
                    <Text style={styles.cartItemName} numberOfLines={1}>{cases.toFixed(2)} {p?.name}</Text>
                    <Text style={styles.cartItemAmt}>₹{Math.round(price * cases)}</Text>
                  </View>
                );
              })}
              
              {Object.entries(freeItemsMap).map(([id, qty]) => {
                const p = products.find((prod: any) => String(prod.id) === id);
                if (qty <= 0) return null;
                return (
                  <View key={`free-${id}`} style={[styles.cartItem, { backgroundColor: '#ECFDF5', paddingHorizontal: 4 }]}>
                    <Text style={[styles.cartItemName, { color: '#059669' }]} numberOfLines={1}>{qty} BTL {p?.name} (Free)</Text>
                    <Text style={[styles.cartItemAmt, { color: '#059669' }]}>₹0</Text>
                  </View>
                );
              })}
            </ScrollView>

            {selectedCustomer?.hasSpecialDiscount && (
              <View style={styles.discountRow}>
                <Text style={styles.discountLabel}>⭐️ Special Discount</Text>
                <Text style={styles.discountAmt}>-₹20</Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmt}>₹{total.toLocaleString()}</Text>
            </View>

            <Text style={styles.payLabel}>Payment Mode</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.lg }}>
                {['Cash', 'UPI', 'Credit', 'Split'].map(pm => (
                  <TouchableOpacity key={pm} style={[styles.payChip, paymentMode === pm && styles.payChipActive]} onPress={() => { setPaymentMode(pm); if(pm === 'Split') setSplitAmounts({cash: total, upi: 0, credit: 0}) }}>
                    <Text style={[styles.payChipText, paymentMode === pm && { color: Colors.primary }]}>{pm}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {paymentMode === 'Split' && (
              <View style={{ marginBottom: Spacing.md }}>
                <View style={[styles.remainingBadge, Math.round(total - (splitAmounts.cash + splitAmounts.upi + splitAmounts.credit)) !== 0 && { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                  <Text style={[styles.remainingText, Math.round(total - (splitAmounts.cash + splitAmounts.upi + splitAmounts.credit)) !== 0 && { color: '#EF4444' }]}>
                    {Math.round(total - (splitAmounts.cash + splitAmounts.upi + splitAmounts.credit)) === 0 
                      ? '✅ Payment Balanced' 
                      : `Remaining: ₹${Math.round(total - (splitAmounts.cash + splitAmounts.upi + splitAmounts.credit))}`}
                  </Text>
                </View>
                {['cash', 'upi', 'credit'].map(k => (
                  <View key={k} style={styles.splitRow}>
                    <Text style={styles.splitLabel}>{k.charAt(0).toUpperCase() + k.slice(1)}</Text>
                    <TextInput
                      style={styles.splitInput}
                      placeholder="0"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      value={String((splitAmounts as any)[k] || '')}
                      onChangeText={t => setSplitAmounts(p => ({ ...p, [k]: Number(t) || 0 }))}
                    />
                  </View>
                ))}
              </View>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCheckoutModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCheckout}>
                {checkout.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Place Order</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
  
      <Modal visible={showPrintPreview} animationType="fade" transparent>
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Receipt Preview</Text>
              <TouchableOpacity onPress={() => setShowPrintPreview(false)}>
                <Ionicons name="close" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <View style={styles.receiptBoundary}>
              {connectedPrinter && (
                <View style={styles.printerStatusBadge}>
                  <Ionicons name="bluetooth" size={12} color="#fff" />
                  <Text style={styles.printerStatusText}>Direct Print Enabled: {connectedPrinter.name}</Text>
                </View>
              )}
              <View style={styles.receiptContentFixed}>
                <Text style={[styles.receiptText, styles.receiptCenter, styles.receiptBold, {fontSize: 16}]}>CS MARKETING</Text>
                <View style={styles.receiptDashedLine} />
                <Text style={[styles.receiptText, styles.receiptCenter, styles.receiptBold]}>INVOICE</Text>
                <Text style={[styles.receiptText, styles.receiptCenter]}>Order #{completedOrder?.orderNumber || completedOrder?._id || completedOrder?.id || 'N/A'}</Text>
                <Text style={[styles.receiptText, styles.receiptCenter]}>{new Date(completedOrder?.date || Date.now()).toLocaleDateString()}</Text>
                <View style={styles.receiptDashedLine} />
                <Text style={styles.receiptText}>Shop Name - {completedOrder?.customer?.name || 'Walk-in Shop'}</Text>
                <View style={styles.receiptDashedLine} />
                <Text style={[styles.receiptText, styles.receiptBold]}>Items</Text>
                
                {completedOrder?.items?.map((item: any, idx: number) => (
                  <View key={idx} style={styles.receiptItemRow}>
                    <Text style={[styles.receiptText, {flex: 1}]}>{item.product?.name} x {item.isFree ? `${item.quantity}btls` : `${item.quantity}cs`}</Text>
                    <Text style={[styles.receiptText, {textAlign: 'right'}]}>{item.isFree ? 'FREE' : `₹${Math.round((item.customPrice || item.product?.price || 0) * item.quantity)}`}</Text>
                  </View>
                ))}

                <View style={styles.receiptDashedLine} />
                <View style={styles.receiptItemRow}>
                  <Text style={[styles.receiptText, styles.receiptBold]}>Total</Text>
                  <Text style={[styles.receiptText, styles.receiptBold]}>₹{completedOrder?.totalAmount}</Text>
                </View>
              </View>
            </View>

            <View style={styles.previewActions}>
              {!connectedPrinter ? (
                <TouchableOpacity style={styles.pairPrinterBtn} onPress={scanForPrinters}>
                  <Ionicons name="print-outline" size={18} color="#4F46E5" />
                  <Text style={styles.pairPrinterText}>Pair Printer</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.pairPrinterBtn} onPress={() => setConnectedPrinter(null)}>
                  <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                  <Text style={[styles.pairPrinterText, {color: '#EF4444'}]}>Disconnect</Text>
                </TouchableOpacity>
              )}
              <View style={{flexDirection: 'row', gap: 12, flex: 1}}>
                <TouchableOpacity style={styles.previewCancelBtn} onPress={() => setShowPrintPreview(false)}>
                  <Text style={styles.previewCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.previewConfirmBtn} onPress={() => printReceipt(completedOrder)}>
                  <Text style={styles.previewConfirmText}>Confirm Print</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Printer Search UI */}
            {(isPrinterSearching || availablePrinters.length > 0) && !connectedPrinter && (
              <View style={styles.searchOverlay}>
                <Text style={styles.searchTitle}>{isPrinterSearching ? 'Searching for Printers...' : 'Select Your Printer'}</Text>
                {isPrinterSearching ? (
                  <ActivityIndicator size="large" color="#4F46E5" style={{marginVertical: 20}} />
                ) : (
                  <View style={{maxHeight: 200}}>
                    {availablePrinters.map(p => (
                      <TouchableOpacity key={p.id} style={styles.printerOption} onPress={() => connectToPrinter(p)}>
                        <Ionicons name="bluetooth" size={20} color="#64748B" />
                        <Text style={styles.printerOptionName}>{p.name}</Text>
                        <Text style={styles.printerOptionId}>{p.id}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.reScanBtn} onPress={scanForPrinters}>
                      <Text style={styles.reScanText}>Scan Again</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  customerBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: Spacing.md, borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 2, borderColor: Colors.primary + '40', ...Shadows.sm },
  customerName: { fontSize: FontSize.lg, fontWeight: '700', color: '#1E293B' },
  customerPhone: { fontSize: FontSize.sm, color: '#64748B' },
  customerPlaceholder: { flex: 1, fontSize: FontSize.md, color: '#94A3B8' },
  
  editBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF9C3', paddingHorizontal: 16, paddingVertical: 8, gap: 8, marginHorizontal: Spacing.md, borderRadius: 12, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#FEF08A' },
  editBannerText: { flex: 1, fontSize: 11, fontWeight: '800', color: '#854D0E', letterSpacing: 0.5 },
  editCancelText: { fontSize: 10, fontWeight: '900', color: '#B45309', textDecorationLine: 'underline' },
  
  catScroll: { marginBottom: Spacing.sm },
  catTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff' },
  catTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary, ...Shadows.primary },
  catTabText: { fontSize: FontSize.sm, fontWeight: '800', color: '#64748B' },
  catTabTextActive: { color: '#fff' },

  products: { flex: 1 },
  productCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#E2E8F0', ...Shadows.sm },
  productCardActive: { borderColor: Colors.primary + '60', backgroundColor: Colors.primaryBg },
  productImage: { width: 70, height: 70, borderRadius: BorderRadius.md, backgroundColor: '#F1F5F9', marginRight: Spacing.md },
  productLeft: { flex: 1, paddingRight: Spacing.sm },
  productName: { fontSize: FontSize.lg, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
  
  priceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, height: 26, alignSelf: 'flex-start', marginTop: 2 },
  priceLabel: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  priceInput: { fontSize: 13, fontWeight: '800', color: Colors.primary, paddingHorizontal: 4, paddingVertical: 0, margin: 0, minWidth: 40, textAlign: 'center' },
  priceUnit: { fontSize: 11, color: Colors.textMuted, fontWeight: '700' },

  stockStatusContainer: { flexDirection: 'row', gap: 6, marginTop: 8 },
  stockStatusMini: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  stockStatusLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase' },
  stockStatusVal: { fontSize: 9, fontWeight: '900', color: '#1E293B' },

  freeOverlay: { marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  freeLabelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#BFDBFE' },
  freeLabelText: { fontSize: 10, fontWeight: '900', color: '#2563EB', textTransform: 'uppercase' },
  freeControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#BFDBFE', overflow: 'hidden' },
  freeBtn: { width: 28, height: 24, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  freeVal: { width: 30, textAlign: 'center', fontSize: 12, fontWeight: '800', color: '#1D4ED8', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#BFDBFE' },

  productRight: { alignItems: 'flex-end', justifyContent: 'center' },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 3, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  stepperLabel: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, width: 28, textAlign: 'center' },
  stepperBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  stepperVal: { width: 30, textAlign: 'center', fontSize: FontSize.md, fontWeight: '800', color: '#1E293B' },
  itemTotal: { fontSize: 11, fontWeight: '900', color: Colors.primary, marginTop: 6, paddingRight: 4 },

  cartBarContainer: { position: 'absolute', bottom: 24, left: Spacing.md, right: Spacing.md, zIndex: 100 },
  checkoutBarBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 14, paddingHorizontal: 20, ...Shadows.primary },
  cartCountBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.md },
  cartCountText: { fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  freeCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.md },
  freeCountText: { fontSize: 10, fontWeight: '900', color: '#FDE047', letterSpacing: 0.5 },
  checkoutBarText: { fontSize: FontSize.md, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  totalBadge: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.lg },
  totalBadgeText: { fontSize: FontSize.md, fontWeight: '900', color: Colors.primary },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: Colors.bgSurface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border, maxHeight: '90%' },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
  modalSearch: { backgroundColor: Colors.bgInput, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, paddingHorizontal: Spacing.md, height: 44, marginBottom: Spacing.md },
  customerOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  custAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  custAvatarText: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  custName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  custPhone: { fontSize: FontSize.sm, color: Colors.textMuted },
  noResults: { textAlign: 'center', color: Colors.textMuted, marginTop: 20 },
  checkoutCustomer: { fontSize: FontSize.lg, color: Colors.primaryLight, marginBottom: Spacing.md },
  
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cartItemName: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  cartItemAmt: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  discountRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  discountLabel: { fontSize: FontSize.sm, color: Colors.warning },
  discountAmt: { fontSize: FontSize.sm, color: Colors.warning, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, marginBottom: Spacing.lg },
  totalLabel: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary },
  totalAmt: { fontSize: FontSize['2xl'], fontWeight: '900', color: Colors.primary },
  payLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  payChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  payChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  payChipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textMuted },
  splitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  splitLabel: { width: 60, fontSize: FontSize.sm, color: Colors.textSecondary },
  splitInput: { flex: 1, backgroundColor: Colors.bgInput, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, paddingHorizontal: Spacing.md, height: 40, fontSize: FontSize.md },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, height: 46, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, height: 46, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.primary, marginTop: 10 },
  confirmText: { color: '#fff', fontWeight: '700' },

  // Receipt Preview Styles
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  previewCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  previewTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  receiptBoundary: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 },
  receiptContentFixed: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#F1F5F9', minHeight: 200 },
  receiptText: { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 13, color: '#000', lineHeight: 18 },
  receiptCenter: { textAlign: 'center' },
  receiptBold: { fontWeight: '700' },
  receiptDashedLine: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', marginVertical: 8 },
  receiptItemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 2 },
  previewActions: { flexDirection: 'row', gap: 12 },
  previewCancelBtn: { flex: 1, height: 54, borderRadius: 20, borderWidth: 1, borderColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
  previewCancelText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  previewConfirmBtn: { flex: 1, height: 54, borderRadius: 20, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  previewConfirmText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  pairPrinterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 16 },
  pairPrinterText: { fontSize: 14, fontWeight: '700', color: '#4F46E5' },

  printerStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#22C55E', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'center', marginBottom: 12 },
  printerStatusText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  searchOverlay: { marginTop: 10, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  searchTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 12, textAlign: 'center' },
  printerOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  printerOptionName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1E293B' },
  printerOptionId: { fontSize: 10, color: '#94A3B8' },
  reScanBtn: { marginTop: 12, alignItems: 'center' },
  reScanText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },

  remainingBadge: { backgroundColor: '#F1F5F9', padding: 10, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  remainingText: { fontSize: 14, fontWeight: '800', color: Colors.primary },
});
