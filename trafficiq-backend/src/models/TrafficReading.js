/**
 * TrafficReading Model
 * Stores a single vehicle detection reading from an intersection's edge device.
 * TTL index auto-expires documents after 30 days.
 */

const mongoose = require('mongoose');

const vehicleCountsSchema = new mongoose.Schema({
  cars: { type: Number, required: true, min: 0, default: 0 },
  buses: { type: Number, required: true, min: 0, default: 0 },
  trucks: { type: Number, required: true, min: 0, default: 0 },
  motorcycles: { type: Number, required: true, min: 0, default: 0 },
  total: { type: Number, required: true, min: 0, default: 0 },
}, { _id: false });

const trafficReadingSchema = new mongoose.Schema({
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
  vehicleCounts: {
    type: vehicleCountsSchema,
    required: [true, 'Vehicle counts are required'],
  },
  queueLength: {
    type: Number,
    required: [true, 'Queue length is required'],
    min: [0, 'Queue length cannot be negative'],
  },
  averageWaitTime: {
    type: Number,
    required: [true, 'Average wait time is required'],
    min: [0, 'Wait time cannot be negative'],
  },
  detectionConfidence: {
    type: Number,
    required: [true, 'Detection confidence is required'],
    min: [0, 'Confidence must be between 0 and 1'],
    max: [1, 'Confidence must be between 0 and 1'],
  },
  inferenceTimeMs: {
    type: Number,
    required: [true, 'Inference time is required'],
    min: [0, 'Inference time cannot be negative'],
  },
}, {
  timestamps: true,
});

// ── Indexes ──────────────────────────────────────────────────────
trafficReadingSchema.index({ intersectionId: 1, timestamp: -1 });
trafficReadingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // TTL: 30 days

module.exports = mongoose.model('TrafficReading', trafficReadingSchema);
