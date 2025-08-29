const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');


dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const paymentsRouter = require('./routes/payments');
const providersRouter = require('./routes/providers');
const transactionsRouter = require('./routes/transactions');


// MongoDB connection
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Routes
app.use('/api/payments', paymentsRouter);
app.use('/api/providers', providersRouter);
app.use('/api', transactionsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ status: false, message: err.message || 'Server error' });
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
