/**
 * AuditLog Model
 * Records all mutating actions for compliance and debugging.
 * Flexible details field uses Mixed type for arbitrary metadata.
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    maxlength: [200, 'Action cannot exceed 200 characters'],
  },
  resource: {
    type: String,
    required: [true, 'Resource is required'],
    trim: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ip: {
    type: String,
    trim: true,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// ── Indexes ──────────────────────────────────────────────────────
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // TTL: 90 days

module.exports = mongoose.model('AuditLog', auditLogSchema);
