import type { Metadata, Viewport } from 'next'
import { Orbitron } from 'next/font/google'
import './globals.css'
import { AchievementToastHost } from '@/components/AchievementToast'

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-orbitron',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HyperGrid Chess',
  description: 'A neon cyberpunk chess experience — play vs AI, two-player, or solve puzzles.',
  metadataBase: process.env.NEXT_PUBLIC_BASE_URL ? new URL(process.env.NEXT_PUBLIC_BASE_URL) : undefined,
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a14',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={orbitron.variable}>
      <body className={orbitron.variable}>
        {children}
        <AchievementToastHost />
      </body>
    </html>
  )
}
