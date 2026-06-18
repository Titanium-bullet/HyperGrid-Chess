import { CyberCanvas } from '@/components/CyberCanvas'
import { ShopButton } from '@/components/ShopButton'
import { FinanceOnboarding } from '@/components/finance/FinanceOnboarding'
import { BankingClient } from '@/components/finance/banking/BankingClient'

export default function BankingPage() {
  return (
    <main className="page-base page-vignette">
      <CyberCanvas skipIntro />
      <ShopButton />
      <FinanceOnboarding />
      <BankingClient />
    </main>
  )
}
