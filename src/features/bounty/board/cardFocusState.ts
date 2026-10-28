export type CardFocusState = {
  pending: string | null;
  moved: boolean;
  ring: { id: string; key: number } | null;
  nextKey: number;
};

export type CardFocusEvent =
  | { type: 'scrolling'; id: string }
  | { type: 'show'; id: string }
  | { type: 'scrolled' }
  | { type: 'settled' }
  | { type: 'still' }
  | { type: 'dragged' }
  | { type: 'done'; key: number }
  | { type: 'gone'; id: string }
  | { type: 'reset' };

export const NO_FOCUS: CardFocusState = { pending: null, moved: false, ring: null, nextKey: 1 };

function ring(state: CardFocusState, id: string): CardFocusState {
  return {
    pending: null,
    moved: false,
    ring: { id, key: state.nextKey },
    nextKey: state.nextKey + 1,
  };
}

export function cardFocusReducer(state: CardFocusState, event: CardFocusEvent): CardFocusState {
  switch (event.type) {
    case 'scrolling':
      return { ...state, pending: event.id, moved: false };
    case 'show':
      return ring(state, event.id);
    case 'scrolled':
      return state.pending && !state.moved ? { ...state, moved: true } : state;
    case 'settled':
      return state.pending ? ring(state, state.pending) : state;
    case 'still':
      return state.pending && !state.moved ? ring(state, state.pending) : state;
    case 'dragged':
      return state.pending ? { ...state, pending: null, moved: false } : state;
    case 'done':
      return state.ring?.key === event.key ? { ...state, ring: null } : state;
    case 'gone':
      if (state.pending !== event.id && state.ring?.id !== event.id) return state;
      return {
        ...state,
        pending: state.pending === event.id ? null : state.pending,
        ring: state.ring?.id === event.id ? null : state.ring,
      };
    case 'reset':
      return state.pending || state.ring
        ? { ...state, pending: null, moved: false, ring: null }
        : state;
  }
}
