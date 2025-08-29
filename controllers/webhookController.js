const crypto = require('crypto');
const Order = require('../models/Orders');
const Transaction = require('../models/Transaction');
const Restaurant = require('../models/Restaurant');

module.exports = {
    handleXenditWebhook: async (req, res) => {
        try {
            const signature = req.headers['x-xendit-signature'];
            const timestamp = req.headers['x-xendit-timestamp'];
            
            // Verify webhook signature
            const expectedSignature = crypto
                .createHmac('sha256', process.env.XENDIT_WEBHOOK_SECRET)
                .update(`${timestamp}.${JSON.stringify(req.body)}`)
                .digest('hex');

            if (signature !== expectedSignature) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid webhook signature"
                });
            }

            const event = req.body;

            switch (event.event) {
                case 'invoice.paid':
                    await handleInvoicePaid(event.data);
                    break;
                case 'invoice.expired':
                    await handleInvoiceExpired(event.data);
                    break;
                case 'charge.succeeded':
                    await handleChargeSucceeded(event.data);
                    break;
                default:
                    console.log(`Unhandled event type: ${event.event}`);
            }

            res.status(200).json({ status: true });
        } catch (error) {
            console.error('Webhook handling error:', error);
            res.status(500).json({
                status: false,
                message: error.message
            });
        }
    }
};

async function handleInvoicePaid(data) {
    try {
        const order = await Order.findOne({ xenditInvoiceId: data.id });
        if (order) {
            order.paymentStatus = 'Completed';
            await order.save();

            // Update transaction status
            await Transaction.findOneAndUpdate(
                { xenditInvoiceId: data.id },
                { status: 'completed' }
            );

            // Update restaurant earnings for online payments
            if (order.paymentSource === 'online') {
                const restaurant = await Restaurant.findById(order.restaurantId);
                if (restaurant) {
                    restaurant.earnings = (restaurant.earnings || 0) + order.grandTotal;
                    await restaurant.save();
                }
            }
        }
    } catch (error) {
        console.error('Error handling invoice paid:', error);
    }
}

async function handleInvoiceExpired(data) {
    try {
        const order = await Order.findOne({ xenditInvoiceId: data.id });
        if (order) {
            order.paymentStatus = 'Failed';
            await order.save();
        }
    } catch (error) {
        console.error('Error handling invoice expired:', error);
    }
}

async function handleChargeSucceeded(data) {
    try {
        // Handle successful charge events
        console.log('Charge succeeded:', data.id);
    } catch (error) {
        console.error('Error handling charge succeeded:', error);
    }
}