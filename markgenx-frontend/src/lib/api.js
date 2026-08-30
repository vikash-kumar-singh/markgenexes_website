import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const TOKEN_KEY = 'markgenx:tokens'
const LEAD_QUEUE_KEY = 'markgenx:lead_queue'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

const endpointMap = {
  contact: ['/forms/contact-enquiries', '/leads'],
  consultation: ['/forms/consultation-bookings', '/leads'],
  service: ['/v1/public/service-enquiries', '/forms/service-enquiries', '/leads'],
  career: ['/careers/applications'],
  partner: ['/partnerships/applications'],
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getTokens() {
  return readJson(TOKEN_KEY, null)
}

export function setTokens(tokens) {
  writeJson(TOKEN_KEY, tokens)
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
}

function serverErrorMessage(error) {
  const message = error.response?.data?.error || error.response?.data?.message
  if (typeof message !== 'string' || !message.trim()) return ''
  if (/^request failed with status code \d+$/i.test(message.trim())) return ''
  return message.trim()
}

export function getApiError(error, fallback = 'We could not complete your request. Please try again.') {
  const message = serverErrorMessage(error)
  if (message) return message

  if (error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '')) {
    return 'The request took too long. Please check your connection and try again.'
  }

  const status = error?.response?.status
  const statusMessages = {
    400: 'Please check the information you entered and try again.',
    401: 'Your session has expired. Please sign in and try again.',
    403: 'You do not have permission to complete this action.',
    404: 'The requested information is currently unavailable.',
    408: 'The request took too long. Please try again.',
    409: 'This request conflicts with an existing record. Please refresh and try again.',
    413: 'The selected file or request is too large.',
    429: 'Too many requests were sent. Please wait a moment and try again.',
    500: 'Something went wrong while processing your request. Please try again.',
    502: 'The service is temporarily unavailable. Please try again in a moment.',
    503: 'The service is temporarily unavailable. Please try again in a moment.',
    504: 'The service is taking longer than expected. Please try again shortly.',
  }
  if (statusMessages[status]) return statusMessages[status]
  if (!error?.response && axios.isAxiosError(error)) {
    return 'We could not connect to the service. Please check your internet connection and try again.'
  }
  if (!axios.isAxiosError(error) && error?.message) return error.message
  return fallback
}

function normalizedApiError(error, fallback) {
  const normalized = new Error(getApiError(error, fallback), { cause: error })
  normalized.status = error?.response?.status || null
  normalized.code = error?.code || null
  normalized.retryable =
    !error?.response ||
    [408, 425, 429, 500, 502, 503, 504].includes(error.response.status)
  return normalized
}

