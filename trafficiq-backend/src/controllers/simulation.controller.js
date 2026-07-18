  /**
 * Simulation Controller
 * Triggers SUMO simulation runs, polls status, retrieves history and results.
 * Run is operator+; reads are viewer+.
 */

const { startSimulation, getRunById, listRuns, getLatestRun } = require('../services/simulation.service');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

// -- Run a simulation (operator+) ----------------------------------
// POST /simulations/run
// body: { scenario, duration, controllerType, comparedTo }

async function runSimulationCtrl(req, res, next) {
  try {
    const {
      scenario      = 'Ahmedabad-GN Highway',
      duration      = 600,
      controllerType = 'MARL',
      comparedTo    = 'fixed-time',
    } = req.body;

    const safeDuration = Math.min(3600, Math.max(60, parseInt(duration, 10)));

    if (!['fixed-time', 'DQN', 'actuated'].includes(comparedTo)) {
      return ApiResponse.error(res, 'comparedTo must be fixed-time, DQN, or actuated', 400);
    }

    logger.info(`[SimCtrl] Run triggered by user ${req.user.id}: scenario=${scenario}, duration=${safeDuration}s`);

    // Fire-and-forget for long simulations � return 202 immediately
    // For short runs (<=300s) we wait and return 201.
    if (safeDuration <= 300) {
      const run = await startSimulation({ scenario, duration: safeDuration, controllerType, comparedTo });
      return ApiResponse.success(res, 'Simulation completed', run, 201);
    }

    // Long run � create initial record synchronously, then run async
    const SimulationRun = require('../models/SimulationRun');
    const { v4: uuidv4 } = require('uuid');
    const runId = `SIM-${uuidv4().slice(0, 8).toUpperCase()}`;
    const run = await SimulationRun.create({
      runId, scenario, totalIntersections: 12, duration: safeDuration,
      comparedTo, status: 'running', startedAt: new Date(),
    });

    // Kick off async � does not block response
    startSimulation({ scenario, duration: safeDuration, controllerType, comparedTo })
      .catch((err) => logger.error(`[SimCtrl] Async run ${runId} failed: ${err.message}`));

    return ApiResponse.success(
      res,
      'Simulation started � poll GET /simulations/:runId for results',
      { runId, status: 'running' },
      202,
    );
  } catch (err) {
    next(err);
  }
}

// -- List runs (viewer+) -------------------------------------------
// GET /simulations?status=completed&page=1&limit=10

async function listRunsCtrl(req, res, next) {
  try {
    const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit  = Math.min(50, parseInt(req.query.limit, 10) || 10);
    const status = req.query.status;

    const { runs, total } = await listRuns({ page, limit, status });
    return ApiResponse.paginated(res, 'Simulation runs retrieved', runs, { page, limit, total });
  } catch (err) {
    next(err);
  }
}

// -- Get single run ------------------------------------------------
// GET /simulations/:runId

async function getRunCtrl(req, res, next) {
  try {
    const run = await getRunById(req.params.runId);
    if (!run) return ApiResponse.error(res, `Run ${req.params.runId} not found`, 404);
    return ApiResponse.success(res, 'Simulation run retrieved', run);
  } catch (err) {
    next(err);
  }
}

// -- Get latest completed run --------------------------------------
// GET /simulations/latest

async function getLatestCtrl(req, res, next) {
  try {
    const run = await getLatestRun();
    if (!run) return ApiResponse.error(res, 'No completed simulation runs found', 404);
    return ApiResponse.success(res, 'Latest simulation run retrieved', run);
  } catch (err) {
    next(err);
  }
}

module.exports = { runSimulationCtrl, listRunsCtrl, getRunCtrl, getLatestCtrl };
