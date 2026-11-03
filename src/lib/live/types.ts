export type LiveSignal = { kind: string; id: string; at: string | null };

export type ChannelStatus = 'joined' | 'error' | 'closed';

export type LiveConnection = 'idle' | 'connecting' | 'live' | 'offline';

export type ChannelEvents = {
  signal: (signal: LiveSignal) => void;
  status: (status: ChannelStatus) => void;
};

export type LiveTransport = {
  open(userId: string, events: ChannelEvents): () => void;
};

export type LiveHandler = (signal: LiveSignal | null) => void;
