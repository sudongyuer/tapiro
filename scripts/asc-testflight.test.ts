import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  addToGroupRequest,
  buildsPath,
  DEFAULT_NOTES,
  describeErrors,
  groupMembershipPath,
  inGroup,
  localizationRequests,
  parseWhatToTest,
  pickBuild,
  reviewState,
  submissionRequest,
} from './asc-testflight.mjs';

const notes = { 'zh-Hans': '请试试悬赏', 'en-US': 'Try a bounty' };

describe('What to Test text', () => {
  test('sections give each locale its own text', () => {
    expect(parseWhatToTest('[zh-Hans]\n请试试悬赏\n\n[en-US]\nTry a bounty\n')).toEqual(notes);
  });

  test('text without sections goes to both locales', () => {
    expect(parseWhatToTest('  Try a bounty\n')).toEqual({
      'zh-Hans': 'Try a bounty',
      'en-US': 'Try a bounty',
    });
  });

  test('a missing or empty locale is refused', () => {
    expect(() => parseWhatToTest('[zh-Hans]\n请试试悬赏\n')).toThrow('en-US');
    expect(() => parseWhatToTest('[zh-Hans]\n\n[en-US]\nTry\n')).toThrow('zh-Hans');
    expect(() => parseWhatToTest('   ')).toThrow();
  });

  test('the default file has text for both locales', () => {
    const parsed = parseWhatToTest(readFileSync(DEFAULT_NOTES, 'utf8'));
    expect(parsed['zh-Hans']).toContain('小貘');
    expect(parsed['en-US']).toContain('Send Feedback');
  });
});

describe('finding the build', () => {
  test('the query filters by app, build number and version', () => {
    const query = new URLSearchParams(
      buildsPath('6837172850', '1.0.0', '20261121.1730').split('?')[1],
    );
    expect(query.get('filter[app]')).toBe('6837172850');
    expect(query.get('filter[version]')).toBe('20261121.1730');
    expect(query.get('filter[preReleaseVersion.version]')).toBe('1.0.0');
  });

  test('picks the build whose number matches, with its processing state', () => {
    const response = {
      data: [
        { id: 'a', attributes: { version: '20261121.1036', processingState: 'VALID' } },
        { id: 'b', attributes: { version: '20261121.1730', processingState: 'PROCESSING' } },
      ],
    };
    expect(pickBuild(response, '20261121.1730')).toEqual({
      id: 'b',
      processingState: 'PROCESSING',
    });
    expect(pickBuild({ data: [] }, '20261121.1730')).toBeUndefined();
  });

  test('finds a build stamped before 10:00 under the number App Store Connect stores', () => {
    const query = new URLSearchParams(
      buildsPath('6837172850', '1.0.0', '20261126.0845').split('?')[1],
    );
    expect(query.get('filter[version]')).toBe('20261126.845');
    const response = {
      data: [{ id: 'c', attributes: { version: '20261126.845', processingState: 'VALID' } }],
    };
    expect(pickBuild(response, '20261126.0845')).toEqual({ id: 'c', processingState: 'VALID' });
  });
});

describe('requests', () => {
  test('creates What to Test for locales the build lacks', () => {
    const [zh, en] = localizationRequests('build-1', { data: [] }, notes);
    expect(zh).toMatchObject({ method: 'POST', path: '/v1/betaBuildLocalizations' });
    expect(zh?.body).toEqual({
      data: {
        type: 'betaBuildLocalizations',
        attributes: { locale: 'zh-Hans', whatsNew: '请试试悬赏' },
        relationships: { build: { data: { type: 'builds', id: 'build-1' } } },
      },
    });
    expect(en?.body.data.attributes).toEqual({ locale: 'en-US', whatsNew: 'Try a bounty' });
  });

  test('updates a different text and leaves the same text alone', () => {
    const existing = {
      data: [
        { id: 'loc-zh', attributes: { locale: 'zh-Hans', whatsNew: '旧的' } },
        { id: 'loc-en', attributes: { locale: 'en-US', whatsNew: 'Try a bounty' } },
      ],
    };
    expect(localizationRequests('build-1', existing, notes)).toEqual([
      {
        locale: 'zh-Hans',
        method: 'PATCH',
        path: '/v1/betaBuildLocalizations/loc-zh',
        body: {
          data: {
            type: 'betaBuildLocalizations',
            id: 'loc-zh',
            attributes: { whatsNew: '请试试悬赏' },
          },
        },
      },
    ]);
  });

  test('adds the build to the group and submits it for beta review', () => {
    expect(addToGroupRequest('group-1', 'build-1')).toEqual({
      method: 'POST',
      path: '/v1/betaGroups/group-1/relationships/builds',
      body: { data: [{ type: 'builds', id: 'build-1' }] },
    });
    expect(submissionRequest('build-1')).toEqual({
      method: 'POST',
      path: '/v1/betaAppReviewSubmissions',
      body: {
        data: {
          type: 'betaAppReviewSubmissions',
          relationships: { build: { data: { type: 'builds', id: 'build-1' } } },
        },
      },
    });
  });
});

describe('responses', () => {
  test('group membership asks for this build in this group and reads an empty list as absent', () => {
    const query = new URLSearchParams(groupMembershipPath('group-1', 'build-1').split('?')[1]);
    expect(query.get('filter[betaGroups]')).toBe('group-1');
    expect(query.get('filter[id]')).toBe('build-1');
    expect(inGroup({ data: [{ id: 'build-1' }] }, 'build-1')).toBe(true);
    expect(inGroup({ data: [] }, 'build-1')).toBe(false);
  });

  test('a build never submitted has no review state', () => {
    expect(reviewState({ data: null })).toBeUndefined();
    expect(reviewState({ data: { attributes: { betaReviewState: 'WAITING_FOR_REVIEW' } } })).toBe(
      'WAITING_FOR_REVIEW',
    );
  });

  test('errors name Apple’s code and detail', () => {
    expect(
      describeErrors(409, {
        errors: [{ code: 'ENTITY_ERROR', title: 'Conflict', detail: 'Missing What to Test.' }],
      }),
    ).toBe('App Store Connect answered 409\nENTITY_ERROR: Missing What to Test.');
  });
});
