/**
 * Seed Data Script
 * Inserts 12 intersections along the Ahmedabad-Gandhinagar Highway
 * with realistic coordinates, lane counts, and default phase configs.
 *
 * Usage: node src/utils/seedData.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Intersection = require('../models/Intersection');

const PHASE_TEMPLATES = [
  { phaseId: 0, name: 'North-South Green', duration: 30, direction: 'NS' },
  { phaseId: 1, name: 'East-West Green', duration: 30, direction: 'EW' },
  { phaseId: 2, name: 'NE-SW Green', duration: 20, direction: 'NE_SW' },
  { phaseId: 3, name: 'Pedestrian Crossing', duration: 15, direction: 'pedestrian' },
];

/**
 * 12 intersections along the Ahmedabad-Gandhinagar Highway (SG Highway corridor).
 * Coordinates are [longitude, latitude] — GeoJSON order.
 * Spaced ~1.5–2km apart from south (Ahmedabad) to north (Gandhinagar).
 */
const INTERSECTIONS = [
  {
    intersectionId: 'INT-001',
    name: 'AH-GN Highway Junction 1 — Memnagar Circle',
    location: { type: 'Point', coordinates: [72.5358, 23.0365] },
    laneCount: 6,
    edgeDeviceId: 'EDGE-001',
  },
  {
    intersectionId: 'INT-002',
    name: 'AH-GN Highway Junction 2 — Ambli Overpass',
    location: { type: 'Point', coordinates: [72.5412, 23.0520] },
    laneCount: 8,
    edgeDeviceId: 'EDGE-002',
  },
  {
    intersectionId: 'INT-003',
    name: 'AH-GN Highway Junction 3 — Sola Bridge Road',
    location: { type: 'Point', coordinates: [72.5475, 23.0680] },
    laneCount: 6,
    edgeDeviceId: 'EDGE-003',
  },
  {
    intersectionId: 'INT-004',
    name: 'AH-GN Highway Junction 4 — Thaltej Crossroads',
    location: { type: 'Point', coordinates: [72.5530, 23.0835] },
    laneCount: 8,
    edgeDeviceId: 'EDGE-004',
  },
  {
    intersectionId: 'INT-005',
    name: 'AH-GN Highway Junction 5 — Science City Road',
    location: { type: 'Point', coordinates: [72.5595, 23.0990] },
    laneCount: 6,
    edgeDeviceId: 'EDGE-005',
  },
  {
    intersectionId: 'INT-006',
    name: 'AH-GN Highway Junction 6 — SG Highway Junction',
    location: { type: 'Point', coordinates: [72.5658, 23.1145] },
    laneCount: 8,
    edgeDeviceId: 'EDGE-006',
  },
  {
    intersectionId: 'INT-007',
    name: 'AH-GN Highway Junction 7 — Koba Circle',
    location: { type: 'Point', coordinates: [72.5720, 23.1300] },
    laneCount: 6,
    edgeDeviceId: 'EDGE-007',
  },
  {
    intersectionId: 'INT-008',
    name: 'AH-GN Highway Junction 8 — Rancharda Cross',
    location: { type: 'Point', coordinates: [72.5800, 23.1455] },
    laneCount: 4,
    edgeDeviceId: 'EDGE-008',
  },
  {
    intersectionId: 'INT-009',
    name: 'AH-GN Highway Junction 9 — Adalaj Pipeline Road',
    location: { type: 'Point', coordinates: [72.5885, 23.1610] },
    laneCount: 6,
    edgeDeviceId: 'EDGE-009',
  },
  {
    intersectionId: 'INT-010',
    name: 'AH-GN Highway Junction 10 — Dahegam Bypass',
    location: { type: 'Point', coordinates: [72.5960, 23.1765] },
    laneCount: 6,
    edgeDeviceId: 'EDGE-010',
  },
  {
    intersectionId: 'INT-011',
    name: 'AH-GN Highway Junction 11 — Pethapur Junction',
    location: { type: 'Point', coordinates: [72.6050, 23.1920] },
    laneCount: 4,
    edgeDeviceId: 'EDGE-011',
  },
  {
    intersectionId: 'INT-012',
    name: 'AH-GN Highway Junction 12 — Gandhinagar Sector 7',
    location: { type: 'Point', coordinates: [72.6135, 23.2075] },
    laneCount: 8,
    edgeDeviceId: 'EDGE-012',
  },
];

async function seed() {
  try {
    console.log('[SEED] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[SEED] Connected to MongoDB');

    // Check if data already exists
    const count = await Intersection.countDocuments();
    if (count > 0) {
      console.log(`[SEED] Database already has ${count} intersections. Clearing...`);
      await Intersection.deleteMany({});
    }

    // Prepare documents with phase configs
    const docs = INTERSECTIONS.map((ix) => ({
      ...ix,
      phases: PHASE_TEMPLATES.map((p) => ({ ...p })),
      isActive: true,
    }));

    const result = await Intersection.insertMany(docs);
    console.log(`[SEED] Inserted ${result.length} intersections along AH-GN Highway:`);
    result.forEach((ix) => {
      console.log(`  ✓ ${ix.intersectionId}: ${ix.name} (${ix.location.coordinates})`);
    });

    console.log('\n[SEED] Seeding complete!');
  } catch (err) {
    console.error(`[SEED] Error: ${err.message}`);
    if (err.code === 11000) {
      console.error('[SEED] Duplicate key error — check intersectionId uniqueness');
    }
  } finally {
    await mongoose.disconnect();
    console.log('[SEED] Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  seed();
}

module.exports = { INTERSECTIONS, PHASE_TEMPLATES, seed };
