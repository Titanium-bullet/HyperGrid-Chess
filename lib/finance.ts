import { STORAGE_KEYS } from './storage-keys'
import { HYPERGRID_FINANCE_CHANGED, HYPERGRID_COINS_CHANGED } from '@/lib/events'
import { SHOP_ITEMS, getInventory, addCoins, getCoins } from './shop'

/* ------------------------------------------------------------------ */
/*  Card tiers                                                        */
/* ------------------------------------------------------------------ */

export type CardTier = 'everyday' | 'plus' | 'gold' | 'platinum' | 'aesculapius'

export type CardDef = {
  id: CardTier
  name: string
  /** Short label used in the Shop payment banner ("by BofH <label>"). */
  payLabel: string
  /** debit / credit */
  kind: 'debit' | 'credit'
  /** Tier rank — higher means more privileged. */
  rank: number
  /** Gradient stops for the card face. */
  gradient: [string, string, string]
  accent: string
  glyph: string
  /** Mock credit limit / spending cap (coins). */
  creditLimit: number
  /** Default starting balance displayed on the dashboard (coins). */
  startingBalance: number
  tagline: string
}

export const CARDS: CardDef[] = [
  {
    id: 'everyday',
    name: 'Everyday',
    payLabel: 'Everyday debit',
    kind: 'debit',
    rank: 1,
    gradient: ['#16c2c2', '#0e7d8a', '#0a3d4a'],
    accent: '#4ecdc4',
    glyph: '◈',
    creditLimit: 5000,
    startingBalance: 1200,
    tagline: 'Daily spending essentials',
  },
  {
    id: 'plus',
    name: 'Plus',
    payLabel: 'Plus debit',
    kind: 'debit',
    rank: 2,
    gradient: ['#3a7bd5', '#2a5bbf', '#16264d'],
    accent: '#5b9bff',
    glyph: '♝',
    creditLimit: 15000,
    startingBalance: 4800,
    tagline: 'Upgraded perks & rewards',
  },
  {
    id: 'gold',
    name: 'Gold',
    payLabel: 'Gold credit',
    kind: 'credit',
    rank: 3,
    gradient: ['#ffd24a', '#c89222', '#5a3d0a'],
    accent: '#ffd700',
    glyph: '♛',
    creditLimit: 60000,
    startingBalance: 9000,
    tagline: 'Premium credit, unlocks loans',
  },
  {
    id: 'platinum',
    name: 'Platinum',
    payLabel: 'Platinum credit',
    kind: 'credit',
    rank: 4,
    gradient: ['#e6e9f0', '#9aa3b2', '#3b4252'],
    accent: '#cfe3ff',
    glyph: '♚',
    creditLimit: 250000,
    startingBalance: 25000,
    tagline: 'Elite tier · top limits, lowest APR',
  },
  {
    id: 'aesculapius',
    name: 'Aesculapius',
    payLabel: 'Aesculapius credit',
    kind: 'credit',
    rank: 5,
    gradient: ['#101010', '#000000', '#080808'],
    accent: '#c98bff',
    glyph: '⚕',
    creditLimit: Number.MAX_SAFE_INTEGER,
    startingBalance: Number.MAX_SAFE_INTEGER,
    tagline: "The healer's vault · unlimited credit, by invitation",
  },
]

export function getCardDef(tier: CardTier): CardDef {
  return CARDS.find((c) => c.id === tier) ?? CARDS[0]
}

/* ------------------------------------------------------------------ */
/*  Finance profile (onboarding / opened card)                        */
/* ------------------------------------------------------------------ */

export type FinanceProfile = {
  name: string
  openedCard: CardTier | null
  onboarded: boolean
}

const DEFAULT_PROFILE: FinanceProfile = {
  name: '',
  openedCard: null,
  onboarded: false,
}

function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

export function getProfile(): FinanceProfile {
  if (!hasWindow()) return structuredClone(DEFAULT_PROFILE)
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FINANCE_PROFILE)
    if (!raw) return structuredClone(DEFAULT_PROFILE)
    const p = JSON.parse(raw) as Partial<FinanceProfile>
    return { ...structuredClone(DEFAULT_PROFILE), ...p }
  } catch {
    return structuredClone(DEFAULT_PROFILE)
  }
}

