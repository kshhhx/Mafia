import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SocketProvider } from '@/lib/socketClient'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={`${inter.className} bg-darkerBg text-white min-h-screen selection:bg-mafiaRed selection:text-white`}>
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  )
}
