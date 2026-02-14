const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customers.controller');
const {
    uploadProfileImage,
    getProfileImage,
    removeProfileImage,
} = require('../controllers/images.controller');

// Profile
router.post('/', customersController.createProfile);
router.get('/:id', customersController.getProfile);
router.patch('/:id', customersController.updateProfile);
router.post('/:id/verify-age', customersController.verifyAge);

// Profile Image
router.put('/:id/profile-image', uploadProfileImage);      // PUT    /api/customers/:id/profile-image
router.get('/:id/profile-image', getProfileImage);          // GET    /api/customers/:id/profile-image
router.delete('/:id/profile-image', removeProfileImage);    // DELETE /api/customers/:id/profile-image

// Addresses
router.get('/:id/addresses', customersController.getAddresses);
router.post('/:id/addresses', customersController.addAddress);
router.patch('/:id/addresses/:addressId', customersController.updateAddress);
router.delete('/:id/addresses/:addressId', customersController.deleteAddress);

module.exports = router;
