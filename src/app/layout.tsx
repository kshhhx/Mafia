import type { Metadata } from 'next'
import './globals.css'
import { SocketProvider } from '@/lib/socketClient'

export const metadata: Metadata = {
  title: 'Mafia - The Web App',
  description: 'A mobile-first Mafia party game platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-darkerBg text-white min-h-screen selection:bg-mafiaRed selection:text-white">
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  )
}
