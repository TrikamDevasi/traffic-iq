/**
 * SimulationRun Model
 * Tracks SUMO simulation runs with their configuration and results.
 */

const mongoose = require('mongoose');

const simulationRunSchema = new mongoose.Schema({
  runId: {
    type: String,
    required: [true, 'Run ID is required'],
    unique: true,
    trim: true,
  },
  scenario: {
    type: String,
    required: [true, 'Scenario name is required'],
    trim: true,
  },
  totalIntersections: {
    type: Number,
    required: [true, 'Total intersections count is required'],
    min: [1, 'Must have at least 1 intersection'],
  },
  duration: {
    type: Number,
    required: [true, 'Simulation duration is required'],
    min: [1, 'Duration must be at least 1 second'],
  },
  avgWaitTimeReduction: {
    type: Number,
    default: 0,
    min: 0,
  },
  avgTravelTimeReduction: {
    type: Number,
    default: 0,
    min: 0,
  },
  busSpeedImprovement: {
    type: Number,
    default: 0,
    min: 0,
  },
  comparedTo: {
    type: String,
    required: [true, 'Comparison baseline is required'],
    enum: {
      values: ['fixed-time', 'DQN', 'actuated'],
      message: 'Compared to must be fixed-time, DQN, or actuated',
    },
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: ['running', 'completed', 'failed'],
      message: 'Status must be running, completed, or failed',
    },
    default: 'running',
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('SimulationRun', simulationRunSchema);
