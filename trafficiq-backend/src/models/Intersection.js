/**
 * Intersection Model
 * Represents a physical traffic intersection along the highway.
 * Stores GeoJSON location, signal phase config, and device linkage.
 */

const mongoose = require('mongoose');

const phaseSchema = new mongoose.Schema({
  phaseId: { type: Number, required: true, min: 0, max: 3 },
  name: { type: String, required: true, trim: true }, // e.g. "North-South Green"
  duration: { type: Number, required: true, min: 5, max: 120 }, // seconds
  direction: { type: String, required: true, enum: ['NS', 'EW', 'NE_SW', 'NW_SE', 'pedestrian'] },
}, { _id: false });

const intersectionSchema = new mongoose.Schema({
  intersectionId: {
    type: String,
    required: [true, 'Intersection ID is required'],
    trim: true,
    match: [/^INT-\d{3}$/, 'Intersection ID must match pattern INT-XXX'],
  },
  name: {
    type: String,
    required: [true, 'Intersection name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters'],
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Coordinates are required'],
      validate: {
        validator: (v) => v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90,
        message: 'Coordinates must be [longitude, latitude] within valid ranges',
      },
    },
  },
  highway: {
    type: String,
    required: [true, 'Highway name is required'],
    trim: true,
    default: 'Ahmedabad-Gandhinagar Highway',
  },
  laneCount: {
    type: Number,
    required: [true, 'Lane count is required'],
    min: [1, 'Lane count must be at least 1'],
    max: [16, 'Lane count cannot exceed 16'],
  },
  phases: {
    type: [phaseSchema],
    validate: {
      validator: (v) => v.length >= 2 && v.length <= 8,
      message: 'Intersection must have between 2 and 8 signal phases',
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  edgeDeviceId: {
    type: String,
    trim: true,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ── Indexes ──────────────────────────────────────────────────────
intersectionSchema.index({ intersectionId: 1 }, { unique: true });
intersectionSchema.index({ location: '2dsphere' });
intersectionSchema.index({ isActive: 1 });

module.exports = mongoose.model('Intersection', intersectionSchema);
