const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    title: {type: String , required: true},
    time: {type: String , required: true},
    imageUrl: {type: String , required: true},
    foods: {type: Array , default: []},
    pickup: {type: Boolean , default: true},
    delivery: {type: Boolean, default: true},
    owner: {type: String , required: true},
    isAvailable: {type: Boolean , default: false},
    code: {type: String , required: true},
    logoUrl: {type: String , required: true},
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },

    ///added -wj testing
    xenditSubAccountId: { type: String, default: null },
    xenditAccountStatus: { 
      type: String, 
      enum: ['pending', 'active', 'suspended'], 
      default: 'pending' 
    },
    payoutMethod: {
      type: { type: String, enum: ['bank_account', 'ewallet'], default: 'bank_account' },
      bankCode: { type: String, default: null },
      accountNumber: { type: String, default: null },
      accountHolderName: { type: String, default: null },
      ewalletType: { type: String, enum: ['GCASH', 'PAYMAYA'], default: null },
      ewalletNumber: { type: String, default: null }
    },
    pendingRemit: {
      invoiceId: { type: String, default: null },
      amount: { type: Number, default: 0 },
      dueDate: { type: Date, default: null }
    },

    
    ratingCount: {type: String, default: "210"},
    verification: {type: String ,default: "Pending", enum: ["Pending", "Verified", "Rejected"]},
    verificationMessage: {type: String, default: "Please allow up to 24 hours for your verification to be processed. You will receive a notification once your verification is complete."},
    coords: {
        id: {type: String },
        latitude: {type: Number , required: true},
        longitude: {type: Number , required: true},
        latitudeDelta:{type: Number , default: 0.0122},
        longitudeDelta: {type: Number , default: 0.0221},
        address: {type: String , required: true},
        title: {type: String , required: true},
    }
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;