export function saveProfile(profile: Partial<FinanceProfile>): FinanceProfile {
  const next = { ...getProfile(), ...profile }
  if (!hasWindow()) return next
  try {
    localStorage.setItem(STORAGE_KEYS.FINANCE_PROFILE, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(HYPERGRID_FINANCE_CHANGED, { detail: next }))
  } catch {
    // ignore quota errors
  }
  return next
}

/** Returns "by BofH <card label>" when a card is opened, otherwise "by Cash". */
export function getPaymentLabel(): string {
  const { openedCard } = getProfile()
  if (!openedCard) return 'by Cash'
  return `by BofH ${getCardDef(openedCard).payLabel}`
}

/* ------------------------------------------------------------------ */
/*  Collateral valuation (shop items as loan collateral)              */
/* ------------------------------------------------------------------ */

/**
 * Notional collateral value (coins) for a shop item, derived from its price.
 * Items without a price fall back to a nominal 300-coin baseline.
 */
export function getCollateralValue(itemId: string): number {
  for (const b of SHOP_ITEMS.boards) if (b.id === itemId) return b.price > 0 ? b.price : 300
  for (const p of SHOP_ITEMS.pieces) if (p.id === itemId) return p.price > 0 ? p.price : 300
  for (const pu of SHOP_ITEMS.powerups) if (pu.id === itemId) return pu.price > 0 ? pu.price : 300
  for (const bg of SHOP_ITEMS.backgrounds) if (bg.id === itemId) return bg.price > 0 ? bg.price : 300
  const gift = SHOP_ITEMS.gifts.find((g) => g.id === itemId)
  if (gift) return gift.price > 0 ? gift.price : 300
  return 300
}

export type CollateralSlot = {
  id: string
  name: string
  icon: string
  value: number
}

/** Build the list of owned shop items usable as collateral, with values. */
export function getOwnedCollateral(): CollateralSlot[] {
  const inv = getInventory()
  const out: CollateralSlot[] = []
  const push = (id: string, name: string, icon: string) => {
    out.push({ id, name, icon, value: getCollateralValue(id) })
  }
  for (const id of inv.boards) {
    const it = SHOP_ITEMS.boards.find((b) => b.id === id)
    if (it) push(id, it.name, '♟')
  }
  for (const id of inv.pieces) {
    const it = SHOP_ITEMS.pieces.find((b) => b.id === id)
    if (it) push(id, it.name, '♞')
  }
  for (const id of inv.backgrounds) {
    const it = SHOP_ITEMS.backgrounds.find((b) => b.id === id)
    if (it) push(id, it.name, '✦')
  }
  for (const [id, qty] of Object.entries(inv.powerups)) {
    if ((qty ?? 0) > 0) {
      const it = SHOP_ITEMS.powerups.find((b) => b.id === id)
      if (it) push(id, it.name, it.icon)
    }
  }
  for (const id of SHOP_ITEMS.gifts) {
    // Gifts are consumable; treat all known gifts as potential collateral only
    // if user "owns" them — here we exclude gifts from collateral to keep it
    // tied to the persistent inventory. (Inventory doesn't track gifts.)
    void id
  }
  return out
}

/* ------------------------------------------------------------------ */
/*  Loan products                                                     */
/* ------------------------------------------------------------------ */

export type UnsecuredTier = {
  eligible: boolean
  maxAmount: number
  apr: number // annual percent rate, e.g. 7.9
  termMonths: number
}

export function getUnsecuredTerms(tier: CardTier | null): UnsecuredTier {
  switch (tier) {
    case 'gold':
      return { eligible: true, maxAmount: 50000, apr: 12.9, termMonths: 36 }
    case 'platinum':
      return { eligible: true, maxAmount: 200000, apr: 7.9, termMonths: 60 }
    case 'aesculapius':
      return { eligible: true, maxAmount: 500_000_000, apr: 0, termMonths: 120 }
    default:
      return { eligible: false, maxAmount: 0, apr: 0, termMonths: 0 }
  }
}

