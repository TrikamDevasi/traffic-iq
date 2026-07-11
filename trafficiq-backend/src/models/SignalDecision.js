/**
 * SignalDecision Model
 * Logs every signal phase decision — whether from MARL, fallback, or manual override.
 */

const mongoose = require('mongoose');

const signalDecisionSchema = new mongoose.Schema({
  intersectionId: {
    type: String,
    required: [true, 'Intersection ID is required'],
    trim: true,
  },
  timestamp: {
    type: Date,
    required: [true, 'Timestamp is required'],
    default: Date.now,
  },
  activePhase: {
    type: Number,
    required: [true, 'Active phase is required'],
    min: [0, 'Phase must be between 0 and 3'],
    max: [3, 'Phase must be between 0 and 3'],
  },
  greenDuration: {
    type: Number,
    required: [true, 'Green duration is required'],
    min: [5, 'Duration must be at least 5 seconds'],
    max: [120, 'Duration cannot exceed 120 seconds'],
  },
  qmixReward: {
    type: Number,
    default: 0,
  },
  publicTransportPriority: {
    type: Boolean,
    default: false,
  },
  busDetected: {
    type: Boolean,
    default: false,
  },
  neighborStates: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  decisionSource: {
    type: String,
    required: [true, 'Decision source is required'],
    enum: {
      values: ['MARL', 'FALLBACK', 'MANUAL'],
      message: 'Decision source must be MARL, FALLBACK, or MANUAL',
    },
  },
}, {
  timestamps: true,
});

// ── Indexes ──────────────────────────────────────────────────────
signalDecisionSchema.index({ intersectionId: 1, timestamp: -1 });

module.exports = mongoose.model('SignalDecision', signalDecisionSchema);
