import { CyberCanvas } from '@/components/CyberCanvas'
import ShopClient from './ShopClient'

export default function ShopPage() {
  return (
    <main className="page-base">
      <CyberCanvas skipIntro />
      <ShopClient />
    </main>
  )
}