export type SecuredTier = {
  eligible: boolean
  /** Percentage of total collateral value you may borrow. */
  ltv: number
  apr: number
  termMonths: number
}

export function getSecuredTerms(tier: CardTier | null): SecuredTier {
  switch (tier) {
    case 'everyday':
      return { eligible: true, ltv: 0.6, apr: 18, termMonths: 24 }
    case 'plus':
      return { eligible: true, ltv: 0.7, apr: 15, termMonths: 24 }
    case 'gold':
      return { eligible: true, ltv: 0.8, apr: 10, termMonths: 36 }
    case 'platinum':
      return { eligible: true, ltv: 0.9, apr: 6, termMonths: 60 }
    case 'aesculapius':
      return { eligible: true, ltv: 1, apr: 0, termMonths: 120 }
    default:
      return { eligible: false, ltv: 0, apr: 0, termMonths: 0 }
  }
}

/** Simple monthly payment (amortized principal + interest). */
export function monthlyPayment(principal: number, aprPct: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0
  const r = aprPct / 100 / 12
  if (r === 0) return principal / termMonths
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths))
}

/* ------------------------------------------------------------------ */
/*  Investment products                                               */
/* ------------------------------------------------------------------ */

export type InvestProduct = 'saving' | 'term' | 'fund'

export type InvestProductDef = {
  id: InvestProduct
  name: string
  apyPct: number
  /** Recommended holding period in days (for projection only). */
  periodDays: number
  risk: 'Low' | 'Medium' | 'High'
  icon: string
  blurb: string
}

export const INVEST_PRODUCTS: InvestProductDef[] = [
  {
    id: 'saving',
    name: 'Saving',
    apyPct: 3,
    periodDays: 30,
    risk: 'Low',
    icon: '🛡',
    blurb: 'Flexible access · steady growth',
  },
  {
    id: 'term',
    name: 'Term Deposit',
    apyPct: 6.5,
    periodDays: 90,
    risk: 'Low',
    icon: '⏳',
    blurb: 'Lock funds for a higher fixed yield',
  },
  {
    id: 'fund',
    name: 'Fund',
    apyPct: 11,
    periodDays: 120,
    risk: 'High',
    icon: '📈',
    blurb: 'Actively managed · higher potential return',
  },
]

export function getInvestProduct(id: InvestProduct): InvestProductDef {
  return INVEST_PRODUCTS.find((p) => p.id === id) ?? INVEST_PRODUCTS[0]
}

/** Projected gross return for a principal over `days` at the given APY. */
export function projectReturn(principal: number, apyPct: number, days: number): number {
  if (principal <= 0 || days <= 0) return 0
  const r = apyPct / 100
  return principal * Math.pow(1 + r / 365, days) - principal
}

/* ------------------------------------------------------------------ */
/*  Life insurance                                                    */
/* ------------------------------------------------------------------ */

export type LifeParams = {
  /** Upfront lump sum paid by the customer. */
  premium: number
  /** Daily annuity paid back. */
  dailyAnnuity: number
  /** Number of days the annuity is paid. */
  termDays: number
  /** Lump sum returned at the end of the term. */
  maturity: number
}

export const LIFE_PRESET: LifeParams = {
  premium: 100000,
  dailyAnnuity: 3500,
  termDays: 30,
  maturity: 50000,
}

export function lifeTotals(p: LifeParams, elapsedDays: number) {
  const clamped = Math.max(0, Math.min(elapsedDays, p.termDays))
  const annuityPaid = p.dailyAnnuity * clamped
  const matured = elapsedDays >= p.termDays ? p.maturity : 0
  const received = annuityPaid + matured
  const net = received - p.premium
  const progressPct = p.termDays > 0 ? Math.round((clamped / p.termDays) * 100) : 0
  return { annuityPaid, matured, received, net, progressPct }
}

/* ------------------------------------------------------------------ */
/*  Finance state (open positions)                                    */
/* ------------------------------------------------------------------ */

export type OpenLoan = {
  id: string
  kind: 'unsecured' | 'secured'
  tier: CardTier
  principal: number
  apr: number
  termMonths: number
  remaining: number
  collateralIds?: string[]
  createdAt: number
}

