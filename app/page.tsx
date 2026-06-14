import { CyberCanvas } from '@/components/CyberCanvas'
import { ShopButton } from '@/components/ShopButton'
import { HomeMenu } from './HomeMenu'
import styles from './page.module.css'

export default function HomePage() {
  return (
    <main className="page-base page-base--no-scroll page-vignette">
      <CyberCanvas />
      <h1 className={styles.heroTitle}>HYPERGRID CHESS</h1>
      <ShopButton introAnimation />
      <HomeMenu />
    </main>
  )
}
