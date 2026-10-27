import { Settings } from 'react-native';

import { getSupabase } from '@/lib/supabase';
import { uiVerify, uiVerifyArgument, uiVerifyFixture } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';

import { FIXTURE_PLACES } from '../place/fixturePlaces';
import { FIXTURE_USER_ID } from '../post/fixtureDrafts';
import { createSupabaseBoardService } from './boardService';
import { createFixtureBoardService, fixtureBoardOptions } from './fixtureBoardService';
import { createOriginStore } from './originStore';
import type { BoardService } from './types';

export const boardService: BoardService = uiVerify
  ? createFixtureBoardService(fixtureBoardOptions(uiVerifyArgument, uiVerifyFixture))
  : createSupabaseBoardService(getSupabase());

export const originStore = createOriginStore(Settings, userCleanups);

const seededPlace = uiVerifyArgument('uiVerifyBoardPlace');
if (uiVerify && seededPlace === 'none') originStore.setChosenPlace(FIXTURE_USER_ID, null);
const sunway = FIXTURE_PLACES.find((place) => place.id === 'sunway-geo')?.place;
if (uiVerify && seededPlace === 'sunway' && sunway) {
  originStore.setChosenPlace(FIXTURE_USER_ID, {
    label: sunway.name,
    point: { latitude: sunway.latitude, longitude: sunway.longitude },
  });
}