export type OpenInvestment = {
  id: string
  product: InvestProduct
  principal: number
  apyPct: number
  periodDays: number
  elapsedDays: number
  matured: boolean
  withdrawn: boolean
  createdAt: number
}

export type LifePolicy = {
  params: LifeParams
  elapsedDays: number
  matured: boolean
  createdAt: number
}

export type FinanceState = {
  loans: OpenLoan[]
  investments: OpenInvestment[]
  lifePolicy: LifePolicy | null
  toggles: {
    noRatingLoss: boolean
    noCoinLoss: boolean
  }
}

const DEFAULT_STATE: FinanceState = {
  loans: [],
  investments: [],
  lifePolicy: null,
  toggles: { noRatingLoss: false, noCoinLoss: false },
}

export function getState(): FinanceState {
  if (!hasWindow()) return structuredClone(DEFAULT_STATE)
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FINANCE_STATE)
    if (!raw) return structuredClone(DEFAULT_STATE)
    const s = JSON.parse(raw) as Partial<FinanceState>
    return {
      ...structuredClone(DEFAULT_STATE),
      ...s,
      toggles: { ...DEFAULT_STATE.toggles, ...(s.toggles ?? {}) },
    }
  } catch {
    return structuredClone(DEFAULT_STATE)
  }
}

export function saveState(patch: Partial<FinanceState>): FinanceState {
  const next = { ...getState(), ...patch }
  if (!hasWindow()) return next
  try {
    localStorage.setItem(STORAGE_KEYS.FINANCE_STATE, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(HYPERGRID_FINANCE_CHANGED, { detail: next }))
  } catch {
    // ignore
  }
  return next
}

/* ------------------------------------------------------------------ */
/*  Mutations (move real coins)                                       */
/* ------------------------------------------------------------------ */

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export type LoanResult = { ok: true; coins: number; loan?: OpenLoan; settled?: boolean } | { ok: false; reason: string }

/** Total amount still owed across all active unsecured loans. */
function unsecuredDebt(loans: OpenLoan[]): number {
  return loans.filter((l) => l.kind === 'unsecured').reduce((s, l) => s + l.remaining, 0)
}

/** Shop-item ids currently pledged as collateral across active secured loans. */
function pledgedCollateral(loans: OpenLoan[]): Set<string> {
  const set = new Set<string>()
  for (const l of loans) {
    if (l.kind === 'secured') for (const id of l.collateralIds ?? []) set.add(id)
  }
  return set
}

/** Upfront simple interest: total repayable for a principal at the given APR over the term. */
function totalOwed(principal: number, apr: number, termMonths: number): number {
  return Math.round(principal * (1 + (apr / 100) * (termMonths / 12)))
}

export function openUnsecuredLoan(amount: number): LoanResult {
  const { openedCard } = getProfile()
  const terms = getUnsecuredTerms(openedCard)
  if (!terms.eligible) return { ok: false, reason: 'Only Gold & Platinum cards are eligible for unsecured loans.' }
  if (!openedCard) return { ok: false, reason: 'Open a card first.' }
  if (amount <= 0) return { ok: false, reason: 'Enter a positive amount.' }
  const state = getState()
  const debt = unsecuredDebt(state.loans)
  const available = Math.max(0, terms.maxAmount - debt)
  if (amount > available) {
    return { ok: false, reason: `Credit limit reached. Available: ${available.toLocaleString()}.` }
  }
  const coins = addCoins(amount)
  const loan: OpenLoan = {
    id: uid(),
    kind: 'unsecured',
    tier: openedCard,
    principal: amount,
    apr: terms.apr,
    termMonths: terms.termMonths,
    remaining: totalOwed(amount, terms.apr, terms.termMonths),
    createdAt: Date.now(),
  }
  saveState({ loans: [...state.loans, loan] })
  return { ok: true, coins, loan }
}

