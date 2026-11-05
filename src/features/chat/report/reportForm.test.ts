import { describe, expect, test } from 'bun:test';

import { REPORT_NOTE_MAX } from '../types';
import { canSubmit, noteCount, reportInput } from './reportForm';

describe('report form', () => {
  test('needs a reason before it can be submitted', () => {
    expect(canSubmit(null, '', 'form')).toBe(false);
    expect(canSubmit('harassment', '', 'form')).toBe(true);
  });

  test('cannot be submitted twice while one is in flight or after it went through', () => {
    expect(canSubmit('other', '', 'sending')).toBe(false);
    expect(canSubmit('other', '', 'sent')).toBe(false);
    expect(canSubmit('other', '', 'failed')).toBe(true);
  });

  test('counts the note by characters the user sees, after trimming', () => {
    expect(noteCount('  🚗📦  ')).toBe(2);
    const full = '字'.repeat(REPORT_NOTE_MAX);
    expect(canSubmit('other', full, 'form')).toBe(true);
    expect(canSubmit('other', `${full}字`, 'form')).toBe(false);
  });

  test('sends an empty note as none and keeps the message it is about', () => {
    expect(reportInput({ userId: 'u', messageId: 'm' }, 'off_platform_payment', '   ')).toEqual({
      userId: 'u',
      messageId: 'm',
      reason: 'off_platform_payment',
      note: null,
    });
    expect(reportInput({ userId: 'u', messageId: null }, 'other', ' 他一直催 ').note).toBe(
      '他一直催',
    );
  });
});