async function refreshAccessToken() {
  const tokens = getTokens()
  if (!tokens?.refreshToken) {
    throw new Error('Session expired')
  }

  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/auth/refresh-token`,
      { refreshToken: tokens.refreshToken },
      {
        timeout: 15000,
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      },
    )
    setTokens({ ...tokens, accessToken: data.accessToken })
    return data.accessToken
  } catch (error) {
    if ([400, 401, 403].includes(error.response?.status)) clearTokens()
    throw normalizedApiError(error, 'We could not refresh your session. Please try again.')
  }
}

apiClient.interceptors.request.use((config) => {
  const tokens = getTokens()
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const authenticatedRequest = Boolean(originalRequest?.headers?.Authorization)
    if (error.response?.status === 401 && authenticatedRequest && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      const accessToken = await refreshAccessToken()
      originalRequest.headers.Authorization = `Bearer ${accessToken}`
      return apiClient(originalRequest)
    }

    throw normalizedApiError(error)
  },
)

export function getLeadQueue() {
  return readJson(LEAD_QUEUE_KEY, [])
}

export function updateLeadQueue(leads) {
  writeJson(LEAD_QUEUE_KEY, leads)
}

export async function getLeads() {
  const data = await request('/leads')
  return data.leads || []
}

export async function getServiceEnquiries() {
  const data = await request('/v1/admin/service-enquiries')
  return data.enquiries || []
}

export async function getPublicIndustries() {
  const data = await request('/v1/public/industries')
  return data.managed ? data.industries || [] : null
}

export async function getAdminIndustries() {
  const data = await request('/v1/admin/industries')
  return data.industries || []
}

export async function createIndustry(payload) {
  const data = await request('/v1/admin/industries', { method: 'POST', body: payload })
  return data.industry
}

export async function updateIndustry(id, payload) {
  const data = await request(`/v1/admin/industries/${id}`, { method: 'PATCH', body: payload })
  return data.industry
}

export async function deleteIndustry(id) {
  return request(`/v1/admin/industries/${id}`, { method: 'DELETE' })
}

export async function getPublicJobs() { const data = await request('/v1/public/jobs'); return data.jobs || [] }
export async function getPublicCaseStudies() { const data = await request('/v1/public/case-studies'); return data.caseStudies || [] }
export async function getPublicPartners() { const data = await request('/v1/public/partners'); return data.partners || [] }
export async function getAdminPartners() { const data = await request('/v1/admin/partners'); return data.partners || [] }
export async function createPartner(payload) { const data = await request('/v1/admin/partners', { method: 'POST', body: payload }); return data.partner }
export async function updatePartner(id, payload) { const data = await request(`/v1/admin/partners/${id}`, { method: 'PATCH', body: payload }); return data.partner }
export async function deletePartner(id) { return request(`/v1/admin/partners/${id}`, { method: 'DELETE' }) }
export async function getAdminCaseStudies() { const data = await request('/v1/admin/case-studies'); return data.caseStudies || [] }
export async function createCaseStudy(payload) { const data = await request('/v1/admin/case-studies', { method: 'POST', body: payload }); return data.caseStudy }
export async function updateCaseStudy(id, payload) { const data = await request(`/v1/admin/case-studies/${id}`, { method: 'PATCH', body: payload }); return data.caseStudy }
export async function deleteCaseStudy(id) { return request(`/v1/admin/case-studies/${id}`, { method: 'DELETE' }) }
export async function uploadCaseStudyImage(file) { const form = new FormData(); form.append('image', file); const { data } = await apiClient.post('/v1/admin/case-studies/images', form, { headers: { 'Content-Type': 'multipart/form-data' } }); return data.image }
export async function getPublicTracking() { const data = await request('/v1/public/tracking'); return data.tracking || {} }
export async function recordTrackingEvent(payload) { return request('/v1/public/tracking/events', { method: 'POST', body: payload }) }
export async function getTrackingSettings() { const data = await request('/v1/admin/tracking'); return data.tracking || {} }
export async function saveTrackingSettings(payload) { const data = await request('/v1/admin/tracking', { method: 'PUT', body: payload }); return data.tracking }
export async function getTrackingReport(days = 30) { return request(`/v1/admin/tracking/report?days=${days}`) }
export async function submitJobApplication(jobId, payload) { const form = new FormData(); ['fullName', 'email', 'phone', 'experience', 'portfolio'].forEach((key) => form.append(key, payload[key] || '')); form.append('resume', payload.resume); return request(`/v1/public/jobs/${jobId}/applications`, { method: 'POST', body: form, headers: { 'Content-Type': undefined } }) }
export async function getAdminJobs() { const data = await request('/v1/admin/jobs'); return data.jobs || [] }
export async function createJob(payload) { const data = await request('/v1/admin/jobs', { method: 'POST', body: payload }); return data.job }
export async function updateJob(id, payload) { const data = await request(`/v1/admin/jobs/${id}`, { method: 'PATCH', body: payload }); return data.job }
export async function deleteJob(id) { return request(`/v1/admin/jobs/${id}`, { method: 'DELETE' }) }
export async function getJobApplications(params = {}) { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value)); const data = await request(`/v1/admin/job-applications${query.size ? `?${query}` : ''}`); return data.applications || [] }
export async function updateJobApplication(id, status) { return request(`/v1/admin/job-applications/${id}`, { method: 'PATCH', body: { status } }) }
export async function syncCareerMailbox() { return request('/v1/admin/job-applications/sync', { method: 'POST' }) }
export async function getApplicationResume(id, download = false) { const { data } = await apiClient.get(`/v1/admin/job-applications/${id}/resume${download ? '?download=1' : ''}`, { responseType: 'blob' }); return data }

export async function updateLead(id, patch) {
  const data = await request(`/leads/${id}`, { method: 'PATCH', body: patch })
  return data.lead
}

export function getTrackingData() {
  const params = new URLSearchParams(window.location.search)
  const utm = Object.fromEntries(
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
      .map((key) => [key, params.get(key)])
      .filter(([, value]) => value),
  )

  return {
    leadSource: params.get('source') || utm.utm_source || document.referrer || 'direct',
    campaignSource: utm.utm_campaign || params.get('campaign') || '',
    utm,
    gclid: params.get('gclid') || '',
    fbclid: params.get('fbclid') || '',
    pagePath: window.location.pathname,
    referrer: document.referrer,
    enquiredAt: new Date().toISOString(),
  }
}

function trackLeadConversion(lead) {
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({
    event: 'lead_submission',
    leadType: lead.type,
    requiredService: lead.requiredService,
    leadSource: lead.leadSource,
    campaignSource: lead.campaignSource,
    utm: lead.utm,
  })

  window.dispatchEvent(new CustomEvent('markgenx:conversion', { detail: { eventName: lead.type === 'consultation' ? 'consultation_booking' : lead.type === 'service' ? 'service_enquiry' : 'lead_submission', properties: { leadType: lead.type, requiredService: lead.requiredService } } }))
}

async function request(path, options = {}) {
  const { data } = await apiClient.request({
    url: path,
    method: options.method || 'GET',
    data: options.body,
    headers: options.headers,
  })
  return data
}

export async function login(credentials) {
  const data = await request('/auth/login', { method: 'POST', body: credentials })
  setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
  return data
}

export async function register(payload) {
  return request('/auth/register', { method: 'POST', body: payload })
}

export async function getCurrentUser() {
  return request('/auth/me')
}

export async function logout() {
  const tokens = getTokens()
  try {
    await request('/auth/logout', { method: 'POST', body: { refreshToken: tokens?.refreshToken } })
  } finally {
    clearTokens()
  }
}

export async function submitLead(type, payload) {
  const lead = {
    id: crypto.randomUUID(),
    type,
    leadStatus: 'new',
    assignedTo: '',
    notes: [],
    ...payload,
    ...getTrackingData(),
  }

  const endpoints = endpointMap[type] || ['/leads']
  for (const endpoint of endpoints) {
    try {
      const result = await request(endpoint, { method: 'POST', body: lead })
      const savedLead = result.lead || lead
      trackLeadConversion(savedLead)
      return { queued: false, lead: savedLead, result }
    } catch (error) {
      if (!error.retryable && ![404, 405].includes(error.status)) throw error
    }
  }

  const queue = getLeadQueue()
  updateLeadQueue([lead, ...queue])
  trackLeadConversion(lead)
  return { queued: true, lead }
}
