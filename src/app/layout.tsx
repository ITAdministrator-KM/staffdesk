'use client';

import { Suspense, useEffect } from 'react';
import './globals.css';
import { AppShell } from '@/components/app-shell';

function ExtensionCleanupScript() {
  useEffect(() => {
    // Clean up extension attributes after hydration
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      const body = document.body;
      
      // Remove common extension attributes that cause hydration mismatches
      const attributesToRemove = [
        'crxemulator',
        'webcrx', 
        'crosspilot',
        'monica-id',
        'monica-version',
        'data-new-gr-c-s-check-loaded',
        'data-gr-ext-installed'
      ];
      
      attributesToRemove.forEach(attr => {
        html.removeAttribute(attr);
        body.removeAttribute(attr);
      });
    }
  }, []);

  return null;
}

function LoadingSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-lg font-semibold">Loading...</span>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="StaffDeskDSK - Internal Staff Management System" />
        <meta name="permissions-policy" content="clipboard-read=*, clipboard-write=*" />
        <meta httpEquiv="Permissions-Policy" content="clipboard-read=*, clipboard-write=*" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
        <ExtensionCleanupScript />
      </body>
    </html>
  );
}
