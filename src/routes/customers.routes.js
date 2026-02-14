const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customers.controller');

// Profile
router.post('/', customersController.createProfile);
router.get('/:id', customersController.getProfile);
router.patch('/:id', customersController.updateProfile);
router.post('/:id/verify-age', customersController.verifyAge);

// Addresses
router.get('/:id/addresses', customersController.getAddresses);
router.post('/:id/addresses', customersController.addAddress);
router.patch('/:id/addresses/:addressId', customersController.updateAddress);
router.delete('/:id/addresses/:addressId', customersController.deleteAddress);

module.exports = router;
