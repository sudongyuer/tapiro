import type { SFSymbol } from 'sf-symbols-typescript';

import type { PurchasePhase } from '../purchase/types';

export type PurchaseLine = {
  key:
    | 'coins.buy.verifying'
    | 'coins.buy.pending'
    | 'coins.buy.processing'
    | 'coins.buy.succeeded'
    | 'coins.buy.refunded'
    | 'coins.buy.failedPurchase'
    | 'coins.buy.notAllowed';
  body?: 'coins.buy.pendingBody' | 'coins.buy.processingBody';
  icon: SFSymbol | null;
  tone: 'progress' | 'waiting' | 'success' | 'urgent';
};

export function purchaseLine(phase: PurchasePhase): PurchaseLine | null {
  switch (phase.phase) {
    case 'idle':
    case 'buying':
      return null;
    case 'verifying':
      return { key: 'coins.buy.verifying', icon: null, tone: 'progress' };
    case 'pending':
      return {
        key: 'coins.buy.pending',
        body: 'coins.buy.pendingBody',
        icon: 'clock',
        tone: 'waiting',
      };
    case 'processing':
      return {
        key: 'coins.buy.processing',
        body: 'coins.buy.processingBody',
        icon: 'clock',
        tone: 'waiting',
      };
    case 'succeeded':
      return { key: 'coins.buy.succeeded', icon: 'checkmark.circle.fill', tone: 'success' };
    case 'refunded':
      return { key: 'coins.buy.refunded', icon: 'arrow.uturn.backward.circle', tone: 'urgent' };
    case 'failed':
      return {
        key: phase.reason === 'notAllowed' ? 'coins.buy.notAllowed' : 'coins.buy.failedPurchase',
        icon: 'exclamationmark.circle.fill',
        tone: 'urgent',
      };
  }
}
