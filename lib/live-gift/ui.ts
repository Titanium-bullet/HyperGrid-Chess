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

export function showGiftCard(cfg: GiftEffectConfig, sender: string, combo: number): void {
  if (typeof document === 'undefined') return
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
    `</div>` +
    (combo > 1 ? `<div class="gift-card-combo" style="--combo-color:${cfg.rarityColor}">x${combo}</div>` : '')
  card.classList.add('gift-card--enter')
  container.appendChild(card)

  window.setTimeout(() => card.classList.add('gift-card--float'), 800)

  window.setTimeout(() => {
    card.classList.add('gift-card--exit')
    window.setTimeout(() => card.parentNode?.removeChild(card), 600)
  }, cfg.displayTime)

  if (combo > 1) animateCombo(combo, cfg.rarityColor)
}

function animateCombo(combo: number, color: string): void {
  const existing = document.getElementById('giftComboDisplay')
  existing?.parentNode?.removeChild(existing)
  const el = document.createElement('div')
  el.id = 'giftComboDisplay'
  el.className = 'gift-combo-display'
  el.style.setProperty('--combo-color', color)
  el.textContent = `x${combo}`
  document.body.appendChild(el)
  window.setTimeout(() => {
    el.classList.add('gift-combo-display--exit')
    window.setTimeout(() => el.parentNode?.removeChild(el), 600)
  }, 2000)

  if (combo >= 10) {
    const label = combo >= 100 ? 'MEGA COMBO!' : combo >= 50 ? 'COMBO x50!' : combo >= 30 ? 'COMBO x30!' : 'COMBO x10!'
    showComboLabel(label, color)
  }
}

function showComboLabel(text: string, color: string): void {
  const el = document.createElement('div')
  el.className = 'gift-combo-label'
  el.style.color = color
  el.textContent = text
  document.body.appendChild(el)
  window.setTimeout(() => {
    el.classList.add('gift-combo-label--exit')
    window.setTimeout(() => el.parentNode?.removeChild(el), 700)
  }, 2500)
}

export function screenFlash(color: string, opacity: number, duration: number): void {
  if (typeof document === 'undefined') return
  const flash = document.createElement('div')
  flash.className = 'gift-screen-flash'
  flash.style.background = `radial-gradient(ellipse at center, ${color} ${opacity}, transparent 70%)`
  flash.style.setProperty('--flash-duration', `${duration}ms`)
  document.body.appendChild(flash)
  window.setTimeout(() => flash.parentNode?.removeChild(flash), duration + 150)
}

let screenShakeRafId: number | null = null

export function screenShake(intensity: number, duration: number): void {
  if (typeof document === 'undefined') return
  const target = document.body
  const baseTransform = ''
  if (screenShakeRafId !== null) {
    cancelAnimationFrame(screenShakeRafId)
    screenShakeRafId = null
  }
  const start = performance.now()
  function frame(now: number) {
    const elapsed = now - start
    if (elapsed >= duration) {
      target.style.transform = baseTransform
      screenShakeRafId = null
      return
    }
    const x = (Math.random() - 0.5) * 2 * intensity
    const y = (Math.random() - 0.5) * 2 * intensity
    target.style.transform = `translate(${x}px, ${y}px)`
    screenShakeRafId = requestAnimationFrame(frame)
  }
  screenShakeRafId = requestAnimationFrame(frame)
}

export function showBrightnessBoost(opacity: number, duration: number): void {
  if (typeof document === 'undefined') return
  const el = document.createElement('div')
  el.className = 'gift-brightness-boost'
  el.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,${opacity});z-index:8999;pointer-events:none;animation:giftBrightnessFade ${duration}ms ease-in forwards;`
  document.body.appendChild(el)
  window.setTimeout(() => el.parentNode?.removeChild(el), duration + 100)
}

export function showGodRays(colors: string[], duration: number): HTMLElement {
  const container = document.createElement('div')
  container.className = 'gift-god-rays'
  container.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9000;pointer-events:none;overflow:hidden;'
  const rayCount = 8
  for (let i = 0; i < rayCount; i++) {
    const ray = document.createElement('div')
    const angle = ((360 / rayCount) * i) * 0.1 - 5 + Math.random() * 10
    const color = colors[i % colors.length] || '#FFD700'
    const rgb = hexParse(color)
    ray.style.cssText =
      `position:absolute;top:-50%;left:${10 + (80 / rayCount) * i}%;` +
      `width:${20 + Math.random() * 40}px;height:200%;` +
      `background:linear-gradient(180deg,rgba(${rgb.r},${rgb.g},${rgb.b},0.3) 0%,rgba(${rgb.r},${rgb.g},${rgb.b},0) 100%);` +
      `transform:rotate(${angle}deg);filter:blur(15px);` +
      `opacity:0;animation:giftRayIn 0.8s ease-out ${i * 0.1}s forwards;`
    container.appendChild(ray)
  }
  document.body.appendChild(container)
  window.setTimeout(() => {
    container.classList.add('gift-god-rays--exit')
    window.setTimeout(() => container.parentNode?.removeChild(container), 1600)
  }, duration - 2000)
  return container
}

function hexParse(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 255, g: 215, b: 0 }
}

export function clearAllGiftDom(): void {
  if (typeof document === 'undefined') return
  document.getElementById('giftCardContainer')?.remove()
  document.getElementById('giftComboDisplay')?.remove()
  document
    .querySelectorAll('.gift-combo-label, .gift-screen-flash, .gift-god-rays, .gift-brightness-boost')
    .forEach((el) => el.remove())
}
