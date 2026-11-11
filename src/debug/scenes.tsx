import type { ParseKeys } from 'i18next';
import type { ComponentType } from 'react';

import {
  DeleteBlockedScene,
  LanguageStepScene,
  ProfileSetupScene,
  SettingsScene,
  WelcomeScene,
} from './AccountScenes';
import { BoardMapScene } from './BoardMapScene';
import { ChatThreadScene } from './ChatScenes';
import { CoinsPageScene, InvitePageScene, TapirSettingsScene } from './CoinsScenes';
import {
  BountyApplicantsScene,
  BountyBoardScene,
  BountyConfirmScene,
  BountyDetailScene,
  BountyPostScene,
  BountyStatusScene,
  PlaceSearchScene,
} from './BountyScenes';
import { DesignTokensScene } from './DesignTokensScene';
import { FlightRedirect } from './FlightScene';
import { MapKitScene } from './MapKitScene';
import { PaySheetScene, StickerBookScene } from './PayScenes';
import { ProfileScene, ReviewSheetScene } from './ReputationScenes';
import { RideConfirmScene, RideDetailScene, RideFormScene, RideListScene } from './RideScenes';
import { SignInScene } from './SignInScene';
import { LiveActivitySpikeScene } from './LiveActivitySpikeScene';
import { StoreE2EScene } from './StoreE2EScene';

export type Scene = {
  id: string;
  titleKey: ParseKeys;
  Component: ComponentType<{ onReady: () => void }>;
};

export const scenes: Scene[] = [
  { id: 'design-tokens', titleKey: 'debug.tokens.title', Component: DesignTokensScene },
  { id: 'sign-in', titleKey: 'debug.account.title', Component: SignInScene },
  { id: 'welcome', titleKey: 'debug.account.scenes.welcome', Component: WelcomeScene },
  {
    id: 'profile-setup',
    titleKey: 'debug.account.scenes.profileSetup',
    Component: ProfileSetupScene,
  },
  {
    id: 'language-step',
    titleKey: 'debug.account.scenes.languageStep',
    Component: LanguageStepScene,
  },
  { id: 'settings', titleKey: 'debug.account.scenes.settings', Component: SettingsScene },
  {
    id: 'delete-blocked',
    titleKey: 'debug.account.scenes.deleteBlocked',
    Component: DeleteBlockedScene,
  },
  { id: 'pay-sheet', titleKey: 'debug.pay.title', Component: PaySheetScene },
  { id: 'sticker-book', titleKey: 'debug.stickers.title', Component: StickerBookScene },
  { id: 'bounty-post', titleKey: 'debug.bounty.post', Component: BountyPostScene },
  { id: 'bounty-confirm', titleKey: 'debug.bounty.confirm', Component: BountyConfirmScene },
  { id: 'place-search', titleKey: 'debug.bounty.placeSearch', Component: PlaceSearchScene },
  { id: 'bounty-board', titleKey: 'debug.bounty.board', Component: BountyBoardScene },
  { id: 'bounty-detail', titleKey: 'debug.bounty.detail', Component: BountyDetailScene },
  {
    id: 'bounty-applicants',
    titleKey: 'debug.bounty.applicants',
    Component: BountyApplicantsScene,
  },
  { id: 'bounty-status', titleKey: 'debug.bounty.status', Component: BountyStatusScene },
  { id: 'sticker-flight', titleKey: 'debug.flight.title', Component: FlightRedirect },
  { id: 'map-kit', titleKey: 'debug.map.title', Component: MapKitScene },
  { id: 'bounty-map', titleKey: 'debug.bounty.map', Component: BoardMapScene },
  { id: 'ride-list', titleKey: 'debug.ride.list', Component: RideListScene },
  { id: 'ride-form', titleKey: 'debug.ride.form', Component: RideFormScene },
  { id: 'ride-confirm', titleKey: 'debug.ride.confirm', Component: RideConfirmScene },
  { id: 'ride-detail', titleKey: 'debug.ride.detail', Component: RideDetailScene },
  { id: 'chat-thread', titleKey: 'debug.chat.thread', Component: ChatThreadScene },
  { id: 'profile', titleKey: 'debug.reputation.profile', Component: ProfileScene },
  { id: 'review-sheet', titleKey: 'debug.reputation.review', Component: ReviewSheetScene },
  { id: 'coins-page', titleKey: 'debug.coins.page', Component: CoinsPageScene },
  { id: 'invite-page', titleKey: 'debug.coins.invite', Component: InvitePageScene },
  { id: 'tapir-settings', titleKey: 'debug.ask.settings', Component: TapirSettingsScene },
  ...(__DEV__ ? devOnlyScenes() : []),
];

function devOnlyScenes(): Scene[] {
  return [
    { id: 'store-e2e', titleKey: 'debug.store.title', Component: StoreE2EScene },
    {
      id: 'live-activity-spike',
      titleKey: 'debug.liveActivity.title',
      Component: LiveActivitySpikeScene,
    },
  ];
}

export function findScene(id: string) {
  return scenes.find((scene) => scene.id === id);
}
