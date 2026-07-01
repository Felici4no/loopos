/**
 * LoopOS Web — Placeholder
 *
 * Dashboard web será implementado na v0.3.
 * Esta página existe apenas para validar a estrutura Next.js.
 */

import type { ReactElement } from 'react';

export default function HomePage(): ReactElement {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff',
        fontFamily: 'system-ui',
      }}
    >
      <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>LoopOS</h1>
      <p style={{ color: '#666', marginTop: 8 }}>Dashboard em desenvolvimento — v0.3</p>
    </main>
  );
}