export function openSecuredLoan(amount: number, collateralIds: string[]): LoanResult {
  const { openedCard } = getProfile()
  const terms = getSecuredTerms(openedCard)
  if (!terms.eligible || !openedCard) return { ok: false, reason: 'Open a card first to use collateral loans.' }
  if (collateralIds.length === 0) return { ok: false, reason: 'Select at least one collateral item.' }
  const state = getState()
  const pledged = pledgedCollateral(state.loans)
  if (collateralIds.some((id) => pledged.has(id))) {
    return { ok: false, reason: 'One or more selected items are already pledged.' }
  }
  const collateralValue = collateralIds.reduce((sum, id) => sum + getCollateralValue(id), 0)
  const maxAmount = Math.floor(collateralValue * terms.ltv)
  if (amount <= 0) return { ok: false, reason: 'Enter a positive amount.' }
  if (amount > maxAmount) return { ok: false, reason: `Max borrowable against this collateral is ${maxAmount.toLocaleString()}.` }
  const coins = addCoins(amount)
  const loan: OpenLoan = {
    id: uid(),
    kind: 'secured',
    tier: openedCard,
    principal: amount,
    apr: terms.apr,
    termMonths: terms.termMonths,
    remaining: totalOwed(amount, terms.apr, terms.termMonths),
    collateralIds,
    createdAt: Date.now(),
  }
  saveState({ loans: [...state.loans, loan] })
  return { ok: true, coins, loan }
}

export function repayLoan(loanId: string, amount: number): LoanResult {
  const state = getState()
  const loan = state.loans.find((l) => l.id === loanId)
  if (!loan) return { ok: false, reason: 'Loan not found.' }
  const pay = Math.min(amount, loan.remaining)
  if (pay <= 0) return { ok: false, reason: 'Nothing to repay.' }
  const unlimited = getProfile().openedCard === 'aesculapius'
  const balance = getCoins()
  if (!unlimited && balance < pay) {
    return {
      ok: false,
      reason: 'Insufficient balance — repayment would take your balance below 0.',
    }
  }
  const coins = unlimited ? balance : addCoins(-pay)
  const remaining = Math.max(0, loan.remaining - pay)
  const settled = remaining <= 0
  const loans = settled
    ? state.loans.filter((l) => l.id !== loanId)
    : state.loans.map((l) => (l.id === loanId ? { ...l, remaining } : l))
  saveState({ loans })
  return { ok: true, coins, settled, loan: { ...loan, remaining } }
}

export type InvestResult = { ok: true; coins?: number; investment?: OpenInvestment } | { ok: false; reason: string }

export function openInvestment(product: InvestProduct, amount: number): InvestResult {
  const def = getInvestProduct(product)
  const { openedCard } = getProfile()
  if (!openedCard) return { ok: false, reason: 'Open a card first.' }
  if (amount <= 0) return { ok: false, reason: 'Enter a positive amount.' }
  const balance = (function () {
    try {
      // re-read coins without a circular import leak
      return parseInt(localStorage.getItem(STORAGE_KEYS.COINS) ?? '0', 10) || 0
    } catch {
      return 0
    }
  })()
  if (amount > balance) return { ok: false, reason: 'Not enough coins.' }
  const coins = addCoins(-amount)
  const investment: OpenInvestment = {
    id: uid(),
    product,
    principal: amount,
    apyPct: def.apyPct,
    periodDays: def.periodDays,
    elapsedDays: 0,
    matured: false,
    withdrawn: false,
    createdAt: Date.now(),
  }
  const state = getState()
  saveState({ investments: [...state.investments, investment] })
  return { ok: true, coins, investment }
}

/** Advance an investment by a number of simulated days (user-triggered). */
export function advanceInvestment(investmentId: string, days: number): InvestResult {
  const state = getState()
  const inv = state.investments.find((i) => i.id === investmentId)
  if (!inv) return { ok: false, reason: 'Investment not found.' }
  const elapsedDays = Math.min(inv.periodDays, inv.elapsedDays + Math.max(0, days))
  const matured = elapsedDays >= inv.periodDays
  const investments = state.investments.map((i) =>
    i.id === investmentId ? { ...i, elapsedDays, matured } : i
  )
  saveState({ investments })
  return { ok: true }
}

