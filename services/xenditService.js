const Xendit = require('xendit-node');
const xendit = new Xendit({
    secretKey: process.env.XENDIT_API_KEY,
});

console.log('🔍 Xendit package loaded:', !!Xendit);
console.log(' Xendit constructor:', typeof Xendit);

console.log('🔍 Xendit instance created:', !!xendit);
console.log('🔍 Xendit instance properties:', Object.keys(xendit || {}));

const Invoice = xendit.Invoice;
console.log('🔍 Invoice class available:', !!Invoice);
console.log('🔍 Invoice class methods:', Invoice ? Object.keys(Invoice.prototype || {}) : 'UNDEFINED');

if (Invoice) {
    console.log('🔍 Invoice constructor:', typeof Invoice);
    console.log('🔍 Invoice static methods:', Object.getOwnPropertyNames(Invoice));
    console.log('🔍 Invoice prototype methods:', Object.getOwnPropertyNames(Invoice.prototype || {}));
}

class XenditService {
    static async createSubAccount(providerData) {
        try {
            const response = await xendit.accounts.create({
                type: 'OWNED',
                business_profile: {
                    business_type: 'INDIVIDUAL',
                    company_name: providerData.businessName || 'Provider Business'
                },
                capabilities: ['PAYMENTS', 'PAYOUTS']
            });
            return response.id;
        } catch (error) {
            console.error('Error creating Xendit sub-account:', error);
            throw error;
        }
    }

        static async createInvoiceWithSplit(orderData, providerSubAccountId) {
        try {
            if (!Invoice) {
                throw new Error('Xendit Invoice class not available');
            }

            console.log('🔍 Creating invoice with data:', {
                external_id: orderData._id,
                amount: orderData.grandTotal,
                description: `Order ${orderData._id}`
            });

            // ✅ ADD MORE DEBUGGING:
            console.log('🔍 Invoice.createInvoice available:', typeof Invoice.createInvoice);
            console.log('🔍 Invoice.prototype.createInvoice available:', typeof Invoice.prototype?.createInvoice);
            console.log('🔍 xendit.invoices available:', !!xendit.invoices);
            console.log('🔍 xendit.invoices.create available:', typeof xendit.invoices?.create);

            let invoice;
            
            // Method 1: Try as static method
            if (typeof Invoice.createInvoice === 'function') {
                console.log('🔍 Using Invoice.createInvoice');
                invoice = await Invoice.createInvoice({
                    externalID: orderData._id.toString(),
                    amount: orderData.grandTotal,
                    description: `Order ${orderData._id}`
                });
            }
            // Method 2: Try as instance method
            else if (typeof Invoice.prototype?.createInvoice === 'function') {
                console.log('🔍 Using Invoice.prototype.createInvoice');
                const invoiceInstance = new Invoice();
                invoice = await invoiceInstance.createInvoice({
                    externalID: orderData._id.toString(),
                    amount: orderData.grandTotal,
                    description: `Order ${orderData._id}`
                });
            }
            // Method 3: Try direct xendit.invoices
            else if (xendit.invoices && typeof xendit.invoices.create === 'function') {
                console.log('🔍 Using xendit.invoices.create');
                invoice = await xendit.invoices.create({
                    externalID: orderData._id.toString(),
                    amount: orderData.grandTotal,
                    description: `Order ${orderData._id}`
                });
            }
            else {
                throw new Error('No valid invoice creation method found');
            }

            return invoice;
        } catch (error) {
            console.error('Error creating Xendit invoice:', error);
            throw error;
        }
    }

    static async createCommissionInvoice(providerId, amount, weekEnding) {
        try {
            const invoice = await xendit.invoices.create({
                external_id: `commission_${providerId}_${weekEnding.getTime()}`,
                amount: amount,
                description: `Weekly Commission Invoice - Week ending ${weekEnding.toDateString()}`,
                for_user_id: process.env.XENDIT_PLATFORM_ACCOUNT_ID
            });
            return invoice;
        } catch (error) {
            console.error('Error creating commission invoice:', error);
            throw error;
        }
    }
}

module.exports = XenditService;