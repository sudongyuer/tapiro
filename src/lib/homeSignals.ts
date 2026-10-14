import { createStore } from './store';

const liveCardsOnScreen = createStore(true);
const revealRequests = createStore(0);

export const homeSignals = {
  liveCardsOnScreen,
  revealRequests,
  setLiveCardsOnScreen: liveCardsOnScreen.set,
  requestReveal: () => revealRequests.set(revealRequests.get() + 1),
};
