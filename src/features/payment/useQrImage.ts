import { useEffect, useState } from 'react';

import { payDevice } from './services';

export function useQrImage(payload: string, points: number) {
  const [uri, setUri] = useState<{ payload: string; uri: string | null } | null>(null);
  useEffect(() => {
    let live = true;
    payDevice.qrImage(payload, points).then(
      (file) => live && setUri({ payload, uri: file }),
      () => live && setUri({ payload, uri: null }),
    );
    return () => {
      live = false;
    };
  }, [payload, points]);
  return uri?.payload === payload ? uri.uri : null;
}
