/**
 * API Response Helper
 * Provides a consistent { success, message, data } envelope for all responses.
 * Use ApiResponse.success() and ApiResponse.error() to send standardized replies.
 */

class ApiResponse {
  /**
   * Send a successful response.
   * @param {import('express').Response} res
   * @param {string} message
   * @param {*} [data]
   * @param {number} [statusCode=200]
   */
  static success(res, message, data = null, statusCode = 200) {
    const body = {
      success: true,
      message,
    };

    if (data !== null && data !== undefined) {
      body.data = data;
    }

    return res.status(statusCode).json(body);
  }

  /**
   * Send an error response.
   * @param {import('express').Response} res
   * @param {string} message
   * @param {number} [statusCode=500]
   * @param {*} [errors] — optional validation errors or debug info
   */
  static error(res, message, statusCode = 500, errors = null) {
    const body = {
      success: false,
      message,
    };

    if (errors !== null && errors !== undefined) {
      body.errors = errors;
    }

    return res.status(statusCode).json(body);
  }

  /**
   * Send a paginated success response.
   * @param {import('express').Response} res
   * @param {string} message
   * @param {Array} items
   * @param {{ page: number, limit: number, total: number }} pagination
   */
  static paginated(res, message, items, pagination) {
    return res.status(200).json({
      success: true,
      message,
      data: items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
      },
    });
  }
}

module.exports = ApiResponse;
