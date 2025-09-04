const mongoose = require('mongoose');
const Order = require('../models/Orders');
const Restaurant = require('../models/Restaurant');
const Transaction = require('../models/Transaction');
const XenditService = require('../services/xenditService');

module.exports = {
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
            const transaction = await Transaction.create({
                userId: order.userId,
                providerId: order.restaurantId,
                orderId: order._id,
                amount: order.grandTotal,
                commission: 0,
                source: 'online',
                status: 'completed',
                xenditInvoiceId: invoice.id,
                paymentMethod: 'Online',
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

    // ✅ ADD MISSING METHOD
    createPendingInvoice: async (req, res) => {
        try {
            console.log('createPendingInvoice body:', req.body);
            
            // Generate a temporary order ID
            const tempOrderId = new mongoose.Types.ObjectId();
            
            // Format cart items into order items
            const orderItems = req.body.cartItems.map(item => ({
                foodId: item.foodId,
                quantity: item.quantity,
                price: item.price,
                additives: item.additives || [],
                instructions: item.instructions || ''
            }));

            // Create temporary order data (not saved to DB yet)
            const orderData = {
                _id: tempOrderId,
                userId: req.body.userId,
                orderItems: orderItems,
                orderTotal: req.body.orderTotal,
                deliveryFee: req.body.deliveryFee,
                grandTotal: req.body.grandTotal,
                deliveryAddress: req.body.deliveryAddress,
                restaurantAddress: req.body.restaurantAddress || "Address not available",
                restaurantCoords: req.body.restaurantCoords || [],
                recipientCoords: req.body.recipientCoords || [],
                paymentMethod: 'Online',
                restaurantId: req.body.restaurantId
            };

            console.log('About to call Xendit service with order:', orderData);

            // Create Xendit invoice
            const invoice = await XenditService.createInvoiceWithSplit(orderData);

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

    // ✅ ADD MISSING METHOD
    createOrderAfterPayment: async (req, res) => {
        try {
            const { invoiceId, tempOrderId, paymentData } = req.body;
            
            console.log('🔍 createOrderAfterPayment received data:', {
                invoiceId,
                tempOrderId,
                paymentData,
                paymentDataKeys: Object.keys(paymentData || {})
            });

            if (!invoiceId || !tempOrderId) {
                return res.status(400).json({
                    status: false,
                    message: "Missing invoiceId or tempOrderId"
                });
            }

            console.log('🔍 Global payment status store:', global.paymentStatusStore);
            console.log('🔍 Looking for tempOrderId:', tempOrderId);
            console.log('🔍 Available keys in store:', Array.from(global.paymentStatusStore.keys()));

            // Verify payment status from webhook store
            const paymentStatus = global.paymentStatusStore.get(tempOrderId);
            console.log('✅ Payment status found:', paymentStatus);

            if (!paymentStatus || paymentStatus.status !== 'PAID') {
                return res.status(400).json({
                    status: false,
                    message: "Payment not confirmed. Please wait or contact support."
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
            // ✅ FIX: Use findOneAndUpdate with upsert instead of create
            const transaction = await Transaction.findOneAndUpdate(
                { xenditInvoiceId: invoiceId }, // Find by invoice ID
                {
                    // ✅ Make sure all these fields match your schema
                    userId: orderData.userId,                    // ✅ Required field
                    providerId: orderData.restaurantId,          // ✅ Required field
                    orderId: savedOrder._id,                     // ✅ Required field
                    amount: orderData.grandTotal,                // ✅ Required field
                    commission: 0,
                    source: 'online',
                    paymentStatus: 'PAID',                       // ✅ Use correct enum value
                    xenditInvoiceId: invoiceId,                  // ✅ Required field
                    paymentMethod: paymentStatus.paymentMethod || 'Online', // ✅ Required field
                    weekEnding: getWeekEnding(),
                    currency: 'PHP',
                    transactionDate: new Date()
                },
                { 
                    upsert: true,        // ✅ Create if doesn't exist, update if exists
                    new: true,           // ✅ Return the updated document
                    setDefaultsOnInsert: true // ✅ Set default values on insert
                }
            );

            console.log('✅ Transaction created/updated successfully:', transaction._id);

            // ✅ FIX: Update transaction with webhook data
            const webhookData = global.paymentStatusStore.get(tempOrderId);
            if (webhookData && webhookData.webhookData) {
                await Transaction.findByIdAndUpdate(transaction._id, {
                    'xenditData.payment_id': webhookData.webhookData.payment_id,
                    'xenditData.payment_method_id': webhookData.webhookData.payment_method_id,
                    'xenditData.ewallet_type': webhookData.webhookData.ewallet_type,
                    'xenditData.merchant_name': webhookData.webhookData.merchant_name
                });
                console.log('✅ Transaction updated with webhook data');
            }

            // ✅ FIX: Mark payment as processed
            global.paymentStatusStore.delete(tempOrderId);
            console.log('✅ Payment status cleaned up from store');

            // ✅ FIX: Return success response
            res.status(200).json({
                status: true,
                message: "Order created successfully after payment verification",
                orderId: savedOrder._id,
                transactionId: transaction._id,
                invoiceId: invoiceId
            });

        } catch (error) {
            console.error('❌ Create order after payment error:', error);
            
            // ✅ FIX: Better error handling
            if (error.code === 11000) {
                console.log('⚠️ Duplicate transaction detected, attempting to update...');
                
                try {
                    const existingTransaction = await Transaction.findOne({ xenditInvoiceId: invoiceId });
                    if (existingTransaction) {
                        console.log('✅ Found existing transaction, updating payment status...');
                        await Transaction.findByIdAndUpdate(existingTransaction._id, {
                            paymentStatus: 'PAID'
                        });
                    }
                } catch (updateError) {
                    console.error('❌ Failed to update existing transaction:', updateError);
                }
            }
            
            res.status(500).json({
                status: false,
                message: error.message
            });
        }
    },

    // ✅ ADD MISSING METHOD
    checkPaymentStatus: async (req, res) => {
        try {
            const { tempOrderId } = req.params;
            console.log('🔍 Checking payment status for:', tempOrderId);
            
            const paymentStatus = global.paymentStatusStore.get(tempOrderId);
            
            if (paymentStatus && paymentStatus.status === 'PAID') {
                console.log('✅ Payment status found:', paymentStatus);
                res.status(200).json({
                    isPaid: true,
                    status: paymentStatus.status,
                    paymentMethod: paymentStatus.paymentMethod
                });
            } else {
                console.log('❌ Payment status not found for:', tempOrderId);
                res.status(200).json({
                    isPaid: false
                });
            }
        } catch (error) {
            console.error('❌ Check payment status error:', error);
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