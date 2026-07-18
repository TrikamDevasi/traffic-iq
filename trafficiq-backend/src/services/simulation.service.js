/**
 * Simulation Service
 * Orchestrates a full SimulationRun lifecycle:
 *   1. Generate a unique runId
 *   2. Persist SimulationRun with status: 'running'
 *   3. Call marl.service.runSimulation (sync or async depending on duration)
 *   4. Update SimulationRun with results and status: 'completed' | 'failed'
 */

const { v4: uuidv4 } = require('uuid');
const SimulationRun = require('../models/SimulationRun');
const Intersection = require('../models/Intersection');
const { runSimulation } = require('./marl.service');
const logger = require('../utils/logger');

async function startSimulation({ scenario, duration, controllerType, comparedTo }) {
  const intersections = await Intersection.find({ isActive: true }, { intersectionId: 1 }).lean();
  const totalIntersections = intersections.length;
  const runId = `SIM-${uuidv4().slice(0, 8).toUpperCase()}`;

  const run = await SimulationRun.create({
    runId,
    scenario,
    totalIntersections,
    duration,
    comparedTo: comparedTo || 'fixed-time',
    status: 'running',
    startedAt: new Date(),
  });

  logger.info(`[SimulationService] Run ${runId} started: scenario=${scenario}, duration=${duration}s, controller=${controllerType}`);

  try {
    const mlResult = await runSimulation({
      scenario,
      duration,
      controller_type: controllerType || 'MARL',
      intersections: intersections.map((i) => i.intersectionId),
    });

    run.avgWaitTimeReduction   = mlResult.avg_wait_time_reduction    ?? mlResult.avg_wait_time    ?? 0;
    run.avgTravelTimeReduction = mlResult.avg_travel_time_reduction   ?? mlResult.avg_travel_time  ?? 0;
    run.busSpeedImprovement    = mlResult.bus_speed_improvement       ?? mlResult.bus_speed        ?? 0;
    run.status      = 'completed';
    run.completedAt = new Date();
    await run.save();

    logger.info(`[SimulationService] Run ${runId} completed.`);
    return run;
  } catch (err) {
    run.status = 'failed';
    run.completedAt = new Date();
    await run.save();
    logger.error(`[SimulationService] Run ${runId} failed: ${err.message}`);
    throw err;
  }
}

async function getRunById(runId) {
  return SimulationRun.findOne({ runId });
}

async function listRuns({ page = 1, limit = 10, status } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const [runs, total] = await Promise.all([
    SimulationRun.find(filter)
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SimulationRun.countDocuments(filter),
  ]);
  return { runs, total };
}

async function getLatestRun() {
  return SimulationRun.findOne({ status: 'completed' }).sort({ completedAt: -1 });
}

module.exports = { startSimulation, getRunById, listRuns, getLatestRun };
