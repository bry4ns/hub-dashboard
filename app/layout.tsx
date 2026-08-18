import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hub Central | Mis Aplicaciones & Servicios',
  description: 'Lanzador centralizado y monitor de estado de aplicaciones web y proyectos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased min-h-screen text-slate-100 selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
