const customersRepository = require('../repositories/customers.repository');
const { sendSuccess, sendCreated, sendNotFound } = require('../utils/response');
const asyncHandler = require('../middlewares/asyncHandler');

// ----------------------
// Customer Profile
// ----------------------

/* POST /api/customers/:id/verify-age */
const verifyAge = asyncHandler(async (req, res) => {
    const { date_of_birth } = req.body;
    if (!date_of_birth) {
        const error = new Error('Date of birth is required (YYYY-MM-DD)');
        error.statusCode = 400;
        throw error;
    }

    const customer = await customersRepository.verifyAge(req.params.id, date_of_birth);
    if (!customer) return sendNotFound(res, 'Customer');

    sendSuccess(res, {
        is_age_verified: customer.is_age_verified,
        message: 'Age verification successful'
    });
});

/* POST /api/customers */
const createProfile = asyncHandler(async (req, res) => {
    const { full_name, email, phone, date_of_birth } = req.body;

    if (!full_name || !email) {
        const error = new Error('Full name and email are required');
        error.statusCode = 400;
        throw error;
    }

    // Check if email exists
    const existing = await customersRepository.findByEmail(email);
    if (existing) {
        const error = new Error('Customer with this email already exists');
        error.statusCode = 409;
        throw error;
    }

    const customer = await customersRepository.create({ full_name, email, phone, date_of_birth });
    sendCreated(res, customer, 'Customer profile created successfully');
});

/* GET /api/customers/:id */
const getProfile = asyncHandler(async (req, res) => {
    const customer = await customersRepository.findById(req.params.id);
    if (!customer) return sendNotFound(res, 'Customer');
    sendSuccess(res, customer);
});

/* PATCH /api/customers/:id */
const updateProfile = asyncHandler(async (req, res) => {
    const customer = await customersRepository.update(req.params.id, req.body);
    if (!customer) return sendNotFound(res, 'Customer');
    sendSuccess(res, customer, 'Profile updated successfully');
});

// ----------------------
// Address Book
// ----------------------

/* GET /api/customers/:id/addresses */
const getAddresses = asyncHandler(async (req, res) => {
    const addresses = await customersRepository.getAddresses(req.params.id);
    sendSuccess(res, addresses);
});

/* POST /api/customers/:id/addresses */
const addAddress = asyncHandler(async (req, res) => {
    const { address_line1, city, state, pincode } = req.body;

    if (!address_line1 || !city || !state || !pincode) {
        const error = new Error('Address Line 1, City, State, and Pincode are required');
        error.statusCode = 400;
        throw error;
    }

    const address = await customersRepository.addAddress(req.params.id, req.body);
    sendCreated(res, address, 'Address added successfully');
});

/* PATCH /api/customers/:id/addresses/:addressId */
const updateAddress = asyncHandler(async (req, res) => {
    const address = await customersRepository.updateAddress(req.params.addressId, req.params.id, req.body);
    if (!address) return sendNotFound(res, 'Address');
    sendSuccess(res, address, 'Address updated successfully');
});

/* DELETE /api/customers/:id/addresses/:addressId */
const deleteAddress = asyncHandler(async (req, res) => {
    const result = await customersRepository.deleteAddress(req.params.addressId, req.params.id);
    if (!result) return sendNotFound(res, 'Address');
    sendSuccess(res, {}, 'Address deleted successfully');
});

module.exports = {
    createProfile,
    getProfile,
    updateProfile,
    verifyAge,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
};
