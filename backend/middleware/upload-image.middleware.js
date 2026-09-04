const multer = require('multer');

const imageFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Format image non supporte (JPEG, PNG, WebP ou GIF)'));
};

module.exports = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
