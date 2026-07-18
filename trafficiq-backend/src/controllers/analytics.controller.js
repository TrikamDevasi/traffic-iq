/**
 * Analytics Controller
 * Aggregates traffic trends, congestion heatmap data, and per-intersection KPIs.
 */

const TrafficReading = require('../models/TrafficReading');
const Intersection = require('../models/Intersection');
const ApiResponse = require('../utils/apiResponse');

// -- Traffic Trends ------------------------------------------------
// GET /analytics/trends?period=24h

async function getTrends(req, res, next) {
  try {
    const period = req.query.period || '24h';
    let hours = 24;
    if (period === '7d') hours = 24 * 7;
    else if (period === '1h') hours = 1;
    
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const trends = await TrafficReading.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' },
          },
          avgCongestion: { $avg: '$congestionLevel' },
          avgWaitTime: { $avg: '$averageWaitTime' },
          totalThroughput: { $sum: '$vehicleCount' },
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    return ApiResponse.success(res, 'Traffic trends retrieved', trends);
  } catch (err) {
    next(err);
  }
}

// -- Congestion Heatmap --------------------------------------------
// GET /analytics/heatmap

async function getHeatmap(req, res, next) {
  try {
    // Get the latest reading per intersection for the heatmap
    const since = new Date(Date.now() - 1 * 60 * 60 * 1000); // Only look at last hour
    const heatmap = await TrafficReading.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$intersectionId',
          congestionLevel: { $first: '$congestionLevel' },
          vehicleCount: { $first: '$vehicleCount' },
        }
      }
    ]);
    
    return ApiResponse.success(res, 'Heatmap data retrieved', heatmap);
  } catch (err) {
    next(err);
  }
}

// -- Per-Intersection KPIs -----------------------------------------
// GET /analytics/kpis

async function getKpis(req, res, next) {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const kpis = await TrafficReading.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: '$intersectionId',
          avgWaitTime: { $avg: '$averageWaitTime' },
          avgThroughput: { $avg: '$vehicleCount' },
          maxCongestion: { $max: '$congestionLevel' },
        }
      },
      { $sort: { avgWaitTime: -1 } }
    ]);

    return ApiResponse.success(res, 'Intersection KPIs retrieved', kpis);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTrends,
  getHeatmap,
  getKpis
};
