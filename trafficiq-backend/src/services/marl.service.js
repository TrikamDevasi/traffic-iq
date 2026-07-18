const axios = require('axios');
const axiosRetry = require('axios-retry').default || require('axios-retry');
const logger = require('../utils/logger');
const SignalDecision = require('../models/SignalDecision');

const ML_BASE_URL       = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const PREDICT_TIMEOUT   = 3000;
const SIMULATE_TIMEOUT  = 120000;

const mlClient = axios.create({
  baseURL: ML_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

const applyRetry = typeof axiosRetry === 'function' ? axiosRetry : axiosRetry.default;
if (applyRetry) {
  applyRetry(mlClient, {
    retries: 2,
    retryDelay: (retryCount) => retryCount * 500, // 500ms, 1000ms
    shouldResetTimeout: true,
    retryCondition: (error) => {
      // Retry on network errors, timeouts (ECONNABORTED), and 5xx responses
      if (!error.response) return true; // Network error or timeout
      if (error.code === 'ECONNABORTED') return true;
      if (error.response.status >= 500) return true;
      return false; // Do not retry on 4xx
    }
  });
}

async function getOptimalPhase(intersectionId, observationVector, neighborStates) {
  try {
    const { data } = await mlClient.post(
      '/predict',
      { intersectionId, observation_vector: observationVector, neighbor_states: neighborStates || {} },
      { timeout: PREDICT_TIMEOUT }
    );
    logger.debug(`[MarlService] /predict OK for ${intersectionId}: phase=${data.recommended_phase}`);
    return { ...data, source: 'MARL', fallback: false };
  } catch (err) {
    logger.warn(`[MarlService] /predict unreachable for ${intersectionId}: ${err.message} - FALLBACK`);
    
    // Get current phase from DB for safe fallback
    let currentPhase = 0;
    try {
      const latest = await SignalDecision.findOne({ intersectionId }).sort({ timestamp: -1 });
      if (latest) currentPhase = latest.activePhase;
    } catch (e) {
      logger.error(`[MarlService] Failed to query current phase: ${e.message}`);
    }

    return { 
      recommended_phase: currentPhase, 
      green_duration: 30, 
      confidence: 0, 
      bus_priority: false, 
      source: 'FALLBACK',
      fallback: true 
    };
  }
}

async function runSimulation(params) {
  try {
    const { data } = await mlClient.post('/simulate', params, { timeout: SIMULATE_TIMEOUT });
    logger.info(`[MarlService] /simulate completed: scenario=${params.scenario}`);
    return data;
  } catch (err) {
    logger.warn(`[MarlService] /simulate failed: ${err.message}`);
    throw err;
  }
}

async function isMlServiceHealthy() {
  try {
    const { data } = await mlClient.get('/health', { timeout: 3000 });
    return data.status === 'healthy';
  } catch {
    return false;
  }
}

module.exports = { getOptimalPhase, runSimulation, isMlServiceHealthy };
