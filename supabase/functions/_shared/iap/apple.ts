import { compactVerify, decodeProtectedHeader, importX509 } from 'npm:jose@6.2.16';
import jsrsasign from 'npm:jsrsasign@11.1.5';

import type { IapConfig, IapEnvironment } from './config.ts';
import {
  decodeJwsPayload,
  toVerifiedNotification,
  toVerifiedTransaction,
  VerifyError,
  type NotificationVerifier,
  type TransactionVerifier,
} from './jws.ts';

// Mirrors SignedDataVerifier.verifyJWT and verifyCertificateChain from Apple's App Store Server Library 3.1.0 with
// online checks off. The library itself cannot run here: the Supabase Edge Runtime does not implement
// X509Certificate.prototype.toString or .raw, which its chain check calls. apple.deno-test.ts runs both on the same
// fixtures and requires the same verdicts.
const LEAF_OID = '1.2.840.113635.100.6.11.1';
const INTERMEDIATE_OID = '1.2.840.113635.100.6.2.1';
const MAX_SKEW_MS = 60_000;

type Certificate = InstanceType<typeof jsrsasign.X509>;

const fail = (reason: string): never => {
  throw new VerifyError(false, reason);
};

function readCertificate(der: string): Certificate {
  const certificate = new jsrsasign.X509();
  certificate.readCertHex(jsrsasign.b64tohex(der));
  return certificate;
}

function pem(der: string) {
  return `-----BEGIN CERTIFICATE-----\n${der}\n-----END CERTIFICATE-----\n`;
}

function withinDates(certificate: Certificate, at: number) {
  const from = jsrsasign.zulutodate(certificate.getNotBefore()).getTime();
  const to = jsrsasign.zulutodate(certificate.getNotAfter()).getTime();
  return from <= at + MAX_SKEW_MS && to >= at - MAX_SKEW_MS;
}

function chainHolds(
  roots: Certificate[],
  leaf: Certificate,
  intermediate: Certificate,
  at: number,
) {
  const root = roots.find(
    (candidate) =>
      intermediate.verifySignature(candidate.getPublicKey()) &&
      intermediate.getIssuerString() === candidate.getSubjectString(),
  );
  return (
    root !== undefined &&
    leaf.verifySignature(intermediate.getPublicKey()) &&
    leaf.getIssuerString() === intermediate.getSubjectString() &&
    intermediate.getExtBasicConstraints()?.cA === true &&
    leaf.getExtInfo(LEAF_OID) !== undefined &&
    intermediate.getExtInfo(INTERMEDIATE_OID) !== undefined &&
    withinDates(leaf, at) &&
    withinDates(intermediate, at) &&
    withinDates(root, at)
  );
}

async function verifiedPayload(
  jws: string,
  environment: IapEnvironment,
  roots: Certificate[],
): Promise<Record<string, unknown>> {
  const payload = decodeJwsPayload(jws) ?? fail('undecodable');
  if (environment === 'Xcode' || environment === 'LocalTesting') return payload;
  let chain: unknown;
  try {
    chain = decodeProtectedHeader(jws).x5c;
  } catch {
    return fail('invalid_header');
  }
  if (!Array.isArray(chain) || chain.length !== 3 || !chain.every((c) => typeof c === 'string')) {
    return fail('invalid_chain_length');
  }
  let leaf: Certificate;
  let intermediate: Certificate;
  try {
    leaf = readCertificate(chain[0]);
    intermediate = readCertificate(chain[1]);
  } catch {
    return fail('invalid_certificate');
  }
  const signedAt = typeof payload.signedDate === 'number' ? payload.signedDate : Date.now();
  let holds = false;
  try {
    holds = chainHolds(roots, leaf, intermediate, signedAt);
  } catch {
    holds = false;
  }
  if (!holds) fail('chain_rejected');
  try {
    const key = await importX509(pem(chain[0]), 'ES256');
    await compactVerify(jws, key, { algorithms: ['ES256'] });
  } catch {
    fail('signature_rejected');
  }
  return payload;
}

export function appleVerifiers(
  config: IapConfig,
  rootsDer: string[],
): { transaction: TransactionVerifier; notification: NotificationVerifier } {
  const roots = rootsDer.map(readCertificate);
  const accept = (environment: IapEnvironment) => {
    if (!config.accepted.has(environment)) fail('environment_not_accepted');
  };
  return {
    async transaction(jws, environment) {
      accept(environment);
      const transaction = toVerifiedTransaction(await verifiedPayload(jws, environment, roots));
      if (transaction.bundleId !== config.bundleId) fail('invalid_app_identifier');
      if (transaction.environment !== environment) fail('invalid_environment');
      return transaction;
    },
    async notification(jws, environment) {
      accept(environment);
      const decoded = await verifiedPayload(jws, environment, roots);
      const data = (decoded.data ?? {}) as Record<string, unknown>;
      if (
        data.bundleId !== config.bundleId ||
        (environment === 'Production' && data.appAppleId !== config.appAppleId)
      ) {
        fail('invalid_app_identifier');
      }
      const notification = toVerifiedNotification(decoded);
      if (notification.environment !== environment) fail('invalid_environment');
      return notification;
    },
  };
}
