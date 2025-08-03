require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const startSock = require('./services/whatsappHandler');
const leadRoutes = require('./routes/leadRoutes');

const cors = require('cors');

//fixing the cors error 

// Connect DB
connectDB();

// Express setup
const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173', // React app default Vite port
  credentials: true,
}));
app.use('/api/admin', authRoutes);
app.use('/api/leads', leadRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Start WhatsApp socket
startSock();
