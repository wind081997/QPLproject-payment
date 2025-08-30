const Xendit = require('xendit-node');
const xendit = new Xendit({
    secretKey: process.env.XENDIT_API_KEY,
});

console.log('🔍 Xendit package loaded:', !!Xendit);
console.log(' Xendit constructor:', typeof Xendit);

console.log('🔍 Xendit instance created:', !!xendit);
console.log('🔍 Xendit instance properties:', Object.keys(xendit || {}));

// ✅ DEBUG: Let's see what's actually available
const Invoice = xendit.Invoice;
console.log('🔍 Invoice class available:', !!Invoice);
console.log('🔍 Invoice class methods:', Invoice ? Object.keys(Invoice.prototype || {}) : 'UNDEFINED');

if (Invoice) {
    console.log('🔍 Invoice constructor:', typeof Invoice);
    console.log('🔍 Invoice static methods:', Object.getOwnPropertyNames(Invoice));
    console.log('🔍 Invoice prototype methods:', Object.getOwnPropertyNames(Invoice.prototype || {}));
    
    // ✅ ADDITIONAL DEBUG: Check if createInvoice exists
    console.log('🔍 Invoice.createInvoice available:', typeof Invoice.createInvoice);
    console.log('🔍 Invoice.prototype.createInvoice available:', typeof Invoice.prototype?.createInvoice);
}

// ✅ DEBUG: Check xendit.invoices structure
console.log('🔍 xendit.invoices available:', !!xendit.invoices);
if (xendit.invoices) {
    console.log('🔍 xendit.invoices methods:', Object.keys(xendit.invoices));
    console.log('🔍 xendit.invoices.create available:', typeof xendit.invoices.create);
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

    // ✅ FIXED: Try different methods based on what's available
    static async createInvoiceWithSplit(orderData, providerSubAccountId) {
        try {
            console.log('🔍 Creating invoice with data:', {
                external_id: orderData._id,
                amount: orderData.grandTotal,
                description: `Order ${orderData._id}`
            });

            let invoice;

            // ✅ METHOD 1: Try Invoice.createInvoice (static method)
            if (Invoice && typeof Invoice.createInvoice === 'function') {
                console.log('🔍 Using Invoice.createInvoice (static)');
                invoice = await Invoice.createInvoice({
                    externalID: orderData._id.toString(),
                    amount: orderData.grandTotal,
                    description: `Order ${orderData._id}`
                });
            }
            // ✅ METHOD 2: Try Invoice.prototype.createInvoice (instance method)
            else if (Invoice && typeof Invoice.prototype?.createInvoice === 'function') {
                console.log('🔍 Using Invoice.prototype.createInvoice (instance)');
                const invoiceInstance = new Invoice();
                invoice = await invoiceInstance.createInvoice({
                    externalID: orderData._id.toString(),
                    amount: orderData.grandTotal,
                    description: `Order ${orderData._id}`
                });
            }
            // ✅ METHOD 3: Try xendit.invoices.create (direct method)
            else if (xendit.invoices && typeof xendit.invoices.create === 'function') {
                console.log('🔍 Using xendit.invoices.create (direct)');
                invoice = await xendit.invoices.create({
                    external_id: orderData._id.toString(),
                    amount: orderData.grandTotal,
                    description: `Order ${orderData._id}`
                });
            }
            // ✅ METHOD 4: Try xendit.Invoice.create (alternative structure)
            else if (xendit.Invoice && typeof xendit.Invoice.create === 'function') {
                console.log('🔍 Using xendit.Invoice.create (alternative)');
                invoice = await xendit.Invoice.create({
                    external_id: orderData._id.toString(),
                    amount: orderData.grandTotal,
                    description: `Order ${orderData._id}`
                });
            }
            else {
                throw new Error('No valid invoice creation method found. Available methods: ' + 
                    JSON.stringify({
                        hasInvoice: !!Invoice,
                        hasInvoiceCreate: !!Invoice?.createInvoice,
                        hasInvoicePrototypeCreate: !!Invoice?.prototype?.createInvoice,
                        hasXenditInvoices: !!xendit.invoices,
                        hasXenditInvoicesCreate: !!xendit.invoices?.create,
                        hasXenditInvoiceCreate: !!xendit.Invoice?.create
                    })
                );
            }

            return invoice;
        } catch (error) {
            console.error('Error creating Xendit invoice:', error);
            throw error;
        }
    }

    // ✅ FIXED: Get invoice status using correct method
    static async getInvoice(invoiceId) {
        try {
            let invoice;

            // ✅ Try different methods to get invoice
            if (Invoice && typeof Invoice.getInvoice === 'function') {
                invoice = await Invoice.getInvoice(invoiceId);
            } else if (Invoice && typeof Invoice.prototype?.getInvoice === 'function') {
                const invoiceInstance = new Invoice();
                invoice = await invoiceInstance.getInvoice(invoiceId);
            } else if (xendit.invoices && typeof xendit.invoices.get === 'function') {
                invoice = await xendit.invoices.get(invoiceId);
            } else if (xendit.Invoice && typeof xendit.Invoice.get === 'function') {
                invoice = await xendit.Invoice.get(invoiceId);
            } else {
                throw new Error('No valid invoice retrieval method found');
            }

            return invoice;
        } catch (error) {
            console.error('Error getting Xendit invoice:', error);
            throw error;
        }
    }

    static async createCommissionInvoice(providerId, amount, weekEnding) {
        try {
            // ✅ Use the same logic as createInvoiceWithSplit
            return await this.createInvoiceWithSplit({
                _id: `commission_${providerId}_${weekEnding.getTime()}`,
                grandTotal: amount
            }, null);
        } catch (error) {
            console.error('Error creating commission invoice:', error);
            throw error;
        }
    }
}

module.exports = XenditService;