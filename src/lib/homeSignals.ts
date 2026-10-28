import { createStore } from './store';

const liveCardsOnScreen = createStore(true);
const revealRequests = createStore(0);
const topRequests = createStore(0);

export const homeSignals = {
  liveCardsOnScreen,
  revealRequests,
  topRequests,
  setLiveCardsOnScreen: liveCardsOnScreen.set,
  requestReveal: () => revealRequests.set(revealRequests.get() + 1),
  requestTop: () => topRequests.set(topRequests.get() + 1),
};
