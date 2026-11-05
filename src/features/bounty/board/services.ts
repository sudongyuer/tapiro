import { Settings } from 'react-native';

import { fixtureBlocked } from '@/features/block';
import { FIXTURE_PLACES } from '@/features/place/fixturePlaces';
import { createOriginStore, createShownOrigins } from '@/features/place/originStore';
import { deviceCurrency } from '@/lib/deviceCurrency';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';
import { verifyRecorder } from '@/lib/verifyRecord';

import '../shared/blockFixturePeople';
import { FIXTURE_USER_ID } from '../post/fixtureDrafts';
import { fixturePosterView } from '../select/services';
import { createSupabaseBoardService } from './boardService';
import { createFixtureBoardService, fixtureBoardOptions } from './fixtureBoardService';
import type { BoardService } from './types';
import { createViewStore, seedBoardView } from './viewStore';

const VERIFY_WRITE_DELAY_MS = 2500;

function detailLoadRecorder() {
  const record = verifyRecorder('uiVerifyDetailLoads');
  return (id: string) => record(`load:${id}`);
}

export const boardService: BoardService = uiVerify
  ? createFixtureBoardService({
      ...fixtureBoardOptions(uiVerifyArgument, uiVerifyFixture),
      writeDelayMs: VERIFY_WRITE_DELAY_MS,
      isBlocked: fixtureBlocked,
      posterView: fixturePosterView,
      onDetailLoaded: detailLoadRecorder(),
    })
  : createSupabaseBoardService(getSupabase(), deviceCurrency);

export const originStore = createOriginStore(Settings, userCleanups);

export const shownOrigins = createShownOrigins(userCleanups);

export const viewStore = createViewStore(Settings, userCleanups);

if (uiVerify) seedBoardView(viewStore, FIXTURE_USER_ID, uiVerifyArgument('uiVerifyBoardView'));

const seededPlace = uiVerifyArgument('uiVerifyBoardPlace');
if (uiVerify && seededPlace === 'none') originStore.clear(FIXTURE_USER_ID);
const sunway = FIXTURE_PLACES.find((place) => place.id === 'sunway-geo')?.place;
if (uiVerify && seededPlace === 'sunway' && sunway) {
  originStore.setChosenPlace(FIXTURE_USER_ID, {
    label: sunway.name,
    point: { latitude: sunway.latitude, longitude: sunway.longitude },
  });
}
