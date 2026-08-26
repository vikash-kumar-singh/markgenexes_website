import { getPublicTracking, recordTrackingEvent } from './api'

const VISITOR_KEY = 'markgenx:visitor_id'
const SESSION_KEY = 'markgenx:session_id'
let config = null
let initialized = false
let lastPageEvent = { key: '', at: 0 }
const identifier = (key) => { let value = sessionStorage.getItem(key) || localStorage.getItem(key); if (!value) value = crypto.randomUUID(); key === SESSION_KEY ? sessionStorage.setItem(key, value) : localStorage.setItem(key, value); return value }
const attribution = () => { const params = new URLSearchParams(location.search); return { utm: { source: params.get('utm_source') || '', medium: params.get('utm_medium') || '', campaign: params.get('utm_campaign') || '', term: params.get('utm_term') || '', content: params.get('utm_content') || '' }, gclid: params.get('gclid') || '', fbclid: params.get('fbclid') || '' } }
function script(id, src) { if (document.getElementById(id)) return; const element = document.createElement('script'); element.id = id; element.async = true; element.src = src; document.head.appendChild(element) }
const cleanMetaValue = (value, max = 200) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max)

function interactionProperties(element) {
  const isLink = element.tagName === 'A'
  const label = cleanMetaValue(
    element.getAttribute('aria-label') ||
      element.getAttribute('title') ||
      element.textContent ||
      (isLink ? 'Link' : 'Button'),
    100,
  )

  return {
    content_name: label || (isLink ? 'Link' : 'Button'),
    content_category: isLink ? 'link' : 'button',
    element_id: cleanMetaValue(element.id, 100),
    destination: isLink ? cleanMetaValue(element.getAttribute('href'), 500) : '',
    page_path: `${location.pathname}${location.search}`,
  }
}

export async function trackMetaInteraction(eventName, properties = {}) {
  const active = config || await initializeTracking()
  if (!active.facebookPixelEnabled || !window.fbq) return
  window.fbq('trackCustom', eventName, properties)
}

function observeInteractions() {
  if (window.__markgenxMetaInteractionListener) return
  window.__markgenxMetaInteractionListener = true

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return
    const element = event.target instanceof Element ? event.target.closest('button, a') : null
    if (!element || element.matches(':disabled, [aria-disabled="true"]')) return
    const eventName = element.tagName === 'A' ? 'LinkClick' : 'ButtonClick'
    trackMetaInteraction(eventName, interactionProperties(element)).catch(() => {})
  })
}
export async function initializeTracking() {
  if (initialized) return config || {}
  initialized = true
  try { config = await getPublicTracking() } catch { config = {} }
  const envPixelId = String(import.meta.env.VITE_META_PIXEL_ID || '').trim()
  if (/^\d{5,25}$/.test(envPixelId)) {
    config = {
      ...config,
      facebookPixelId: envPixelId,
      facebookPixelEnabled: true,
      trackPageViews: true,
      trackConversions: true,
    }
  }
  if (config.googleAnalyticsEnabled && config.googleAnalyticsId) { window.dataLayer = window.dataLayer || []; window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments) }; window.gtag('js', new Date()); window.gtag('config', config.googleAnalyticsId, { send_page_view: false }); script('markgenx-ga4', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.googleAnalyticsId)}`) }
  if (config.facebookPixelEnabled && config.facebookPixelId) { window.fbq = window.fbq || function fbq(){ window.fbq.callMethod ? window.fbq.callMethod(...arguments) : window.fbq.queue.push(arguments) }; window.fbq.queue = window.fbq.queue || []; window.fbq.loaded = true; window.fbq.version = '2.0'; window.fbq('init', config.facebookPixelId); script('markgenx-meta', 'https://connect.facebook.net/en_US/fbevents.js') }
  observeInteractions()
  if (!window.__markgenxTrackingListener) { window.__markgenxTrackingListener = true; window.addEventListener('markgenx:conversion', (event) => trackEvent(event.detail.eventName, event.detail.properties)) }
  return config
}
export async function trackEvent(eventName, properties = {}) {
  const active = config || await initializeTracking()
  const conversion = eventName !== 'page_view'
  if (eventName === 'page_view' && active.trackPageViews === false) return
  if (conversion && active.trackConversions === false) return
  if (eventName === 'page_view') { const key = `${location.pathname}${location.search}`; if (lastPageEvent.key === key && Date.now() - lastPageEvent.at < 1000) return; lastPageEvent = { key, at: Date.now() } }
  const payload = { eventName, pagePath: `${location.pathname}${location.search}`, referrer: document.referrer, language: navigator.language, anonymousId: identifier(VISITOR_KEY), sessionId: identifier(SESSION_KEY), ...attribution(), ...properties }
  if (active.firstPartyEnabled !== false) recordTrackingEvent(payload).catch(() => {})
  if (active.googleAnalyticsEnabled && window.gtag) window.gtag('event', eventName, properties)
  if (active.facebookPixelEnabled && window.fbq) window.fbq('track', conversion ? 'Lead' : 'PageView', properties)
}
