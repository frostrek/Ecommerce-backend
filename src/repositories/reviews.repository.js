const { query } = require('../database');

class ReviewsRepository {

    /**
     * Create or update a review.
     * One review per customer per product (upsert).
     */
    async createOrUpdate(customerId, productId, { rating, title, body, order_id }) {
        // Check if customer actually purchased this product
        let isVerified = false;
        if (order_id) {
            const orderCheck = await query(
                `SELECT 1 FROM inventory.order_items oi
                 JOIN inventory.orders o ON oi.order_id = o.order_id
                 WHERE o.order_id = $1 AND o.customer_id = $2
                 AND oi.variant_id IN (
                     SELECT variant_id FROM inventory.product_variants WHERE product_id = $3
                 )`,
                [order_id, customerId, productId]
            );
            isVerified = orderCheck.rows.length > 0;
        }

        const result = await query(
            `INSERT INTO inventory.reviews
                (customer_id, product_id, order_id, rating, title, body, is_verified_purchase)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (product_id, customer_id) DO UPDATE SET
                rating = EXCLUDED.rating,
                title = EXCLUDED.title,
                body = EXCLUDED.body,
                updated_at = NOW()
             RETURNING *`,
            [customerId, productId, order_id || null, rating, title || null, body || null, isVerified]
        );
        return result.rows[0];
    }

    /**
     * Get all reviews for a product with customer name.
     */
    async getByProduct(productId, { limit = 20, offset = 0, sort = 'recent' } = {}) {
        const orderClause = sort === 'helpful'
            ? 'ORDER BY r.helpful_count DESC, r.created_at DESC'
            : sort === 'highest'
                ? 'ORDER BY r.rating DESC, r.created_at DESC'
                : sort === 'lowest'
                    ? 'ORDER BY r.rating ASC, r.created_at DESC'
                    : 'ORDER BY r.created_at DESC';

        const result = await query(
            `SELECT r.review_id, r.rating, r.title, r.body,
                    r.is_verified_purchase, r.helpful_count,
                    r.created_at, r.updated_at,
                    c.full_name AS reviewer_name
             FROM inventory.reviews r
             JOIN inventory.customers c ON r.customer_id = c.customer_id
             WHERE r.product_id = $1 AND r.is_approved = TRUE
             ${orderClause}
             LIMIT $2 OFFSET $3`,
            [productId, limit, offset]
        );
        return result.rows;
    }

    /**
     * Get rating summary for a product (average, distribution).
     */
    async getRatingSummary(productId) {
        const result = await query(
            `SELECT
                COUNT(*)::INTEGER AS total_reviews,
                ROUND(AVG(rating), 1) AS average_rating,
                COUNT(*) FILTER (WHERE rating = 5)::INTEGER AS five_star,
                COUNT(*) FILTER (WHERE rating = 4)::INTEGER AS four_star,
                COUNT(*) FILTER (WHERE rating = 3)::INTEGER AS three_star,
                COUNT(*) FILTER (WHERE rating = 2)::INTEGER AS two_star,
                COUNT(*) FILTER (WHERE rating = 1)::INTEGER AS one_star
             FROM inventory.reviews
             WHERE product_id = $1 AND is_approved = TRUE`,
            [productId]
        );

        const row = result.rows[0];
        return {
            total_reviews: row.total_reviews || 0,
            average_rating: parseFloat(row.average_rating) || 0,
            distribution: {
                5: row.five_star || 0,
                4: row.four_star || 0,
                3: row.three_star || 0,
                2: row.two_star || 0,
                1: row.one_star || 0,
            },
        };
    }

    /**
     * Get a customer's review for a specific product.
     */
    async getCustomerReview(customerId, productId) {
        const result = await query(
            `SELECT * FROM inventory.reviews
             WHERE customer_id = $1 AND product_id = $2`,
            [customerId, productId]
        );
        return result.rows[0] || null;
    }

    /**
     * Delete a review (customer can delete their own).
     */
    async delete(reviewId, customerId) {
        const result = await query(
            `DELETE FROM inventory.reviews
             WHERE review_id = $1 AND customer_id = $2
             RETURNING *`,
            [reviewId, customerId]
        );
        return result.rows[0] || null;
    }

    /**
     * Increment helpful count (anyone can mark a review as helpful).
     */
    async markHelpful(reviewId) {
        const result = await query(
            `UPDATE inventory.reviews
             SET helpful_count = helpful_count + 1
             WHERE review_id = $1
             RETURNING *`,
            [reviewId]
        );
        return result.rows[0] || null;
    }

    /**
     * Get all reviews by a customer (for profile page).
     */
    async getByCustomer(customerId) {
        const result = await query(
            `SELECT r.*, p.product_name
             FROM inventory.reviews r
             JOIN inventory.products p ON r.product_id = p.product_id
             WHERE r.customer_id = $1
             ORDER BY r.created_at DESC`,
            [customerId]
        );
        return result.rows;
    }
}

module.exports = new ReviewsRepository();
