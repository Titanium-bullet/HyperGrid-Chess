import type { GiftEffectConfig } from './config'

function escapeHtml(s: string): string {
  if (typeof document === 'undefined') return s
  const d = document.createElement('div')
  d.textContent = s
  return d.innerHTML
}

function ensureContainer(): HTMLElement {
  let container = document.getElementById('giftCardContainer')
  if (!container) {
    container = document.createElement('div')
    container.id = 'giftCardContainer'
    container.style.cssText =
      'position:fixed;top:50%;right:30px;transform:translateY(-50%);z-index:9003;display:flex;flex-direction:column;gap:10px;pointer-events:none;'
    document.body.appendChild(container)
  }
  return container
}

export function showGiftCard(cfg: GiftEffectConfig, sender: string): HTMLElement {
  if (typeof document === 'undefined') throw new Error('document unavailable')
  const container = ensureContainer()
  const card = document.createElement('div')
  card.className = `gift-card gift-card-${cfg.rarity}`
  card.innerHTML =
    `<div class="gift-card-header">` +
    `<span class="gift-card-icon">${cfg.icon}</span>` +
    `<span class="gift-card-rarity" style="color:${cfg.rarityColor}">${cfg.rarityLabel}</span>` +
    `</div>` +
    `<div class="gift-card-body">` +
    `<div class="gift-card-sender">${escapeHtml(sender)}</div>` +
    `<div class="gift-card-action">sent</div>` +
    `<div class="gift-card-name" style="color:${cfg.rarityColor}">${cfg.name}</div>` +
    `</div>`
  card.classList.add('gift-card--enter')
  container.appendChild(card)

  // Keep the enter state (forwards fill => opacity:1). Do NOT add `--float`:
  // the float keyframes only animate transform, which would let opacity revert
  // to the base 0 and make the card flicker out mid-video.
  card.style.opacity = '1'
  return card
}

export function removeGiftCard(card: HTMLElement): void {
  if (typeof document === 'undefined') return
  card.classList.add('gift-card--exit')
  window.setTimeout(() => card.parentNode?.removeChild(card), 600)
}

export function clearAllGiftDom(): void {
  if (typeof document === 'undefined') return
  document.getElementById('giftCardContainer')?.remove()
  document.getElementById('giftVideoLayer')?.remove()
}
