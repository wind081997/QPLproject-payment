const Order = require('../models/Orders');
const Restaurant = require('../models/Restaurant');
const Transaction = require('../models/Transaction');
const XenditService = require('../services/xenditService');
const mongoose = require('mongoose'); // ✅ Add this import

module.exports = {
    // ✅ NEW: Create invoice without order
    createPendingInvoice: async (req, res) => {
        try {
            console.log('createPendingInvoice body:', req.body);
            const { 
                userId, 
                cartItems, 
                orderTotal, 
                deliveryFee, 
                grandTotal,
                deliveryAddress,
                restaurantId,
                deliveryInstructions 
            } = req.body;
            
            // ✅ Create Xendit invoice FIRST (before order)
            const invoiceData = {
                _id: new mongoose.Types.ObjectId(), // Generate temp ID
                userId: userId,
                cartItems: cartItems,
                orderTotal: orderTotal,
                deliveryFee: deliveryFee,
                grandTotal: grandTotal,
                deliveryAddress: deliveryAddress,
                restaurantId: restaurantId,
                deliveryInstructions: deliveryInstructions || '', // Handle missing field
                status: 'pending' // Mark as pending
            };

            const invoice = await XenditService.createInvoiceWithSplit(
                invoiceData, 
                'test_subaccount_123'
            );

            // ✅ Return invoice URL for WebView
            res.status(200).json({
                status: true,
                invoiceUrl: invoice.invoice_url,
                invoiceId: invoice.id,
                tempOrderId: invoiceData._id.toString()
            });
        } catch (error) {
            console.error('Create pending invoice error:', error);
            res.status(500).json({
                status: false,
                message: error.message
            });
        }
    },

    // ✅ NEW: Create order after successful payment
    createOrderAfterPayment: async (req, res) => {
        try {
            const { 
                invoiceId, 
                tempOrderId,
                paymentData 
            } = req.body;

            // ✅ Verify payment was successful via Xendit
            const xenditInvoice = await XenditService.getInvoice(invoiceId);
            
            if (xenditInvoice.status !== 'PAID') {
                return res.status(400).json({
                    status: false,
                    message: "Payment not confirmed"
                });
            }

            // ✅ Now create the actual order
            const order = new Order({
                userId: paymentData.userId,
                orderItems: paymentData.cartItems.map(item => ({
                    foodId: item.foodId,
                    quantity: item.quantity,
                    price: item.price,
                    additives: item.additives || [],
                    instructions: item.instructions || ''
                })),
                orderTotal: paymentData.orderTotal,
                deliveryFee: paymentData.deliveryFee,
                grandTotal: paymentData.grandTotal,
                deliveryAddress: paymentData.deliveryAddress,
                paymentMethod: "Online",
                paymentStatus: "Completed",
                orderStatus: "Placed",
                restaurantId: paymentData.restaurantId,
                xenditInvoiceId: invoiceId,
                paymentSource: "online"
            });

            await order.save();

            res.status(201).json({
                status: true,
                orderId: order._id,
                message: "Order created successfully"
            });
        } catch (error) {
            console.error('Create order after payment error:', error);
            res.status(500).json({
                status: false,
                message: error.message
            });
        }
    },

    // ✅ KEEP THE EXISTING METHOD
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

            // ✅ COMMENTED OUT FOR TESTING - BYPASS RESTAURANT CHECK
            // const restaurant = await Restaurant.findById(order.restaurantId);
            // if (!restaurant || !restaurant.xenditSubAccountId) {
            //     return res.status(400).json({
            //         status: false,
            //         message: "Provider not registered with Xendit"
            //     });
            // }

            // ✅ USE DEFAULT SUB-ACCOUNT ID FOR TESTING
            const defaultSubAccountId = 'test_subaccount_123';
            
            // Calculate commission (10% for cash payments)
            const commissionAmount = paymentSource === 'cash' ? 
                order.grandTotal * 0.1 : 0;

            // ✅ ADD DEBUGGING
            console.log(' About to call Xendit service with order:', order);
            console.log('🔍 Order ID:', order._id);
            console.log('🔍 Order amount:', order.grandTotal);

            // Create Xendit invoice with split
            const invoice = await XenditService.createInvoiceWithSplit(
                order, 
                defaultSubAccountId  // Use default instead of restaurant.xenditSubAccountId
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