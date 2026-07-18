const mongoose = require('mongoose');
const { getOptimalPhase } = require('./src/services/marl.service');

async function testMarl() {
  await mongoose.connect('mongodb://localhost:27017/trafficiq');
  console.log('Testing ML DOWN (Fallback)...');
  
  const startTime = Date.now();
  const res = await getOptimalPhase('INT-001', [1,2,3,4,5,6,7,8,9,10]);
  const elapsed = Date.now() - startTime;
  
  console.log(`Elapsed: ${elapsed}ms`);
  console.log('Result:', res);
  
  await mongoose.disconnect();
}
testMarl().catch(e => console.error(e));
