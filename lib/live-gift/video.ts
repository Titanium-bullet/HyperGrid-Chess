import type { GiftEffectConfig } from './config'

function ensureVideoLayer(): HTMLElement {
  let layer = document.getElementById('giftVideoLayer')
  if (!layer) {
    layer = document.createElement('div')
    layer.id = 'giftVideoLayer'
    layer.style.cssText =
      'position:fixed;inset:0;z-index:9002;pointer-events:none;' +
      'display:flex;flex-direction:column;align-items:center;' +
      'padding:5vh 0 0;background:#000;opacity:0;'
    document.body.appendChild(layer)
  }
  return layer
}

function addCaption(layer: HTMLElement, color: string): HTMLElement {
  const caption = document.createElement('div')
  caption.className = 'gift-video-caption'
  caption.textContent = 'congratulation'
  caption.style.cssText =
    `margin:0 0 16px;font-family:'Orbitron','Segoe UI',sans-serif;` +
    `font-size:clamp(1.7rem,4.2vw,2.8rem);font-weight:700;letter-spacing:7px;` +
    `text-transform:uppercase;color:${color};` +
    `text-shadow:0 0 10px ${color}66,0 0 20px ${color}33;` +
    `opacity:0;`
  layer.appendChild(caption)
  // Single soft fade-in — no bounce, no looping pulse.
  caption.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 500,
    delay: 120,
    easing: 'ease-out',
    fill: 'forwards',
  })
  return caption
}

function addVideo(layer: HTMLElement, cfg: GiftEffectConfig): HTMLVideoElement {
  // Wrapper fills all remaining vertical space (down to the bottom of the screen)
  // so the video can enlarge downward and occupy the lower portion of the viewport.
  const wrap = document.createElement('div')
  wrap.style.cssText =
    'flex:1 1 auto;width:100%;min-height:0;' +
    'display:flex;align-items:center;justify-content:center;padding:0 1.5vw 2vh;'
  layer.appendChild(wrap)

  const video = document.createElement('video')
  video.src = cfg.video
  video.className = 'gift-video'
  video.style.cssText =
    `width:100%;height:100%;max-width:min(98vw,1700px);` +
    `border-radius:14px;object-fit:contain;background:#000;` +
    `border:1px solid ${cfg.rarityColor}44;` +
    `box-shadow:0 0 50px ${cfg.rarityColor}33, 0 16px 50px rgba(0,0,0,0.6);`
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.controls = false
  video.autoplay = true
  wrap.appendChild(video)
  return video
}

export function playGiftVideo(cfg: GiftEffectConfig, onEnded: () => void): void {
  if (typeof document === 'undefined') return
  const layer = ensureVideoLayer()
  addCaption(layer, cfg.rarityColor)
  const video = addVideo(layer, cfg)

  // Fade the pure-black backdrop + content in, hiding the shop behind.
  layer.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 350,
    easing: 'ease-out',
    fill: 'forwards',
  })

  let finished = false
  const finish = (): void => {
    if (finished) return
    finished = true
    // Ceremonious close: slow fade-out with a gentle zoom before removing.
    layer.animate(
      [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(1.03)' },
      ],
      { duration: 700, easing: 'ease-in', fill: 'forwards' }
    )
    window.setTimeout(() => {
      layer.parentNode?.removeChild(layer)
      onEnded()
    }, 720)
  }
  video.addEventListener('ended', finish, { once: true })
  video.addEventListener('error', finish, { once: true })

  const fallback = window.setTimeout(finish, cfg.duration + 4000)

  const tryPlay = (): void => {
    const p = video.play()
    if (p && typeof p.then === 'function') {
      p.then(() => {
        window.clearTimeout(fallback)
      }).catch(() => {
        if (video.muted) {
          window.clearTimeout(fallback)
          finish()
          return
        }
        video.muted = true
        video.play().then(() => window.clearTimeout(fallback)).catch(() => finish())
      })
    }
  }
  tryPlay()
}
