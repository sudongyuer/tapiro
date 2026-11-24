import { describe, expect, test } from 'bun:test';

import type { ReceiptReadOutcome } from '@/lib/drafts/receiptDraft';

import {
  canRead,
  fillFromReading,
  IDLE_READ,
  isReading,
  readNote,
  type ReadNote,
} from './receiptRead';
import { emptySplit, type SplitDraft } from './splitDraft';

const URI = 'file:///receipt.jpg';
const READ: ReceiptReadOutcome = { kind: 'read', total: { minor: 7400, currency: 'MYR' } };
const withReceipt = (change: Partial<SplitDraft> = {}): SplitDraft => ({
  ...emptySplit(),
  receipt: { status: 'picked', uri: URI },
  ...change,
});

describe('小貘 reading the receipt into the split', () => {
  test('a read total fills an untouched total in the device decimal and says so', () => {
    const tapped = withReceipt();
    const { draft, read } = fillFromReading(tapped, tapped, URI, READ, ',');
    expect(draft?.totalText).toBe('74,00');
    expect(readNote(read, draft!)).toEqual({ kind: 'filled', amount: READ.total });
    expect(canRead(read, draft!)).toBe(false);
  });

  test('a total typed while 小貘 read stays, and the note names what was read', () => {
    const tapped = withReceipt();
    const latest = withReceipt({ totalText: '80' });
    const { draft, read } = fillFromReading(tapped, latest, URI, READ, '.');
    expect(draft).toBeNull();
    expect(readNote(read, latest)).toEqual({ kind: 'kept', amount: READ.total });
  });

  test('a filled total the organiser changed afterwards is no longer called 小貘’s', () => {
    const tapped = withReceipt();
    const { draft, read } = fillFromReading(tapped, tapped, URI, READ, '.');
    expect(readNote(read, { ...draft!, totalText: '75.00' })?.kind).toBe('kept');
  });

  test('a receipt removed or swapped while reading is not filled from', () => {
    const tapped = withReceipt();
    for (const latest of [
      { ...tapped, receipt: { status: 'none' as const } },
      { ...tapped, receipt: { status: 'picked' as const, uri: 'file:///other.jpg' } },
      null,
    ]) {
      expect(fillFromReading(tapped, latest, URI, READ, '.').draft).toBeNull();
    }
    const swapped = withReceipt({ receipt: { status: 'picked', uri: 'file:///other.jpg' } });
    const { read } = fillFromReading(tapped, swapped, URI, READ, '.');
    expect(readNote(read, swapped)).toEqual({ kind: 'offer' });
    expect(canRead(read, swapped)).toBe(true);
  });

  test('an uploaded receipt keeps its picked image to read', () => {
    const uploaded = withReceipt({ receipt: { status: 'uploaded', uri: URI, path: 'r/1.jpg' } });
    expect(fillFromReading(uploaded, uploaded, URI, READ, '.').draft?.totalText).toBe('74.00');
  });

  test.each<[string, ReceiptReadOutcome, ReadNote['kind'], boolean]>([
    ['nothing read', { kind: 'unreadable' }, 'unreadable', true],
    [
      'another currency',
      { kind: 'otherCurrency', total: { minor: 12000, currency: 'CNY' } },
      'otherCurrency',
      true,
    ],
    ['a hungry 小貘', { kind: 'failed', reason: 'hungry' }, 'failed', true],
    ['a declined consent', { kind: 'declined' }, 'offer', true],
  ])('%s fills nothing and leaves the manual total', (_name, outcome, note, again) => {
    const tapped = withReceipt();
    const { draft, read } = fillFromReading(tapped, tapped, URI, outcome, '.');
    expect(draft).toBeNull();
    expect(readNote(read, tapped)?.kind).toBe(note);
    expect(canRead(read, tapped)).toBe(again);
  });

  test('no receipt, no offer; reading shows only for the receipt being read', () => {
    expect(readNote(IDLE_READ, emptySplit())).toBeNull();
    expect(canRead(IDLE_READ, emptySplit())).toBe(false);
    expect(readNote(IDLE_READ, withReceipt())).toEqual({ kind: 'offer' });
    const reading = { status: 'reading' as const, uri: URI };
    expect(isReading(reading, withReceipt())).toBe(true);
    expect(canRead(reading, withReceipt())).toBe(false);
    expect(isReading(reading, emptySplit())).toBe(false);
  });
});
