const Transaction = require('../models/Transaction');
const Restaurant = require('../models/Restaurant');
const XenditService = require('./xenditService');
const nodemailer = require('nodemailer');

class CommissionService {
    static async calculateWeeklyCommissions() {
        try {
            const weekEnding = getWeekEnding();
            const weekStart = new Date(weekEnding);
            weekStart.setDate(weekStart.getDate() - 7);

            // Get all providers with pending cash commissions
            const providers = await Restaurant.find({
                'pendingRemit.amount': { $gt: 0 }
            });

            for (const provider of providers) {
                // Calculate unpaid cash commissions
                const cashTransactions = await Transaction.find({
                    providerId: provider._id,
                    source: 'cash',
                    status: 'completed',
                    weekEnding: { $gte: weekStart, $lte: weekEnding }
                });

                const totalCommission = cashTransactions.reduce((sum, trans) => 
                    sum + trans.commission, 0
                );

                if (totalCommission > 0) {
                    // Create commission invoice
                    const invoice = await XenditService.createCommissionInvoice(
                        provider._id,
                        totalCommission,
                        weekEnding
                    );

                    // Update provider pending remit
                    provider.pendingRemit = {
                        amount: totalCommission,
                        invoiceUrl: invoice.invoice_url,
                        dueDate: weekEnding
                    };
                    await provider.save();

                    // Send notification email
                    await this.sendCommissionNotification(provider, totalCommission, invoice.invoice_url);
                }
            }
        } catch (error) {
            console.error('Error calculating weekly commissions:', error);
        }
    }

    static async sendCommissionNotification(provider, amount, invoiceUrl) {
        try {
            const transporter = nodemailer.createTransporter({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            const mailOptions = {
                from: process.env.SMTP_USER,
                to: provider.email || 'provider@example.com',
                subject: 'Weekly Commission Invoice - Dr.Lab',
                html: `
                    <h2>Weekly Commission Invoice</h2>
                    <p>Dear ${provider.title},</p>
                    <p>Your weekly commission invoice for ₱${amount.toFixed(2)} is ready.</p>
                    <p>Please settle this invoice to continue using the platform.</p>
                    <a href="${invoiceUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Pay Now</a>
                    <p>Due Date: ${new Date().toDateString()}</p>
                `
            };

            await transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Error sending commission notification:', error);
        }
    }
}

function getWeekEnding() {
    const now = new Date();
    const daysUntilSaturday = 6 - now.getDay();
    const saturday = new Date(now);
    saturday.setDate(now.getDate() + daysUntilSaturday);
    saturday.setHours(20, 0, 0, 0); // 8 PM Manila time
    return saturday;
}

module.exports = CommissionService;