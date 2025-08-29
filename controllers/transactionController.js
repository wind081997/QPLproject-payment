const Restaurant = require('../models/Restaurant');
const XenditService = require('../services/xenditService');

module.exports = {
    registerProvider: async (req, res) => {
        try {
            const { restaurantId, businessName, payoutAccount } = req.body;
            
            const restaurant = await Restaurant.findById(restaurantId);
            if (!restaurant) {
                return res.status(404).json({ 
                    status: false, 
                    message: "Restaurant not found" 
                });
            }

            // Create Xendit sub-account
            const subAccountId = await XenditService.createSubAccount({
                businessName: businessName || restaurant.title
            });

            // Update restaurant with Xendit sub-account ID
            restaurant.xenditSubAccountId = subAccountId;
            await restaurant.save();

            res.status(200).json({
                status: true,
                message: "Provider registered successfully",
                subAccountId: subAccountId
            });
        } catch (error) {
            console.error('Provider registration error:', error);
            res.status(500).json({
                status: false,
                message: error.message
            });
        }
    }
};