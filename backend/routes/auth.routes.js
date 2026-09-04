const router = require('express').Router();
const { register, login, me, updateProfile, getPhoto, removePhoto } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const uploadImage = require('../middleware/upload-image.middleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.put('/me', protect, uploadImage.single('photo'), updateProfile);
router.get('/me/photo', protect, getPhoto);
router.delete('/me/photo', protect, removePhoto);

module.exports = router;
