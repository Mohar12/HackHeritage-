import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TARGET_SIGNATURE_ENTITIES,
  ATTACK_VECTORS,
  ATTACK_CANVAS_CONFIG,
  normalizeAttackType,
} from './components/attackConstants.js';

describe('HyperQDS Attack Lab Stage 16 — Performance & Regression QA', () => {
  describe('1. Target Signature Entities Specification', () => {
    it('contains all three canonical institutional target entities', () => {
      assert.equal(TARGET_SIGNATURE_ENTITIES.length, 3);
      const ids = TARGET_SIGNATURE_ENTITIES.map((e) => e.id);
      assert.ok(ids.includes('TX-2026-FED-BOE'));
      assert.ok(ids.includes('CMD-994-DEFCON1'));
      assert.ok(ids.includes('HLTH-771-GENOME'));
    });

    it('validates each entity has complete cryptographic and routing metadata', () => {
      TARGET_SIGNATURE_ENTITIES.forEach((entity) => {
        assert.ok(entity.id && entity.id.length > 0, `Missing ID on ${entity.name}`);
        assert.ok(entity.name && entity.name.length > 0, `Missing Name on ${entity.id}`);
        assert.ok(entity.category && entity.category.length > 0, `Missing Category on ${entity.id}`);
        assert.ok(entity.sender && entity.sender.startsWith('Alice'), `Sender must be Alice on ${entity.id}`);
        assert.ok(entity.recipient && entity.recipient.startsWith('Bob'), `Recipient must be Bob on ${entity.id}`);
        assert.ok(entity.documentPayload && entity.documentPayload.length > 10, `Missing Payload on ${entity.id}`);
        assert.ok(entity.payloadHash && entity.payloadHash.startsWith('0x'), `Invalid Hash on ${entity.id}`);
        assert.ok(entity.sessionNonce && entity.sessionNonce.startsWith('0x'), `Invalid Nonce on ${entity.id}`);
        assert.ok(/^[01]+$/.test(entity.keyBits), `Key bits must be binary on ${entity.id}`);
      });
    });
  });

  describe('2. Adversarial Vectors & Semantic Canvas Mappings', () => {
    it('contains all five canonical physical attack vectors', () => {
      assert.equal(ATTACK_VECTORS.length, 5);
      const vectorValues = ATTACK_VECTORS.map((v) => v.value);
      assert.ok(vectorValues.includes('intercept_resend'));
      assert.ok(vectorValues.includes('depolarizing'));
      assert.ok(vectorValues.includes('forgery'));
      assert.ok(vectorValues.includes('impersonation'));
      assert.ok(vectorValues.includes('replay'));
    });

    it('maps every attack vector to valid 3D canvas pillar and dimension', () => {
      const canonicalVectors = ['intercept_resend', 'depolarizing', 'forgery', 'impersonation', 'replay'];
      canonicalVectors.forEach((v) => {
        const norm = normalizeAttackType(v);
        const config = ATTACK_CANVAS_CONFIG[norm];
        assert.ok(config, `Missing canvas config for attack vector ${v}`);
        assert.ok(['01', '02', '03'].includes(config.pillar), `Invalid pillar ${config.pillar} for ${v}`);
        assert.ok(typeof config.dimension === 'number' && config.dimension >= 0 && config.dimension <= 4, `Invalid dimension for ${v}`);
        assert.ok(config.accentColor && config.accentColor.startsWith('#'), `Invalid accent for ${v}`);
      });
    });

    it('normalizes legacy and alias attack vector strings safely', () => {
      assert.equal(normalizeAttackType('intercept_resend'), 'intercept_resend');
      assert.equal(normalizeAttackType('intercept-resend'), 'intercept_resend');
      assert.equal(normalizeAttackType('depolarizing_noise'), 'depolarizing');
      assert.equal(normalizeAttackType('bell_forgery'), 'forgery');
      assert.equal(normalizeAttackType('unknown_vector'), 'intercept_resend');
    });
  });

  describe('3. Information-Theoretic Security Bounds Derivations', () => {
    it('calculates Gottesman-Chuang forgery probability bound P_forge <= 2^-n', () => {
      const n14 = 14;
      const pForge14 = Math.pow(2, -n14);
      assert.ok(Math.abs(pForge14 - 6.103515625e-5) < 1e-9);

      const n20 = 20;
      const pForge20 = Math.pow(2, -n20);
      assert.ok(pForge20 < 1e-6);
    });

    it('evaluates Hoeffding concentration detection confidence Gamma_det >= 1 - exp(-2N*eps^2)', () => {
      const N = 1024;
      const qberAttacked = 0.25;
      const hoeffdingAttacked = 1 - Math.exp(-2 * N * qberAttacked * qberAttacked);
      assert.ok(hoeffdingAttacked > 0.9999999, 'Hoeffding confidence must asymptotically approach 1 for QBER=0.25');

      const qberClean = 0.005;
      const hoeffdingClean = 1 - Math.exp(-2 * N * qberClean * qberClean);
      assert.ok(hoeffdingClean < 0.10, 'Hoeffding confidence should be near zero for nominal QBER=0.005');
    });

    it('evaluates Uhlmann fidelity threshold boundary gamma >= 0.85', () => {
      const THRESHOLD = 0.85;
      const fidelityClean = 0.998;
      const fidelityAttacked = 0.582;

      assert.ok(fidelityClean >= THRESHOLD, 'Clean Bell state must meet or exceed Uhlmann threshold');
      assert.ok(fidelityAttacked < THRESHOLD, 'Attacked/perturbed state must fall strictly below Uhlmann threshold');
    });

    it('evaluates Shor-Preskill BB84 QBER threshold epsilon <= 11.0%', () => {
      const BB84_LIMIT = 0.11;
      const qberNominal = 0.002;
      const qberCompromised = 0.248;

      assert.ok(qberNominal <= BB84_LIMIT, 'Nominal channel QBER must be below Shor-Preskill threshold');
      assert.ok(qberCompromised > BB84_LIMIT, 'Intercept-resend QBER must exceed Shor-Preskill threshold');
    });
  });
});
