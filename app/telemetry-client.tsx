'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function TelemetryClient() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const payload = JSON.stringify({
        type: 'pageview',
        path: pathname,
      });

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/telemetry', blob);
      } else {
        fetch('/api/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {}
  }, [pathname]);

  return null;
}
