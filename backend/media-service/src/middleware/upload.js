const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const logger = require('../utils/logger');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(os.tmpdir(), 'chlann-claude-uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for various media types
const fileFilter = (req, file, cb) => {
  // Allow images and videos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only images and videos are allowed.'), false);
  }
};

// Image file filter
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only images are allowed.'), false);
  }
};

// Video file filter
const videoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only videos are allowed.'), false);
  }
};

// Configure multer
const upload = (fieldName) => {
  const uploader = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
    }
  }).single(fieldName);

  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        logger.error(`Multer error: ${err.message}`);
        return res.status(400).json({ error: err.message });
      } else if (err) {
        logger.error(`Upload error: ${err.message}`);
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  };
};

// Image uploader
const uploadImage = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for images
  }
}).single('image');

// Video uploader
const uploadVideo = multer({
  storage: storage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
  }
}).single('video');

module.exports = {
  upload,
  uploadImage,
  uploadVideo
};
