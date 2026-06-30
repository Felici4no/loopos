import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LoopOS',
  description: 'Sistema pessoal modular para registrar rotina, corpo e hábitos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
