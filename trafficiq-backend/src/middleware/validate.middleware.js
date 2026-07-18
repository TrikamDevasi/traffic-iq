/**
 * Validation Middleware (Joi)
 * Generic validate(schema, source) factory.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), authController.register)
 *
 * Validates req.body by default; pass 'query' or 'params' for other sources.
 */

const Joi = require('joi');
const ApiResponse = require('../utils/apiResponse');

// -- Reusable Joi schemas ------------------------------------------

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 100 characters',
    'any.required': 'Name is required',
  }),
  email: Joi.string().trim().email().lowercase().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[0-9])(?=.*[!@#$%^&*])/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one number and one special character',
      'any.required': 'Password is required',
    }),
  role: Joi.string().valid('viewer', 'operator').default('viewer').messages({
    'any.only': 'Role must be viewer or operator',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().lowercase().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

// -- Factory -------------------------------------------------------

/**
 * Returns an Express middleware that validates the request against a Joi schema.
 * On failure, responds with 422 and a list of error messages.
 *
 * @param {import('joi').ObjectSchema} schema
 * @param {'body'|'query'|'params'} [source='body']
 * @returns {import('express').RequestHandler}
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return ApiResponse.error(res, 'Validation failed', 422, messages);
    }

    req[source] = value;
    next();
  };
}

module.exports = {
  validate,
  schemas: {
    register: registerSchema,
    login: loginSchema,
  },
};
