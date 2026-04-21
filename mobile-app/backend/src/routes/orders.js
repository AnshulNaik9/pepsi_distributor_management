const express = require('express');
const router = express.Router();
const { Order, Product, Offer, Customer, GodownStock, TruckStock, AuditLog, Counter } = require('../models');

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customerId')
      .populate('truckId')
      .populate('items.productId')
      .sort({ date: -1 });

    const formatted = orders.map(o => ({
      ...o.toObject(),
      customer: o.customerId,
      truck: o.truckId,
      items: o.items.map(item => ({
        ...item.toObject(),
        product: item.productId
      }))
    }));
    res.json(formatted);
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

// POST /api/orders/checkout
router.post('/checkout', async (req, res) => {
  try {
    const { customerId, truckId, paymentMode, splitAmounts, items } = req.body;

    const allProducts = await Product.find();
    const productMap = new Map(allProducts.map(p => [p._id.toString(), p]));
    const activeOffers = await Offer.find({ isActive: true });

    let totalAmount = 0;
    const finalItems = [];
    const stockDeductions = new Map();

    // Pre-calculate global promo cases for mixed cases
    let globalPromoCases = 0;
    for (const item of items) {
      if (item.customFreeQty !== undefined) continue;
      const product = productMap.get(item.productId);
      if (!product) continue;
      
      let hasExplicitOffer = false;
      for (const offer of activeOffers) {
        if (offer.buyProductId.toString() === item.productId && item.quantity >= offer.buyQuantity) {
          hasExplicitOffer = true; break;
        }
      }
      if (hasExplicitOffer) continue;

      const prodName = product.name.toLowerCase();
      const promoCat = (product.category || 'others').toLowerCase().trim();
      const isPromo = prodName.includes('2.25') || prodName.includes('750') || promoCat === '2_25_ltr' || promoCat === '750_ml';
      const isExcluded = (prodName.includes('soda') && prodName.includes('2.25')) ||
        (prodName.includes('pepsi') && prodName.includes('1') && (prodName.includes('ltr') || prodName.includes('1l'))) ||
        (prodName.includes('lehar') && prodName.includes('soda') && prodName.includes('750'));

      if (isPromo && !isExcluded) {
        globalPromoCases += item.quantity;
      }
    }
    let globalFreeBottlesToAward = Math.floor(globalPromoCases) * 2;

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);

      const actualPrice = item.customPrice ?? product.price;
      totalAmount += actualPrice * item.quantity;

      finalItems.push({
        productId: item.productId,
        quantity: item.quantity,
        isFree: false,
        customPrice: item.customPrice
      });

      stockDeductions.set(item.productId, (stockDeductions.get(item.productId) || 0) + item.quantity);

      let freeQtyFromOffers = 0;
      let freeProductId = null;

      for (const offer of activeOffers) {
        if (offer.buyProductId.toString() === item.productId && item.quantity >= offer.buyQuantity) {
          const offerMultiplier = Math.floor(item.quantity / offer.buyQuantity);
          const quantityFromOffer = offerMultiplier * offer.freeQuantity;
          if (quantityFromOffer > freeQtyFromOffers) {
            freeQtyFromOffers = quantityFromOffer;
          }
          freeProductId = offer.freeProductId.toString();
        }
      }

      let totalFreeQty = 0;
      if (item.customFreeQty !== undefined) {
        totalFreeQty = item.customFreeQty;
      } else if (freeQtyFromOffers > 0) {
        totalFreeQty = freeQtyFromOffers;
      } else {
        const prodName = (product?.name || '').toLowerCase();
        const promoCat = (product?.category || 'others').toLowerCase().trim();
        const isPromo = prodName.includes('2.25') || prodName.includes('750') || promoCat === '2_25_ltr' || promoCat === '750_ml';
        const isExcluded = (prodName.includes('soda') && prodName.includes('2.25')) ||
          (prodName.includes('pepsi') && prodName.includes('1') && (prodName.includes('ltr') || prodName.includes('1l'))) ||
          (prodName.includes('lehar') && prodName.includes('soda') && prodName.includes('750'));
        if (isPromo && !isExcluded) {
          if (globalFreeBottlesToAward > 0) {
            totalFreeQty = globalFreeBottlesToAward;
            globalFreeBottlesToAward = 0;
          }
        }
      }

      if (totalFreeQty > 0) {
        if (!freeProductId) {
          const aquafina = allProducts.find(p => p.name.toLowerCase().includes('aquafina'));
          freeProductId = aquafina?._id.toString();
        }
        if (freeProductId) {
          const fProduct = allProducts.find(p => p._id.toString() === freeProductId);
          const packing = fProduct?.itemsPerCase && fProduct.itemsPerCase > 0 ? fProduct.itemsPerCase : 1;
          const casesToDeduct = totalFreeQty / packing;
          
          finalItems.push({ productId: freeProductId, quantity: Math.round(totalFreeQty), isFree: true });
          stockDeductions.set(freeProductId, (stockDeductions.get(freeProductId) || 0) + casesToDeduct);
        }
      }
    }

    // Deduct stock (truck first, then godown)
    for (const [productId, quantity] of stockDeductions.entries()) {
      const tStock = await TruckStock.findOne({ truckId, productId });
      const gStock = await GodownStock.findOne({ productId });

      const truckAvailable = tStock?.casesAvailable ?? 0;
      const godownAvailable = gStock?.casesAvailable ?? 0;

      if (truckAvailable + godownAvailable < quantity) {
        throw new Error(`Not enough total stock for product ${productId}. Combined: ${truckAvailable + godownAvailable}, Required: ${quantity}`);
      }

      const fromTruck = Math.min(truckAvailable, quantity);
      const fromGodown = quantity - fromTruck;

      if (fromTruck > 0 && tStock) {
        tStock.casesAvailable -= fromTruck;
        await tStock.save();
      }
      if (fromGodown > 0 && gStock) {
        gStock.casesAvailable -= fromGodown;
        await gStock.save();
      }
    }

    // Check special discount
    const customer = await Customer.findById(customerId);
    if (customer?.hasSpecialDiscount) {
      totalAmount = Math.max(0, totalAmount - 20);
    }

    // Payment mode formatting
    let finalPaymentMode = paymentMode;
    if (paymentMode === 'Split' && splitAmounts) {
      const parts = [];
      if (splitAmounts.cash > 0) parts.push(`Cash: ${splitAmounts.cash}`);
      if (splitAmounts.upi > 0) parts.push(`UPI: ${splitAmounts.upi}`);
      if (splitAmounts.credit > 0) parts.push(`Credit: ${splitAmounts.credit}`);
      finalPaymentMode = 'Split (' + parts.join(', ') + ')';
    }

    const counter = await Counter.findOneAndUpdate(
      { id: 'orderNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const order = await Order.create({
      orderNumber: counter.seq,
      customerId,
      truckId,
      paymentMode: finalPaymentMode,
      totalAmount,
      items: finalItems
    });

    // Handle credit
    if (paymentMode === 'Credit' && customer) {
      customer.creditBalance += totalAmount;
      await customer.save();
    } else if (paymentMode === 'Split' && splitAmounts?.credit > 0 && customer) {
      customer.creditBalance += splitAmounts.credit;
      await customer.save();
    }

    const populated = await Order.findById(order._id)
      .populate('customerId')
      .populate('items.productId');

    res.status(201).json({
      ...populated.toObject(),
      customer: populated.customerId,
      items: populated.items.map(item => ({ ...item.toObject(), product: item.productId }))
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// PATCH /api/orders/:id
router.patch('/:id', async (req, res) => {
  try {
    const oldOrder = await Order.findById(req.params.id);
    if (!oldOrder) return res.status(404).json({ message: 'Order not found' });

    // Rollback old stock deductions - return to truck
    const allProducts = await Product.find();
    for (const item of oldOrder.items) {
      const prod = allProducts.find(p => p._id.toString() === item.productId.toString());
      const packing = (item.isFree && prod?.itemsPerCase && prod.itemsPerCase > 0) ? prod.itemsPerCase : 1;
      const qtyToReturn = item.isFree ? item.quantity / packing : item.quantity;
      
      const existing = await TruckStock.findOne({ truckId: oldOrder.truckId, productId: item.productId });
      if (existing) {
        existing.casesAvailable += qtyToReturn;
        await existing.save();
      } else {
        await TruckStock.create({ truckId: oldOrder.truckId, productId: item.productId, casesAvailable: qtyToReturn });
      }
    }

    // Revert credit
    let creditRevert = 0;
    if (oldOrder.paymentMode === 'Credit') creditRevert = oldOrder.totalAmount;
    else if (oldOrder.paymentMode.startsWith('Split')) {
      const match = oldOrder.paymentMode.match(/Credit:\s*(\d+)/);
      if (match) creditRevert = parseInt(match[1], 10);
    }
    if (creditRevert > 0) {
      await Customer.findByIdAndUpdate(oldOrder.customerId, { $inc: { creditBalance: -creditRevert } });
    }

    // Now process the new checkout data with the same logic
    const { customerId, truckId, paymentMode, splitAmounts, items } = req.body;
    const productMap = new Map(allProducts.map(p => [p._id.toString(), p]));
    const activeOffers = await Offer.find({ isActive: true });

    let totalAmount = 0;
    const finalItems = [];
    const stockDeductions = new Map();

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      const actualPrice = item.customPrice ?? product.price;
      totalAmount += actualPrice * item.quantity;
      finalItems.push({ productId: item.productId, quantity: item.quantity, isFree: false, customPrice: item.customPrice });
      stockDeductions.set(item.productId, (stockDeductions.get(item.productId) || 0) + item.quantity);

      // Process offers
      let freeQtyFromOffers = 0;
      let freeProductId = null;
      for (const offer of activeOffers) {
        if (offer.buyProductId.toString() === item.productId && item.quantity >= offer.buyQuantity) {
          const mult = Math.floor(item.quantity / offer.buyQuantity);
          const qty = mult * offer.freeQuantity;
          if (qty > freeQtyFromOffers) freeQtyFromOffers = qty;
          freeProductId = offer.freeProductId.toString();
        }
      }
      const totalFreeQty = item.customFreeQty !== undefined ? item.customFreeQty : freeQtyFromOffers;
      if (totalFreeQty > 0 && freeProductId) {
        const fProduct = allProducts.find(p => p._id.toString() === freeProductId);
        const packing = fProduct?.itemsPerCase > 0 ? fProduct.itemsPerCase : 1;
        finalItems.push({ productId: freeProductId, quantity: Math.round(totalFreeQty), isFree: true });
        stockDeductions.set(freeProductId, (stockDeductions.get(freeProductId) || 0) + totalFreeQty / packing);
      }
    }

    // Deduct stock
    for (const [productId, quantity] of stockDeductions.entries()) {
      const tStock = await TruckStock.findOne({ truckId, productId });
      const gStock = await GodownStock.findOne({ productId });
      const truckAvailable = tStock?.casesAvailable ?? 0;
      const godownAvailable = gStock?.casesAvailable ?? 0;
      if (truckAvailable + godownAvailable < quantity) {
        throw new Error(`Not enough stock for product ${productId}`);
      }
      const fromTruck = Math.min(truckAvailable, quantity);
      const fromGodown = quantity - fromTruck;
      if (fromTruck > 0 && tStock) { tStock.casesAvailable -= fromTruck; await tStock.save(); }
      if (fromGodown > 0 && gStock) { gStock.casesAvailable -= fromGodown; await gStock.save(); }
    }

    const customer = await Customer.findById(customerId);
    if (customer?.hasSpecialDiscount) totalAmount = Math.max(0, totalAmount - 20);

    let finalPaymentMode = paymentMode;
    if (paymentMode === 'Split' && splitAmounts) {
      const parts = [];
      if (splitAmounts.cash > 0) parts.push(`Cash: ${splitAmounts.cash}`);
      if (splitAmounts.upi > 0) parts.push(`UPI: ${splitAmounts.upi}`);
      if (splitAmounts.credit > 0) parts.push(`Credit: ${splitAmounts.credit}`);
      finalPaymentMode = 'Split (' + parts.join(', ') + ')';
    }

    oldOrder.customerId = customerId;
    oldOrder.truckId = truckId;
    oldOrder.paymentMode = finalPaymentMode;
    oldOrder.totalAmount = totalAmount;
    oldOrder.items = finalItems;
    await oldOrder.save();

    if (paymentMode === 'Credit' && customer) {
      customer.creditBalance += totalAmount;
      await customer.save();
    } else if (paymentMode === 'Split' && splitAmounts?.credit > 0 && customer) {
      customer.creditBalance += splitAmounts.credit;
      await customer.save();
    }

    const populated = await Order.findById(oldOrder._id).populate('customerId').populate('items.productId');
    res.json({
      ...populated.toObject(),
      customer: populated.customerId,
      items: populated.items.map(item => ({ ...item.toObject(), product: item.productId }))
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('customerId').populate('items.productId');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Audit log before deletion
    await AuditLog.create({
      action: 'DELETE_ORDER',
      entityType: 'order',
      entityId: order._id,
      entityName: `Order #${order._id}`,
      details: JSON.stringify({
        orderId: order._id,
        customerName: order.customerId?.name || 'Unknown',
        totalAmount: order.totalAmount,
        paymentMode: order.paymentMode,
        date: order.date,
        items: order.items.map(i => ({
          productName: i.productId?.name || 'Unknown',
          quantity: i.quantity,
          isFree: i.isFree
        }))
      })
    });

    // Return stock to truck
    for (const item of order.items) {
      const prod = await Product.findById(item.productId);
      const packing = (item.isFree && prod?.itemsPerCase > 0) ? prod.itemsPerCase : 1;
      const qtyToReturn = item.isFree ? item.quantity / packing : item.quantity;

      const tStock = await TruckStock.findOne({ truckId: order.truckId, productId: item.productId });
      if (tStock) {
        tStock.casesAvailable += qtyToReturn;
        await tStock.save();
      } else {
        await TruckStock.create({ truckId: order.truckId, productId: item.productId, casesAvailable: qtyToReturn });
      }
    }

    // Revert credit
    if (order.paymentMode === 'Credit') {
      await Customer.findByIdAndUpdate(order.customerId, { $inc: { creditBalance: -order.totalAmount } });
    } else if (order.paymentMode.startsWith('Split')) {
      const match = order.paymentMode.match(/Credit:\s*(\d+)/);
      if (match) {
        await Customer.findByIdAndUpdate(order.customerId, { $inc: { creditBalance: -parseInt(match[1], 10) } });
      }
    }

    await Order.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

module.exports = router;