/** Withdraw a matured investment: returns principal + projected interest. */
export function withdrawInvestment(investmentId: string): InvestResult {
  const state = getState()
  const inv = state.investments.find((i) => i.id === investmentId)
  if (!inv) return { ok: false, reason: 'Investment not found.' }
  if (!inv.matured) return { ok: false, reason: 'Not matured yet — advance more days.' }
  if (inv.withdrawn) return { ok: false, reason: 'Already withdrawn.' }
  const interest = projectReturn(inv.principal, inv.apyPct, inv.periodDays)
  const payout = Math.round(inv.principal + interest)
  const coins = addCoins(payout)
  const investments = state.investments.map((i) =>
    i.id === investmentId ? { ...i, withdrawn: true } : i
  )
  saveState({ investments })
  return { ok: true, coins }
}

/* ------------------------------------------------------------------ */
/*  Life insurance mutations                                          */
/* ------------------------------------------------------------------ */

export type LifeResult = { ok: true; coins?: number; policy?: LifePolicy; matured?: boolean } | { ok: false; reason: string }

export function openLifePolicy(params: LifeParams = LIFE_PRESET): LifeResult {
  const { openedCard } = getProfile()
  if (!openedCard) return { ok: false, reason: 'Open a card first.' }
  const balance = parseInt(localStorage.getItem(STORAGE_KEYS.COINS) ?? '0', 10) || 0
  if (params.premium > balance) return { ok: false, reason: 'Not enough coins for the premium.' }
  const coins = addCoins(-params.premium)
  const policy: LifePolicy = { params, elapsedDays: 0, matured: false, createdAt: Date.now() }
  saveState({ lifePolicy: policy })
  return { ok: true, coins, policy }
}

/** Advance the life policy by one day; pays the daily annuity, maturity at end. */
export function advanceLifeDay(): LifeResult {
  const state = getState()
  const policy = state.lifePolicy
  if (!policy) return { ok: false, reason: 'No active life policy.' }
  if (policy.matured) return { ok: false, reason: 'Policy already matured.' }
  const nextDay = policy.elapsedDays + 1
  const annuity = policy.params.dailyAnnuity
  const atEnd = nextDay >= policy.params.termDays
  let coins: number | undefined
  let payout = annuity
  if (atEnd) payout += policy.params.maturity
  coins = addCoins(payout)
  const updated: LifePolicy = { ...policy, elapsedDays: nextDay, matured: atEnd }
  saveState({ lifePolicy: updated })
  window.dispatchEvent(new CustomEvent(HYPERGRID_COINS_CHANGED))
  return { ok: true, coins, policy: updated, matured: atEnd }
}

export function cancelLifePolicy(): { ok: true } {
  saveState({ lifePolicy: null })
  return { ok: true }
}

/* ------------------------------------------------------------------ */
/*  One-time protection perks                                         */
/* ------------------------------------------------------------------ */

export type PerkKey = 'noRatingLoss' | 'noCoinLoss'

/** Price (coins) of each one-time protection perk. */
export const PERK_PRICES: Record<PerkKey, number> = {
  noRatingLoss: 5000,
  noCoinLoss: 3000,
}

export type PerkResult = { ok: true; coins: number } | { ok: false; reason: string }

/**
 * Purchase a one-time protection perk. Each perk may only be bought once;
 * once owned it is held as "active" until an actual defeat consumes it.
 * (No ELO/loss system is wired up yet, so consumption is frontend-only.)
 */
export function purchasePerk(key: PerkKey): PerkResult {
  const { openedCard } = getProfile()
  if (!openedCard) return { ok: false, reason: 'Open a card first.' }
  const state = getState()
  if (state.toggles[key]) return { ok: false, reason: 'Already owned — single use only.' }
  const balance = parseInt(localStorage.getItem(STORAGE_KEYS.COINS) ?? '0', 10) || 0
  if (PERK_PRICES[key] > balance) return { ok: false, reason: 'Not enough coins.' }
  const coins = addCoins(-PERK_PRICES[key])
  saveState({ toggles: { ...state.toggles, [key]: true } })
  return { ok: true, coins }
}

export function perkOwned(key: PerkKey): boolean {
  return !!getState().toggles[key]
}
