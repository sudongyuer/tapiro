import { Settings } from 'react-native';

import { deviceCurrency } from '@/lib/deviceCurrency';
import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';

import { fixtureBlocked } from '../block/services';
import { FIXTURE_PLACES } from '../place/fixturePlaces';
import { FIXTURE_USER_ID } from '../post/fixtureDrafts';
import { fixturePosterView } from '../select/services';
import { createSupabaseBoardService } from './boardService';
import { createFixtureBoardService, fixtureBoardOptions } from './fixtureBoardService';
import { createOriginStore, createShownOrigins } from './originStore';
import type { BoardService } from './types';
import { createViewStore, seedBoardView } from './viewStore';

const VERIFY_WRITE_DELAY_MS = 2500;

export const boardService: BoardService = uiVerify
  ? createFixtureBoardService({
      ...fixtureBoardOptions(uiVerifyArgument, uiVerifyFixture),
      writeDelayMs: VERIFY_WRITE_DELAY_MS,
      isBlocked: fixtureBlocked,
      posterView: fixturePosterView,
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
