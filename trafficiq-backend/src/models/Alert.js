/**
 * Alert Model
 * Tracks traffic and system alerts with severity levels and resolution status.
 */

const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  intersectionId: {
    type: String,
    required: [true, 'Intersection ID is required'],
    trim: true,
  },
  type: {
    type: String,
    required: [true, 'Alert type is required'],
    enum: {
      values: ['congestion', 'incident', 'device_offline', 'high_wait_time'],
      message: 'Type must be congestion, incident, device_offline, or high_wait_time',
    },
  },
  severity: {
    type: String,
    required: [true, 'Severity is required'],
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: 'Severity must be low, medium, high, or critical',
    },
  },
  message: {
    type: String,
    required: [true, 'Alert message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters'],
  },
  isResolved: {
    type: Boolean,
    default: false,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// ── Indexes ──────────────────────────────────────────────────────
alertSchema.index({ intersectionId: 1, isResolved: 1 });
alertSchema.index({ severity: 1, isResolved: 1 });
alertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
