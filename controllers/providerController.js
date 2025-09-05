const Restaurant = require('../models/Restaurant');
const xenditService = require('../services/xenditService');

module.exports = {
  registerProvider: async (req, res) => {
    try {
      const { 
        restaurantId, 
        payoutMethod, 
        bankCode, 
        accountNumber, 
        accountHolderName,
        ewalletType,
        ewalletNumber 
      } = req.body;

      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ 
          status: false, 
          message: "Restaurant not found" 
        });
      }

      // Create Xendit sub-account
      const subAccountData = {
        type: payoutMethod === 'ewallet' ? 'EWALLET' : 'BANK_ACCOUNT',
        bankCode: payoutMethod === 'bank_account' ? bankCode : null,
        accountNumber: payoutMethod === 'bank_account' ? accountNumber : null,
        accountHolderName: accountHolderName,
        ewalletType: payoutMethod === 'ewallet' ? ewalletType : null,
        ewalletNumber: payoutMethod === 'ewallet' ? ewalletNumber : null
      };

      const xenditResponse = await xenditService.createSubAccount(subAccountData);
      
      if (xenditResponse.success) {
        // Update restaurant with Xendit sub-account info
        restaurant.xenditSubAccountId = xenditResponse.data.id;
        restaurant.xenditAccountStatus = 'active';
        restaurant.payoutMethod = {
          type: payoutMethod,
          bankCode: bankCode,
          accountNumber: accountNumber,
          accountHolderName: accountHolderName,
          ewalletType: ewalletType,
          ewalletNumber: ewalletNumber
        };
        
        await restaurant.save();
        
        res.status(200).json({
          status: true,
          message: "Provider registered successfully with Xendit",
          data: {
            xenditSubAccountId: xenditResponse.data.id,
            status: 'active'
          }
        });
      } else {
        res.status(400).json({
          status: false,
          message: "Failed to create Xendit sub-account",
          error: xenditResponse.error
        });
      }
    } catch (error) {
      console.error('Provider registration error:', error);
      res.status(500).json({
        status: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },

  getXenditStatus: async (req, res) => {
    try {
      const { providerId } = req.params;
      const restaurant = await Restaurant.findById(providerId);
      
      if (!restaurant) {
        return res.status(404).json({
          status: false,
          message: "Provider not found"
        });
      }

      res.status(200).json({
        status: true,
        data: {
          xenditSubAccountId: restaurant.xenditSubAccountId,
          xenditAccountStatus: restaurant.xenditAccountStatus,
          payoutMethod: restaurant.payoutMethod,
          pendingRemit: restaurant.pendingRemit
        }
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },

  updatePayoutMethod: async (req, res) => {
    try {
      const { providerId } = req.params;
      const { payoutMethod, bankCode, accountNumber, accountHolderName, ewalletType, ewalletNumber } = req.body;

      const restaurant = await Restaurant.findById(providerId);
      if (!restaurant) {
        return res.status(404).json({
          status: false,
          message: "Provider not found"
        });
      }

      // Update payout method
      restaurant.payoutMethod = {
        type: payoutMethod,
        bankCode: bankCode,
        accountNumber: accountNumber,
        accountHolderName: accountHolderName,
        ewalletType: ewalletType,
        ewalletNumber: ewalletNumber
      };

      await restaurant.save();

      res.status(200).json({
        status: true,
        message: "Payout method updated successfully"
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Internal server error",
        error: error.message
      });
    }
  }
};