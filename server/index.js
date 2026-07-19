const dotenv = require('dotenv');
dotenv.config();
const express             = require('express');
const cors                = require('cors');
const path                = require('path');
const { sequelize }       = require('./config/db');
const apiRoutes           = require('./routes/api');
const permissionRoutes    = require('./routes/permission');
const roleRoutes          = require('./routes/role');
const siteRoutes          = require('./routes/site');
const sitePaymentRoutes   = require('./routes/sitePayment');
const teamRoutes          = require('./routes/team');
const unitRoutes          = require('./routes/unit');
const materialRoutes      = require('./routes/material');
const labourRoutes        = require('./routes/labour');
const vendorRoutes        = require('./routes/vendor');
const materialInvoiceRoutes = require('./routes/materialInvoice');
const labourInvoiceRoutes   = require('./routes/labourInvoice');
const vendorSummaryRoutes   = require('./routes/vendorSummary');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        success: false,
        message: err.message
    });
});

// Serve static files (user-generated files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static public assets (frontend files, logos, etc.)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Mount routes
app.use('/api', apiRoutes);
app.use('/api/permission', permissionRoutes); 
app.use('/api/role', roleRoutes);
app.use('/api/site', siteRoutes);
app.use('/api/site-payment', sitePaymentRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/unit', unitRoutes);
app.use('/api/material', materialRoutes);
app.use('/api/labour', labourRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/material-invoice', materialInvoiceRoutes);
app.use('/api/labour-invoice', labourInvoiceRoutes);
app.use('/api/vendor-summary', vendorSummaryRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Connect to database and start server
const startServer = async () => {
    try{
        await sequelize.authenticate();
        console.log('✅ Database connected');
        await sequelize.sync({ alter : true }); // { alter : true }
        const port = process.env.PORT || 5000;
        app.listen(port, '0.0.0.0', () => {
            console.log(`✅ Server running on port ${port}`);
        });
    }catch(err){
        console.error('❌ DB error:', err);
        process.exit(1);
    }
};

startServer();