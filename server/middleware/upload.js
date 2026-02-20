const multer = require('multer');
const fs     = require('fs');
const path   = require('path');

// Create upload directory if it doesn't exist
const createUploadDir = (subDir) => {
    const uploadDir = path.join(process.cwd(), 'uploads', subDir);
    if(!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
};

// Factory function to create multer storage for a specific subdirectory
const createStorage = (subDir) => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = createUploadDir(subDir);
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const sanitizedName = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '');
            cb(null, `${Date.now()}-${sanitizedName}`);
        },
    });
};

// File filter function to check file types
const fileFilter = (req, file, cb) => {
    const allowedTypes = {
        checkout_photo: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'],
        invoice_photo: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff']
    };
    
    if(allowedTypes[file.fieldname]?.includes(file.mimetype)){
        cb(null, true);
    } else {
        cb(
            new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${allowedTypes[file.fieldname]?.join(', ') || 'none'}`),
            false
        );
    }
};

// Create multer upload instances
const uploadMiddleware = {
    siteCheckoutUpload: multer({
        storage: createStorage('sites/checkout'),
        fileFilter: (req, file, cb) => {
            const allowedImageTypes = [
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/webp',
                'image/gif',
                'image/bmp',
                'image/tiff'
            ];
            if (allowedImageTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Only image files are allowed for site checkout photo'), false);
            }
        },
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }).single('checkout_photo'),

    // Material entry invoice upload (stores in uploads/material-entries)
    materialEntryUpload: multer({
        storage: createStorage('material-entries'),
        fileFilter: (req, file, cb) => {
            const allowedImageTypes = [
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/webp'
            ];
            if (allowedImageTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Only image files (JPG, PNG, WEBP) are allowed for invoice photo'), false);
            }
        },
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }).single('invoice_photo'),

    // General image upload (stores in uploads/general)
    generalUpload: multer({
        storage: createStorage('general'),
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 },
    }).any(),
};

// Error handling middleware for Multer errors
const handleMulterError = (err, req, res, next) => {
    console.error('Multer error:', err);
    if(err instanceof multer.MulterError) {
        let message = 'File upload error';
        // Provide more specific error messages
        switch(err.code){
            case 'LIMIT_FILE_SIZE':
                message = 'File size too large. Maximum 5MB per file allowed.';
                break;
            case 'LIMIT_FILE_COUNT':
                message = 'Too many files uploaded.';
                break;
            case 'LIMIT_FIELD_COUNT':
                message = 'Too many fields in the form.';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = `Unexpected file field: ${err.field}`;
                break;
            default:
                message = err.message;
        }
        return res.status(400).json({
            success: false,
            message: message,
            errors: { [err.field || 'file']: err.message },
        });
    } else if(err){
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload error',
            errors: { [err.field || 'file']: err.message },
        });
    }
    next();
};

module.exports = { uploadMiddleware, handleMulterError };