import {
  addPlaceSuggestionsListener,
  endPlaceSearch,
  placeAt,
  resolvePlace,
  startPlaceSearch,
  updatePlaceQuery,
} from 'tapiro-kit';

import { uiVerify, uiVerifyArgument, uiVerifyFixture } from '@/lib/uiVerify';

import { createFixturePlaces, placesFixture } from './fixturePlaces';
import type { PlaceFacade } from './placeSearch';

export const placeFacade: PlaceFacade = uiVerify
  ? createFixturePlaces(
      placesFixture(uiVerifyArgument('uiVerifyPlaces')),
      undefined,
      uiVerifyFixture,
    )
  : {
      startPlaceSearch,
      updatePlaceQuery,
      addPlaceSuggestionsListener,
      resolvePlace,
      placeAt,
      endPlaceSearch,
    };
