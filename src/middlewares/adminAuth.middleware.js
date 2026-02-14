/**
 * Admin Authorization Middleware
 *
 * Must be used AFTER authenticate middleware.
 * Checks that req.user.role === 'admin'.
 *
 * Usage in routes:
 *   router.post('/', authenticate, requireAdmin, createProduct);
 */

const { query } = require('../database');

const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.customer_id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.',
            });
        }

        const result = await query(
            'SELECT role FROM inventory.customers WHERE customer_id = $1',
            [req.user.customer_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
            });
        }

        const { role } = result.rows[0];
        if (role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required. Insufficient permissions.',
            });
        }

        req.user.role = role;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { requireAdmin };
