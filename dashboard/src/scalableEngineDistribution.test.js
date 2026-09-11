import test from 'node:test';
import assert from 'node:assert/strict';

// Helper matching the exact Bell Distribution logic in ScalableEnginePage.jsx
function computeBellData(rawCounts, numSamples = 100) {
  const counts = !rawCounts
    ? { '00': Math.round(numSamples * 1024 / 2), '01': 0, '10': 0, '11': Math.round(numSamples * 1024 / 2) }
    : {
        '00': Number(rawCounts['00'] ?? rawCounts['|00⟩'] ?? 0),
        '01': Number(rawCounts['01'] ?? rawCounts['|01⟩'] ?? 0),
        '10': Number(rawCounts['10'] ?? rawCounts['|10⟩'] ?? 0),
        '11': Number(rawCounts['11'] ?? rawCounts['|11⟩'] ?? 0),
      };

  const totalCounts = counts['00'] + counts['01'] + counts['10'] + counts['11'] || (numSamples * 1024);

  const bases = ['00', '01', '10', '11'];
  const bellData = bases.map((basis) => {
    const count = counts[basis] ?? 0;
    const pct = totalCounts > 0 ? `${((count / totalCounts) * 100).toFixed(1)}%` : '0%';
    const isCorrelated = basis === '00' || basis === '11';
    return {
      basis: `|${basis}⟩`,
      rawBasis: basis,
      count,
      pct,
      fill: isCorrelated ? '#00f2fe' : '#ff1744',
      type: isCorrelated ? 'Correlated Bell State (|Φ⁺⟩)' : 'Error / Anomaly States',
    };
  });

  const max = Math.max(...bellData.map((d) => d.count), 0);
  const maxYValue = max > 0 ? Math.ceil(max * 1.15) : 1000;

  return { counts, totalCounts, bellData, maxYValue };
}

test('Scalable Engine Bell Distribution - Baseline (None, N=100)', () => {
  const rawCounts = { '00': 51162, '01': 0, '10': 0, '11': 51238 };
  const res = computeBellData(rawCounts, 100);

  // Verify all 4 categories exist
  assert.equal(res.bellData.length, 4);
  assert.deepEqual(res.bellData.map(d => d.basis), ['|00⟩', '|01⟩', '|10⟩', '|11⟩']);

  // Verify counts match real data
  assert.equal(res.bellData[0].count, 51162);
  assert.equal(res.bellData[1].count, 0);
  assert.equal(res.bellData[2].count, 0);
  assert.equal(res.bellData[3].count, 51238);

  // Verify colors: Cyan for 00/11, Red for 01/10
  assert.equal(res.bellData[0].fill, '#00f2fe');
  assert.equal(res.bellData[1].fill, '#ff1744');
  assert.equal(res.bellData[2].fill, '#ff1744');
  assert.equal(res.bellData[3].fill, '#00f2fe');

  // Verify dynamic Y-axis headroom (15% above max)
  assert.ok(res.maxYValue > 51238);
  assert.equal(res.maxYValue, Math.ceil(51238 * 1.15));
});

test('Scalable Engine Bell Distribution - Intercept-Resend (Noise and anomaly states present)', () => {
  const rawCounts = { '00': 3000, '01': 1800, '10': 1200, '11': 4000 };
  const res = computeBellData(rawCounts, 10);

  assert.equal(res.bellData.length, 4);
  assert.equal(res.bellData[1].count, 1800);
  assert.equal(res.bellData[2].count, 1200);

  // Colors remain exact
  assert.equal(res.bellData[1].fill, '#ff1744');
  assert.equal(res.bellData[2].fill, '#ff1744');

  // Dynamic Y-axis scales to actual dataset
  assert.equal(res.maxYValue, Math.ceil(4000 * 1.15));
});

test('Scalable Engine Bell Distribution - Forgery Attack (Skewed distribution)', () => {
  const rawCounts = { '00': 10061, '01': 10257, '10': 41000, '11': 41082 };
  const res = computeBellData(rawCounts, 100);

  assert.equal(res.bellData[0].count, 10061);
  assert.equal(res.bellData[1].count, 10257);
  assert.equal(res.bellData[2].count, 41000);
  assert.equal(res.bellData[3].count, 41082);

  // Dynamic domain scales with 15% headroom above max observed count (41082)
  assert.equal(res.maxYValue, Math.ceil(41082 * 1.15));
});

test('Scalable Engine Bell Distribution - Default uninitialized fallback', () => {
  const res = computeBellData(null, 100);

  assert.equal(res.totalCounts, 102400);
  assert.equal(res.bellData[0].count, 51200);
  assert.equal(res.bellData[1].count, 0);
  assert.equal(res.bellData[2].count, 0);
  assert.equal(res.bellData[3].count, 51200);
  assert.equal(res.maxYValue, Math.ceil(51200 * 1.15));
});
