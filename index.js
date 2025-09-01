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
const webhooksRouter = require('./routes/webhooks');

// ✅ ADD SUCCESS/CANCEL ROUTES
app.get('/success', (req, res) => {
    const { orderId } = req.query;
    console.log('✅ Payment success page accessed for order:', orderId);
    
    // ✅ HTML page with countdown and auto-redirect
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Successful</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                color: white;
            }
            .container {
                background: rgba(255, 255, 255, 0.95);
                color: #333;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 400px;
                width: 90%;
            }
            .success-icon {
                font-size: 64px;
                color: #4CAF50;
                margin-bottom: 20px;
                animation: bounce 1s ease-in-out;
            }
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-20px); }
                60% { transform: translateY(-10px); }
            }
            .title {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #2E7D32;
            }
            .message {
                font-size: 16px;
                margin-bottom: 30px;
                color: #666;
            }
            .countdown {
                font-size: 20px;
                font-weight: bold;
                color: #FF5722;
                margin-bottom: 20px;
            }
            .order-id {
                background: #f5f5f5;
                padding: 10px;
                border-radius: 8px;
                font-family: monospace;
                margin-bottom: 20px;
                color: #333;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">✅</div>
            <div class="title">Payment Successful!</div>
            <div class="message">Thank you for your payment. Your order has been confirmed.</div>
            <div class="order-id">Order ID: ${orderId}</div>
            <div class="countdown">
                Redirecting in <span id="timer">5</span> seconds...
            </div>
        </div>

        <script>
            let countdown = 5;
            const timer = document.getElementById('timer');
            
            const interval = setInterval(() => {
                countdown--;
                timer.textContent = countdown;
                
                if (countdown <= 0) {
                    clearInterval(interval);
                    // ✅ Redirect back to your app (this will close WebView)
                    window.location.href = 'about:blank';
                }
            }, 1000);
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

app.get('/cancel', (req, res) => {
    const { orderId } = req.query;
    console.log('❌ Payment cancelled for order:', orderId);
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Cancelled</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                color: white;
            }
            .container {
                background: rgba(255, 255, 255, 0.95);
                color: #333;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 400px;
                width: 90%;
            }
            .error-icon {
                font-size: 64px;
                color: #f44336;
                margin-bottom: 20px;
            }
            .title {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #d32f2f;
            }
            .countdown {
                font-size: 20px;
                font-weight: bold;
                color: #FF5722;
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error-icon">❌</div>
            <div class="title">Payment Cancelled</div>
            <div class="message">Your payment was cancelled. Please try again.</div>
            <div class="countdown">
                Redirecting in <span id="timer">5</span> seconds...
            </div>
        </div>

        <script>
            let countdown = 5;
            const timer = document.getElementById('timer');
            
            const interval = setInterval(() => {
                countdown--;
                timer.textContent = countdown;
                
                if (countdown <= 0) {
                    clearInterval(interval);
                    window.location.href = 'about:blank';
                }
            }, 1000);
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// API Routes
app.use('/api/payments', paymentsRouter);
app.use('/api/providers', providersRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/webhooks', webhooksRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ status: false, message: err.message || 'Server error' });
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
