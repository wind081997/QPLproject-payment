const Order = require('../models/Orders');
const Restaurant = require('../models/Restaurant');
const Transaction = require('../models/Transaction');
const XenditService = require('../services/xenditService');
const mongoose = require('mongoose');

module.exports = {
    // ✅ ADD THIS MISSING METHOD - REQUIRED BY ROUTES
    createPendingInvoice: async (req, res) => {
        try {
            console.log('createPendingInvoice body:', req.body);
            
            // Generate temp order ID
            const tempOrderId = new mongoose.Types.ObjectId();
            
            // ✅ FIX: Convert cartItems to orderItems format
            const orderItems = req.body.cartItems.map(item => ({
                foodId: item.foodId,
                quantity: item.quantity,
                price: parseFloat(item.price),
                additives: item.additives || [],
                instructions: item.instructions || ''
            }));
            
            // Create pending order data with ALL required fields
            const pendingOrderData = {
                _id: tempOrderId,
                userId: req.body.userId,
                orderItems: orderItems, // ✅ FIX: Use converted orderItems
                orderTotal: parseFloat(req.body.orderTotal),
                deliveryFee: parseFloat(req.body.deliveryFee),
                grandTotal: parseFloat(req.body.grandTotal),
                deliveryAddress: req.body.deliveryAddress,
                restaurantAddress: req.body.restaurantAddress || "Address not available",
                restaurantCoords: req.body.restaurantCoords || [],
                recipientCoords: req.body.recipientCoords || [],
                paymentMethod: req.body.paymentMethod || "Online",
                restaurantId: req.body.restaurantId,
            };

            console.log('About to call Xendit service with order:', pendingOrderData);

            // Create Xendit invoice
            const invoice = await XenditService.createInvoiceWithSplit(pendingOrderData);
            
            console.log('✅ Invoice created successfully:', invoice.id);

            res.status(200).json({
                status: true,
                invoiceUrl: invoice.invoice_url,
                invoiceId: invoice.id,
                tempOrderId: tempOrderId.toString()
            });
        } catch (error) {
            console.error('Create pending invoice error:', error);
            res.status(500).json({
                status: false,
                message: error.message
            });
        }
    },

    // ✅ ADD THIS MISSING METHOD - REQUIRED BY ROUTES
    checkPaymentStatus: async (req, res) => {
        try {
            const { tempOrderId } = req.params;
            
            console.log('🔍 Checking payment status for:', tempOrderId);
            
            // Check if payment status exists in global store
            if (global.paymentStatusStore && global.paymentStatusStore.has(tempOrderId)) {
                const status = global.paymentStatusStore.get(tempOrderId);
                console.log('✅ Payment status found:', status);
                res.status(200).json({
                    status: true,
                    paymentStatus: status
                });
            } else {
                console.log('❌ Payment status not found for:', tempOrderId);
                res.status(404).json({
                    status: false,
                    message: "Payment status not found"
                });
            }
        } catch (error) {
            console.error('Check payment status error:', error);
            res.status(500).json({
                status: false,
                message: error.message
            });
        }
    },

    createInvoice: async (req, res) => {
        try {
            console.log('createInvoice body:', req.body);
            const { orderId, paymentSource } = req.body;
            
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({
                    status: false,
                    message: "Order not found"
                });
            }

            const restaurant = await Restaurant.findById(order.restaurantId);
            if (!restaurant || !restaurant.xenditSubAccountId) {
                return res.status(400).json({
                    status: false,
                    message: "Provider not registered with Xendit"
                });
            }

            // Calculate commission (10% for cash payments)
            const commissionAmount = paymentSource === 'cash' ? 
                order.grandTotal * 0.1 : 0;

            // Create Xendit invoice with split
            const invoice = await XenditService.createInvoiceWithSplit(
                order, 
                restaurant.xenditSubAccountId
            );

            // Update order with payment source and commission
            order.paymentSource = paymentSource;
            order.commissionAmount = commissionAmount;
            order.xenditInvoiceId = invoice.id;
            await order.save();

            // Create transaction record
            await Transaction.create({
                providerId: order.restaurantId,
                orderId: order._id,
                amount: order.grandTotal,
                commission: commissionAmount,
                source: paymentSource,
                status: 'pending',
                xenditInvoiceId: invoice.id,
                weekEnding: getWeekEnding()
            });

            res.status(200).json({
                status: true,
                invoiceUrl: invoice.invoice_url,
                invoiceId: invoice.id
            });
        } catch (error) {
            console.error('Create invoice error:', error);
            res.status(500).json({
                status: false,
                message: error.message
            });
        }
    },

    createOrderAfterPayment: async (req, res) => {
        try {
            const { invoiceId, tempOrderId, paymentData } = req.body;
            
            console.log('🔍 createOrderAfterPayment received data:', { 
                invoiceId, 
                tempOrderId, 
                paymentData,
                paymentDataKeys: Object.keys(paymentData || {})
            });
            
            // ✅ DEBUG: Check what's in the global store
            console.log('🔍 Global payment status store:', global.paymentStatusStore);
            console.log('🔍 Looking for tempOrderId:', tempOrderId);
            console.log('🔍 Available keys in store:', Array.from(global.paymentStatusStore?.keys() || []));
            
            // ✅ CRITICAL: Verify payment was actually successful via webhook
            if (!global.paymentStatusStore || !global.paymentStatusStore.has(tempOrderId)) {
                console.log('❌ Payment not found in store. Store exists:', !!global.paymentStatusStore);
                console.log('❌ Store size:', global.paymentStatusStore?.size || 0);
                return res.status(400).json({
                    status: false,
                    message: "Payment not confirmed. Please wait or contact support."
                });
            }

            const paymentStatus = global.paymentStatusStore.get(tempOrderId);
            console.log('✅ Payment status found:', paymentStatus);
            
            if (paymentStatus.status !== 'PAID') {
                console.log('❌ Payment not completed. Status:', paymentStatus.status);
                return res.status(400).json({
                    status: false,
                    message: "Payment not completed. Status: " + paymentStatus.status
                });
            }

            console.log('✅ Payment verified via webhook:', paymentStatus);
            
            // ✅ FIX: Ensure all required fields are present with fallbacks
            const orderData = {
                userId: paymentData?.userId || req.body.userId,
                orderItems: paymentData?.orderItems || [],
                orderTotal: parseFloat(paymentData?.orderTotal || 0),
                deliveryFee: parseFloat(paymentData?.deliveryFee || 0),
                grandTotal: parseFloat(paymentData?.grandTotal || 0),
                deliveryAddress: paymentData?.deliveryAddress || '',
                restaurantAddress: paymentData?.restaurantAddress || "Address not available",
                restaurantCoords: paymentData?.restaurantCoords || [],
                recipientCoords: paymentData?.recipientCoords || [],
                paymentMethod: paymentData?.paymentMethod || "Online",
                paymentStatus: 'Completed',
                orderStatus: 'Placed',
                restaurantId: paymentData?.restaurantId || '',
                xenditInvoiceId: invoiceId,
                paymentSource: 'online',
                commissionAmount: 0,
                orderDate: new Date(),
            };

            console.log('🔍 Order data to be created:', orderData);

            // ✅ Validate required fields before creating order
            if (!orderData.userId) {
                throw new Error('userId is required but was not provided');
            }
            if (!orderData.paymentMethod) {
                throw new Error('paymentMethod is required but was not provided');
            }
            if (!orderData.restaurantId) {
                throw new Error('restaurantId is required but was not provided');
            }
            if (!orderData.orderItems || orderData.orderItems.length === 0) {
                throw new Error('orderItems is required but was not provided');
            }

            console.log('✅ All validations passed, creating order...');

            // ✅ Validate and set defaults for missing fields
            if (!orderData.restaurantAddress || orderData.restaurantAddress === "[]") {
                orderData.restaurantAddress = "Address not available";
            }

            const order = new Order(orderData);
            console.log('✅ Order model created, saving to database...');
            
            const savedOrder = await order.save();
            console.log('✅ Order saved successfully:', savedOrder._id);
            
            // Create transaction record
            console.log('✅ Creating transaction record...');
            const transaction = await Transaction.create({
                providerId: order.restaurantId,
                orderId: order._id,
                amount: order.grandTotal,
                commission: 0,
                source: 'online',
                status: 'completed',
                xenditInvoiceId: invoiceId,
                weekEnding: getWeekEnding()
            });

            console.log('✅ Transaction created successfully:', transaction._id);

            // ✅ Mark payment as processed
            global.paymentStatusStore.delete(tempOrderId);
            console.log('✅ Payment status cleaned up from store');

            res.status(200).json({
                status: true,
                message: "Order created successfully after payment verification",
                orderId: savedOrder._id,
                transactionId: transaction._id
            });
        } catch (error) {
            console.error('❌ Create order after payment error:', error);
            res.status(500).json({
                status: false,
                message: error.message
            });
        }
    }
};

function getWeekEnding() {
    const now = new Date();
    const daysUntilSaturday = 6 - now.getDay();
    const saturday = new Date(now);
    saturday.setDate(now.getDate() + daysUntilSaturday);
    saturday.setHours(20, 0, 0, 0); // 8 PM Manila time
    return saturday;
}