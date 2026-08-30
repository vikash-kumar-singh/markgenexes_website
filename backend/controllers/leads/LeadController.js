import { EventEmitter } from "events";
import mongoose from "mongoose";
import {
  AnalyticsEvent,
  ContactEnquiry,
  ConsultationBooking,
  CrmCompany,
  CrmContact,
  CrmSyncLog,
  FormDefinition,
  FormSubmission,
  IntegrationSetting,
  Lead,
  LeadActivity,
  LeadAssignmentRule,
  LeadTask,
  Membership,
  Organization,
  Service,
  Site,
  User,
  UserNotification,
} from "../../models/index.js";

const DEFAULT_ORG_SLUG = "markgenexes";
const DEFAULT_SITE_SUBDOMAIN = "markgenexes";
const RATE_LIMIT_WINDOW_MS = Number(process.env.PUBLIC_LEAD_RATE_WINDOW_MS || 15 * 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.PUBLIC_LEAD_RATE_LIMIT || 20);
const rateBuckets = new Map();
export const leadEvents = new EventEmitter();

const statusFromClient = {
  new: "new",
  contacted: "contacted",
  qualified: "qualified",
  won: "converted",
  converted: "converted",
  lost: "lost",
  archived: "archived",
};

const statusToClient = {
  converted: "won",
};

function slugify(value) {
  return String(value || "general")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstPresent(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ""),
  );
}

function splitName(name = "") {
  const parts = asString(name).split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "Website",
    lastName: parts.slice(1).join(" ") || "Lead",
  };
}

function normalizeEmail(email) {
  return asString(email).toLowerCase();
}

function normalizePhone(phone) {
  const raw = asString(phone);
  if (!raw) return "";
  return raw.replace(/[^\d]/g, "");
}

function normalizeUtm(payload = {}) {
  const utm = payload.utm || {};
  return {
    source: firstPresent(payload.utm_source, utm.utm_source, utm.source),
    medium: firstPresent(payload.utm_medium, utm.utm_medium, utm.medium),
    campaign: firstPresent(payload.utm_campaign, utm.utm_campaign, utm.campaign),
    term: firstPresent(payload.utm_term, utm.utm_term, utm.term),
    content: firstPresent(payload.utm_content, utm.utm_content, utm.content),
  };
}

function normalizeConsent(payload, req) {
  const consent = payload.consent || {};
  return {
    marketing: Boolean(consent.marketing ?? payload.marketingConsent ?? payload.consentMarketing),
    privacyPolicy: Boolean(consent.privacyPolicy ?? payload.privacyPolicyConsent ?? payload.privacyConsent),
    terms: Boolean(consent.terms ?? payload.termsConsent),
    text: firstPresent(consent.text, payload.consentText),
    capturedAt: new Date(),
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

function normalizePayload(payload = {}, req, submissionType) {
  const name = firstPresent(payload.name, payload.fullName, payload.contactName);
  const email = normalizeEmail(firstPresent(payload.email, payload.emailAddress));
  const phone = firstPresent(payload.phone, payload.mobile, payload.phoneNumber);
  const requiredService = firstPresent(payload.requiredService, payload.service, payload.serviceName);
  const serviceId = firstPresent(payload.serviceId);
  const serviceSlug = firstPresent(payload.serviceSlug);
  const message = firstPresent(payload.message, payload.noteText, payload.notes);
  const businessRequirement = firstPresent(payload.businessRequirement, payload.requirement, payload.requirements, message);
  const utm = normalizeUtm(payload);
  const normalizedPhone = normalizePhone(phone);

  return {
    raw: payload,
    submissionType,
    idempotencyKey: firstPresent(req.get("idempotency-key"), payload.idempotencyKey),
    name,
    email,
    normalizedEmail: email,
    phone: asString(phone),
    normalizedPhone,
    companyName: firstPresent(payload.companyName, payload.company),
    industry: firstPresent(payload.industry),
    requiredService,
    serviceId,
    serviceSlug,
    budgetRange: firstPresent(payload.budgetRange, payload.budget),
    city: firstPresent(payload.city, payload.cityOrLocation),
    state: firstPresent(payload.state, payload.region),
    country: firstPresent(payload.country),
    message,
    businessRequirement,
    leadSource: firstPresent(payload.leadSource, payload.source, "website_form"),
    campaignSource: firstPresent(payload.campaignSource, payload.campaign_source),
    landingPage: firstPresent(payload.landingPage, payload.pageUrl, req.get("origin")),
    referrer: firstPresent(payload.referrer, req.get("referer")),
    gclid: firstPresent(payload.gclid, payload.googleClickId),
    fbclid: firstPresent(payload.fbclid, payload.metaClickId, payload.fbc),
    priority: firstPresent(payload.priority, "medium").toLowerCase(),
    followUpDate: firstPresent(payload.followUpDate, payload.nextFollowUp),
    leadStatus: firstPresent(payload.leadStatus, payload.status, "new").toLowerCase(),
    utm,
    consent: normalizeConsent(payload, req),
  };
}

function validateLeadRequest(input) {
  const errors = [];
  if (!input.name) errors.push("Name is required");
  if (!input.email && !input.normalizedPhone) errors.push("Email or phone is required");
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.push("Email is invalid");
  if (input.phone && input.normalizedPhone.length < 7) errors.push("Phone is invalid");
  if (!["low", "medium", "high", "urgent"].includes(input.priority)) errors.push("Priority is invalid");
  if (input.followUpDate && Number.isNaN(new Date(input.followUpDate).getTime())) {
    errors.push("Follow-up date is invalid");
  }
  return errors;
}

function checkRateLimit(req) {
  const now = Date.now();
  const key = `${req.ip || "unknown"}:${req.path}`;
  const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  bucket.count += 1;
  rateBuckets.set(key, bucket);

  if (rateBuckets.size > 10000) {
    for (const [bucketKey, value] of rateBuckets.entries()) {
      if (value.resetAt <= now) rateBuckets.delete(bucketKey);
    }
  }

  return {
    allowed: bucket.count <= RATE_LIMIT_MAX,
    retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

function runSpamChecks(input) {
  const reasons = [];
  const text = Object.values(input.raw || {}).join(" ").toLowerCase();
  const linkCount = (text.match(/https?:\/\//g) || []).length;
  const honeypot = firstPresent(input.raw.website, input.raw.url, input.raw._gotcha, input.raw.companyWebsiteHidden);

  if (honeypot) reasons.push("honeypot field was filled");
  if (linkCount > 4) reasons.push("too many links");
  if (/(casino|crypto profit|viagra|loan approval|seo backlink package)/i.test(text)) reasons.push("spam keyword detected");
  if (input.message && /(.)\1{12,}/.test(input.message)) reasons.push("repeated characters detected");

  return {
    flagged: reasons.length > 0,
    reasons,
    score: reasons.length,
  };
}

async function getDefaultWorkspace() {
  const organization = await Organization.findOneAndUpdate(
    { slug: DEFAULT_ORG_SLUG },
    {
      $setOnInsert: {
        name: "MarkGenexes",
        slug: DEFAULT_ORG_SLUG,
        industry: "Technology",
        status: "active",
      },
    },
    { returnDocument: "after", upsert: true },
  );

  const site = await Site.findOneAndUpdate(
    { subdomain: DEFAULT_SITE_SUBDOMAIN },
    {
      $setOnInsert: {
        organization: organization._id,
        name: "MarkGenexes Website",
        subdomain: DEFAULT_SITE_SUBDOMAIN,
        status: "published",
        isLive: true,
        publishedAt: new Date(),
      },
    },
    { returnDocument: "after", upsert: true },
  );

  return { organization, site };
}

async function getForm(site, type) {
  const slug = slugify(type || "lead");
  return FormDefinition.findOneAndUpdate(
    { site: site._id, slug },
    {
      $setOnInsert: {
        site: site._id,
        name: `${slug.replace(/-/g, " ")} form`,
        slug,
        status: "published",
        captchaEnabled: false,
      },
    },
    { returnDocument: "after", upsert: true },
  );
}

async function getService(site, { serviceId, serviceSlug, requiredService }) {
  if (serviceId && mongoose.Types.ObjectId.isValid(serviceId)) {
    const service = await Service.findOne({ _id: serviceId, site: site._id });
    if (service) return service;
  }

  const slug = slugify(serviceSlug || requiredService);
  if (!slug) return null;

  return Service.findOneAndUpdate(
    { site: site._id, slug },
    {
      $setOnInsert: {
        site: site._id,
        name: requiredService || serviceSlug,
        slug,
        status: "active",
      },
    },
    { returnDocument: "after", upsert: true },
  );
}

function matchesRuleCondition(rule, input) {
  if (!rule.condition?.field) return true;
  const actual = String(input[rule.condition.field] ?? input.raw?.[rule.condition.field] ?? "").toLowerCase();
  const expected = rule.condition.value;
  const expectedValues = Array.isArray(expected) ? expected.map((item) => String(item).toLowerCase()) : [String(expected).toLowerCase()];

  if (rule.condition.operator === "contains") return expectedValues.some((value) => actual.includes(value));
  if (rule.condition.operator === "starts_with") return expectedValues.some((value) => actual.startsWith(value));
  if (rule.condition.operator === "is_in") return expectedValues.includes(actual);
  return expectedValues.includes(actual);
}

async function assignSalesExecutive(organizationId, input) {
  const rules = await LeadAssignmentRule.find({
    organization: organizationId,
    enabled: true,
    assignees: { $exists: true, $ne: [] },
  }).sort({ priority: 1, createdAt: 1 });

  for (const rule of rules) {
    if (!matchesRuleCondition(rule, input)) continue;

    if (rule.ruleType === "workload_based") {
      const workloads = await Promise.all(
        rule.assignees.map(async (assignee) => ({
          assignee,
          count: await Lead.countDocuments({
            organization: organizationId,
            assignedTo: assignee,
            status: { $in: ["new", "contacted", "qualified"] },
          }),
        })),
      );
      workloads.sort((a, b) => a.count - b.count);
      return workloads[0]?.assignee || null;
    }

    if (rule.ruleType === "round_robin") {
      const index = Number(rule.roundRobinIndex || 0) % rule.assignees.length;
      const assignee = rule.assignees[index];
      await LeadAssignmentRule.updateOne({ _id: rule._id }, { $set: { roundRobinIndex: index + 1 } });
      return assignee;
    }

    return rule.assignees[0];
  }

  const membership = await Membership.findOne({ organization: organizationId, status: "active" }).sort({ createdAt: 1 });
  return membership?.user || null;
}

function buildLeadSet(input, organization, site, service, assignee) {
  const { firstName, lastName } = splitName(input.name);
  return compactObject({
    site: site._id,
    organization: organization._id,
    firstName,
    lastName,
    email: input.email,
    phone: input.phone,
    normalizedEmail: input.normalizedEmail,
    normalizedPhone: input.normalizedPhone,
    company: input.companyName,
    industry: input.industry,
    budgetRange: input.budgetRange,
    city: input.city,
    state: input.state,
    country: input.country,
    businessRequirement: input.businessRequirement,
    service: service?._id,
    source: "website_form",
    attribution: {
      source: input.leadSource || input.utm.source || "direct",
      medium: input.utm.medium,
      campaign: input.utm.campaign,
      term: input.utm.term,
      content: input.utm.content,
      campaignSource: input.campaignSource,
      landingPage: input.landingPage,
      referrer: input.referrer,
      gclid: input.gclid,
      fbclid: input.fbclid,
    },
    status: statusFromClient[input.leadStatus] || "new",
    assignedTo: assignee,
    priority: input.priority,
    consent: input.consent,
    notes: input.message,
    lastActivity: new Date(),
    nextFollowUp: input.followUpDate ? new Date(input.followUpDate) : undefined,
  });
}

function duplicateQuery(input, organizationId) {
  const clauses = [];
  if (input.normalizedEmail) clauses.push({ normalizedEmail: input.normalizedEmail });
  if (input.normalizedPhone) clauses.push({ normalizedPhone: input.normalizedPhone });
  if (!clauses.length) return null;
  return { organization: organizationId, $or: clauses };
}

function toClientLead(lead) {
  const serviceName = lead.service?.name || "";
  const submission = lead.submission?.data || {};
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim();

  return {
    id: String(lead._id),
    name: submission.name || name,
    phone: lead.phone || submission.phone || "",
    email: lead.email || submission.email || "",
    companyName: lead.company || submission.companyName || "",
    industry: lead.industry || submission.industry || "",
    requiredService: submission.requiredService || serviceName || "",
    serviceId: lead.service?._id ? String(lead.service._id) : "",
    serviceSlug: lead.service?.slug || submission.serviceSlug || "",
    budgetRange: lead.budgetRange || submission.budgetRange || "",
    city: lead.city || submission.city || submission.cityOrLocation || "",
    state: lead.state || submission.state || "",
    country: lead.country || submission.country || "",
    message: submission.message || lead.notes || "",
    businessRequirement: lead.businessRequirement || submission.businessRequirement || "",
    leadSource: lead.attribution?.source || submission.leadSource || "direct",
    campaignSource: lead.attribution?.campaignSource || submission.campaignSource || "",
    utmSource: lead.attribution?.source || "",
    utmMedium: lead.attribution?.medium || "",
    utmCampaign: lead.attribution?.campaign || "",
    utmTerm: lead.attribution?.term || "",
    utmContent: lead.attribution?.content || "",
    landingPage: lead.attribution?.landingPage || "",
    referrer: lead.attribution?.referrer || "",
    gclid: lead.attribution?.gclid || "",
    fbclid: lead.attribution?.fbclid || "",
    dateTime: lead.createdAt,
    enquiredAt: lead.createdAt,
    leadStatus: statusToClient[lead.status] || lead.status || "new",
    assignedEmployee: lead.assignedTo || null,
    followUpDate: lead.nextFollowUp || null,
    priority: lead.priority || "medium",
    consent: lead.consent || {},
    noteText: lead.notes || "",
    type: submission.type || submission.submissionType || "lead",
  };
}

function toClientServiceEnquiry(submission) {
  const data = submission.data || {};
  const lead = submission.lead || {};
  const service = submission.service || lead.service || {};
  const name = data.name || [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim();

  return {
    id: String(submission._id),
    submissionId: String(submission._id),
    leadId: lead._id ? String(lead._id) : "",
    type: "service_enquiry",
    name,
    email: submission.email || lead.email || data.email || "",
    phone: submission.phone || lead.phone || data.phone || "",
    companyName: data.companyName || lead.company || "",
    industry: data.industry || lead.industry || "",
    serviceId: service._id ? String(service._id) : data.serviceId || "",
    serviceSlug: service.slug || data.serviceSlug || slugify(data.requiredService),
    requiredService: service.name || data.requiredService || "",
    budgetRange: data.budgetRange || lead.budgetRange || "",
    message: data.message || data.businessRequirement || lead.businessRequirement || lead.notes || "",
    businessRequirement: data.businessRequirement || data.message || lead.businessRequirement || "",
    cityOrLocation: data.cityOrLocation || data.city || lead.city || "",
    leadSource: data.leadSource || lead.attribution?.source || "direct",
    campaignSource: data.campaignSource || lead.attribution?.campaignSource || "",
    leadStatus: statusToClient[lead.status] || lead.status || "new",
    priority: lead.priority || "medium",
    assignedTo: lead.assignedTo || null,
    enquiredAt: submission.createdAt,
    processedAt: submission.processedAt,
    submissionStatus: submission.status,
  };
}

function populateLead(query) {
  return query
    .populate("service")
    .populate("submission")
    .populate("assignedTo", "firstName lastName email role");
}

async function createSubmission({ site, form, service, input, req, status = "processing", spam = null }) {
  return FormSubmission.create({
    site: site._id,
    form: form._id,
    service: service?._id,
    idempotencyKey: input.idempotencyKey || undefined,
    submissionType: input.submissionType,
    data: {
      ...input.raw,
      name: input.name,
      companyName: input.companyName,
      requiredService: input.requiredService,
      serviceId: service?._id ? String(service._id) : input.serviceId,
      serviceSlug: service?.slug || input.serviceSlug,
      budgetRange: input.budgetRange,
      city: input.city,
      state: input.state,
      country: input.country,
      message: input.message,
      businessRequirement: input.businessRequirement,
      leadSource: input.leadSource,
      campaignSource: input.campaignSource,
      landingPage: input.landingPage,
      type: input.submissionType,
    },
    email: input.email,
    normalizedEmail: input.normalizedEmail,
    phone: input.phone,
    normalizedPhone: input.normalizedPhone,
    name: input.name,
    utm: input.utm,
    gclid: input.gclid,
    fbclid: input.fbclid,
    landingPage: input.landingPage,
    referrer: input.referrer,
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
    language: req.get("accept-language"),
    country: input.country,
    city: input.city,
    status,
    spam: spam || undefined,
    consent: input.consent,
  });
}

async function findIdempotentSubmission(site, idempotencyKey) {
  if (!idempotencyKey) return null;
  return FormSubmission.findOne({ site: site._id, idempotencyKey }).populate({
    path: "lead",
    populate: [{ path: "service" }, { path: "submission" }, { path: "assignedTo", select: "firstName lastName email role" }],
  });
}

async function createSpecializedRecord(input, submission, lead, service) {
  if (input.submissionType === "contact" && input.email && input.message) {
    await ContactEnquiry.create({
      submission: submission._id,
      lead: lead._id,
      service: service?._id,
      name: input.name,
      email: input.email,
      phone: input.phone,
      company: input.companyName,
      message: input.message,
      subject: input.raw.subject,
      priority: input.priority,
      assignedTo: lead.assignedTo,
    });
  }

  if (input.submissionType === "consultation" && input.email && input.phone && input.raw.preferredDate && service?._id) {
    await ConsultationBooking.create({
      lead: lead._id,
      service: service._id,
      name: input.name,
      email: input.email,
      phone: input.phone,
      company: input.companyName,
      preferredDate: new Date(input.raw.preferredDate),
      preferredTime: input.raw.preferredTime,
      timezone: input.raw.timezone,
      notes: input.message,
      assignedTo: lead.assignedTo,
    });
  }
}

async function publishLeadCreatedEvent(payload) {
  leadEvents.emit("lead.created", payload);
}

async function sendAsyncNotifications({ leadId, organizationId, duplicate }) {
  const lead = await populateLead(Lead.findById(leadId));
  if (!lead) return;

  const recipients = new Set();
  if (lead.assignedTo?._id) recipients.add(String(lead.assignedTo._id));

  if (!recipients.size) {
    const memberships = await Membership.find({ organization: organizationId, status: "active" }).limit(5);
    memberships.forEach((membership) => recipients.add(String(membership.user)));
  }

  const title = duplicate ? "Lead updated from duplicate submission" : "New lead captured";
  const message = `${[lead.firstName, lead.lastName].filter(Boolean).join(" ")} submitted ${lead.attribution?.source || "a website form"}.`;

  await UserNotification.insertMany(
    [...recipients].map((user) => ({
      user,
      organization: organizationId,
      title,
      message,
      type: duplicate ? "info" : "success",
      category: "lead_activity",
      actionUrl: `/admin/leads/${lead._id}`,
      actionLabel: "View lead",
      metadata: { lead: lead._id, duplicate },
    })),
    { ordered: false },
  ).catch(() => {});
}

async function syncLeadWithCrm({ leadId, organizationId }) {
  const lead = await Lead.findById(leadId);
  if (!lead) return;

  let company = null;
  const companyName = lead.company || `${lead.firstName} ${lead.lastName}`.trim();
  if (companyName) {
    company = await CrmCompany.findOneAndUpdate(
      { organization: organizationId, name: companyName },
      {
        $set: compactObject({
          organization: organizationId,
          name: companyName,
          phone: lead.phone,
          email: lead.email,
          "address.city": lead.city,
          "address.state": lead.state,
          "address.country": lead.country,
          notes: lead.businessRequirement || lead.notes,
        }),
        $addToSet: { leads: lead._id },
      },
      { returnDocument: "after", upsert: true },
    );
  }

  let contact = null;
  if (lead.email && company?._id) {
    contact = await CrmContact.findOneAndUpdate(
      { organization: organizationId, email: lead.email },
      {
        $set: compactObject({
          organization: organizationId,
          company: company._id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          "address.city": lead.city,
          "address.state": lead.state,
          "address.country": lead.country,
          notes: lead.businessRequirement || lead.notes,
        }),
        $addToSet: { leads: lead._id },
      },
      { returnDocument: "after", upsert: true },
    );
  }

  const crmPatch = compactObject({
      crmCompany: company?._id,
      crmContact: contact?._id,
  });

  if (Object.keys(crmPatch).length) {
    await Lead.updateOne({ _id: lead._id }, { $set: crmPatch });
  }

  const integration = await IntegrationSetting.findOne({
    organization: organizationId,
    isActive: true,
    provider: { $in: ["salesforce", "hubspot", "pipedrive", "zoho"] },
  });

  if (integration) {
    await CrmSyncLog.create({
      integration: integration._id,
      entityType: "lead",
      localEntityId: lead._id,
      externalSource: integration.provider,
      action: "sync",
      status: "pending",
      syncedData: lead.toObject(),
      lastAttemptAt: new Date(),
    });
  }
}

async function sendAnalyticsConversionEvent({ leadId, submissionId, siteId, input, req }) {
  await AnalyticsEvent.create({
    site: siteId,
    lead: leadId,
    eventType: "conversion",
    eventName: "lead_created",
    eventProperties: {
      submission: submissionId,
      submissionType: input.submissionType,
      requiredService: input.requiredService,
      budgetRange: input.budgetRange,
      duplicate: Boolean(input.duplicate),
    },
    sessionId: input.raw.sessionId,
    anonymousId: input.raw.anonymousId,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    referrer: input.referrer,
    language: req.get("accept-language"),
    country: input.country,
    city: input.city,
    utm: input.utm,
    gclid: input.gclid,
    fbclid: input.fbclid,
    timestamp: new Date(),
  });
}

function scheduleAsyncSideEffects(context) {
  setImmediate(async () => {
    try {
      await sendAsyncNotifications(context);
      await syncLeadWithCrm(context);
      await sendAnalyticsConversionEvent(context);
    } catch (error) {
      console.error("Lead async workflow failed:", error);
    }
  });
}

function csvEscape(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export class LeadController {
  static async capture(req, res, submissionType = "lead", options = {}) {
    try {
      const input = normalizePayload(req.body || {}, req, submissionType);
      const validationErrors = validateLeadRequest(input);

      if (submissionType === "contact" && !input.message) validationErrors.push("Message is required");
      if (submissionType === "consultation" && !input.requiredService) validationErrors.push("Required service is required");
      if (submissionType === "service_enquiry" && !input.requiredService) validationErrors.push("Required service is required");
      if (validationErrors.length) {
        return res.status(400).json({ error: "Validation failed", details: validationErrors });
      }

      if (!options.skipRateLimit) {
        const rateLimit = checkRateLimit(req);
        if (!rateLimit.allowed) {
          return res.status(429).json({ error: "Too many submissions", retryAfter: rateLimit.retryAfter });
        }
      }

      const spam = runSpamChecks(input);
      const { organization, site } = await getDefaultWorkspace();
      const form = await getForm(site, submissionType);
      const service = await getService(site, input);

      const existingSubmission = await findIdempotentSubmission(site, input.idempotencyKey);
      if (existingSubmission?.lead) {
        return res.status(200).json({
          message: "Lead submission already processed",
          idempotent: true,
          lead: toClientLead(existingSubmission.lead),
        });
      }

      const submission = await createSubmission({
        site,
        form,
        service,
        input,
        req,
        status: spam.flagged ? "spam" : "processing",
        spam,
      });

      if (spam.flagged) {
        await FormDefinition.updateOne({ _id: form._id }, { $inc: { submissionCount: 1 } });
        return res.status(422).json({ error: "Submission rejected by spam checks", details: spam.reasons });
      }

      const assignee = await assignSalesExecutive(organization._id, input);
      const query = duplicateQuery(input, organization._id);
      const existingLead = query ? await Lead.findOne(query).sort({ updatedAt: -1 }) : null;
      const leadSet = buildLeadSet(input, organization, site, service, assignee);
      let lead;
      let duplicate = false;

      if (existingLead) {
        duplicate = true;
        input.duplicate = true;
        const set = { ...leadSet };
        delete set.organization;
        delete set.site;
        delete set.submission;

        lead = await Lead.findByIdAndUpdate(
          existingLead._id,
          {
            $set: set,
            $setOnInsert: { submission: submission._id },
            $addToSet: {
              submissions: submission._id,
              tags: input.submissionType,
            },
          },
          { returnDocument: "after" },
        );
      } else {
        lead = await Lead.create({
          ...leadSet,
          submission: submission._id,
          submissions: [submission._id],
          tags: [input.submissionType].filter(Boolean),
        });
      }

      await FormSubmission.updateOne(
        { _id: submission._id },
        {
          $set: {
            lead: lead._id,
            ...(duplicate ? { duplicateOf: lead._id } : {}),
            status: duplicate ? "duplicate" : "processed",
            processedAt: new Date(),
          },
        },
      );
      await FormDefinition.updateOne({ _id: form._id }, { $inc: { submissionCount: 1 } });

      await LeadActivity.create({
        lead: lead._id,
        type: duplicate ? "note" : "status_change",
        title: duplicate ? "Duplicate contact updated lead" : "Lead created",
        description: duplicate
          ? "A new form submission matched this contact and updated the existing lead."
          : "Lead was created from a public form submission.",
        user: options.actorId,
        metadata: {
          submission: submission._id,
          submissionType: input.submissionType,
          duplicate,
          idempotencyKey: input.idempotencyKey,
        },
      });

      await createSpecializedRecord(input, submission, lead, service);
      await publishLeadCreatedEvent({ leadId: lead._id, submissionId: submission._id, duplicate });
      scheduleAsyncSideEffects({
        leadId: lead._id,
        submissionId: submission._id,
        organizationId: organization._id,
        siteId: site._id,
        input,
        req,
        duplicate,
      });

      const populated = await populateLead(Lead.findById(lead._id));
      return res.status(duplicate ? 200 : 201).json({
        message: duplicate ? "Existing lead updated successfully" : "Lead captured successfully",
        duplicate,
        lead: toClientLead(populated),
      });
    } catch (error) {
      if (error?.code === 11000 && error?.keyPattern?.idempotencyKey) {
        return res.status(409).json({ error: "Duplicate idempotency key" });
      }
      return res.status(500).json({ error: "Lead capture failed", details: error.message });
    }
  }

  static async publicLead(req, res) {
    return LeadController.capture(req, res, "lead");
  }

  static async publicContact(req, res) {
    return LeadController.capture(req, res, "contact");
  }

  static async publicConsultation(req, res) {
    return LeadController.capture(req, res, "consultation");
  }

  static async publicServiceEnquiry(req, res) {
    return LeadController.capture(req, res, "service_enquiry");
  }

  static async create(req, res) {
    return LeadController.capture(req, res, req.body?.type || "lead");
  }

  static async adminCreate(req, res) {
    return LeadController.capture(req, res, "admin", { skipRateLimit: true, actorId: req.user?.id });
  }

  static async listServiceEnquiries(req, res) {
    try {
      const page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 250);
      const filter = { submissionType: "service_enquiry" };

      if (req.query.serviceId) {
        if (!mongoose.Types.ObjectId.isValid(req.query.serviceId)) {
          return res.status(400).json({ error: "Invalid service ID" });
        }
        filter.service = req.query.serviceId;
      } else if (req.query.serviceSlug) {
        const service = await Service.findOne({ slug: slugify(req.query.serviceSlug) });
        filter.service = service?._id || null;
      }

      const [submissions, total] = await Promise.all([
        FormSubmission.find(filter)
          .populate("service", "name slug")
          .populate({
            path: "lead",
            populate: [
              { path: "service", select: "name slug" },
              { path: "assignedTo", select: "firstName lastName email role" },
            ],
          })
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        FormSubmission.countDocuments(filter),
      ]);

      return res.json({
        enquiries: submissions.map(toClientServiceEnquiry),
        pagination: { page, limit, total },
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch service enquiries", details: error.message });
    }
  }

  static async list(req, res) {
    try {
      const page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 250);
      const filter = {};

      if (req.query.status) filter.status = statusFromClient[req.query.status] || req.query.status;
      if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
      if (req.query.priority) filter.priority = req.query.priority;
      if (req.query.q) {
        const search = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [{ firstName: search }, { lastName: search }, { email: search }, { phone: search }, { company: search }];
      }

      const [leads, total] = await Promise.all([
        populateLead(Lead.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)),
        Lead.countDocuments(filter),
      ]);

      res.json({ leads: leads.map(toClientLead), pagination: { page, limit, total } });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leads", details: error.message });
    }
  }

  static async getById(req, res) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid lead ID" });
      const lead = await populateLead(Lead.findById(req.params.id));
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      res.json({ lead: toClientLead(lead) });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lead", details: error.message });
    }
  }

  static async update(req, res) {
    try {
      const patch = {};
      const body = req.body || {};
      const normalizedEmail = body.email !== undefined ? normalizeEmail(body.email) : undefined;
      const normalizedPhone = body.phone !== undefined ? normalizePhone(body.phone) : undefined;
      const { firstName, lastName } = body.name ? splitName(body.name) : {};

      if (firstName) patch.firstName = firstName;
      if (lastName) patch.lastName = lastName;
      if (body.email !== undefined) patch.email = normalizedEmail;
      if (normalizedEmail !== undefined) patch.normalizedEmail = normalizedEmail;
      if (body.phone !== undefined) patch.phone = asString(body.phone);
      if (normalizedPhone !== undefined) patch.normalizedPhone = normalizedPhone;
      if (body.companyName !== undefined || body.company !== undefined) patch.company = firstPresent(body.companyName, body.company);
      if (body.industry !== undefined) patch.industry = asString(body.industry);
      if (body.budgetRange !== undefined) patch.budgetRange = asString(body.budgetRange);
      if (body.city !== undefined) patch.city = asString(body.city);
      if (body.state !== undefined) patch.state = asString(body.state);
      if (body.country !== undefined) patch.country = asString(body.country);
      if (body.businessRequirement !== undefined) patch.businessRequirement = asString(body.businessRequirement);
      if (body.message !== undefined || body.noteText !== undefined) patch.notes = firstPresent(body.message, body.noteText);
      if (body.priority !== undefined) patch.priority = asString(body.priority).toLowerCase();
      if (body.followUpDate !== undefined || body.nextFollowUp !== undefined) {
        patch.nextFollowUp = firstPresent(body.followUpDate, body.nextFollowUp) ? new Date(firstPresent(body.followUpDate, body.nextFollowUp)) : null;
      }
      if (body.leadStatus !== undefined || body.status !== undefined) {
        const status = firstPresent(body.leadStatus, body.status).toLowerCase();
        patch.status = statusFromClient[status] || status;
      }

      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { $set: { ...patch, lastActivity: new Date() } },
        { returnDocument: "after" },
      );

      if (!lead) return res.status(404).json({ error: "Lead not found" });

      await LeadActivity.create({
        lead: lead._id,
        type: "note",
        title: "Lead updated",
        description: "Lead details were updated by an admin.",
        user: req.user?.id,
        metadata: { patch },
      });

      const populated = await populateLead(Lead.findById(lead._id));
      res.json({ message: "Lead updated successfully", lead: toClientLead(populated) });
    } catch (error) {
      res.status(500).json({ error: "Failed to update lead", details: error.message });
    }
  }

  static async updateStatus(req, res) {
    try {
      const status = statusFromClient[String(req.body.status || req.body.leadStatus || "").toLowerCase()] || req.body.status;
      if (!["new", "contacted", "qualified", "converted", "lost", "archived"].includes(status)) {
        return res.status(400).json({ error: "Invalid lead status" });
      }

      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { $set: { status, lastActivity: new Date() } },
        { returnDocument: "after" },
      );
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      await LeadActivity.create({
        lead: lead._id,
        type: "status_change",
        title: "Lead status changed",
        description: req.body.note || `Status changed to ${status}.`,
        user: req.user?.id,
        metadata: { status },
      });

      const populated = await populateLead(Lead.findById(lead._id));
      res.json({ message: "Lead status updated successfully", lead: toClientLead(populated) });
    } catch (error) {
      res.status(500).json({ error: "Failed to update lead status", details: error.message });
    }
  }

  static async assign(req, res) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.body.assignedTo)) {
        return res.status(400).json({ error: "Valid assignedTo user ID is required" });
      }

      const user = await User.findById(req.body.assignedTo);
      if (!user) return res.status(404).json({ error: "Assigned user not found" });

      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { $set: { assignedTo: user._id, lastActivity: new Date() } },
        { returnDocument: "after" },
      );
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      await LeadActivity.create({
        lead: lead._id,
        type: "note",
        title: "Lead assigned",
        description: req.body.note || `Lead assigned to ${user.firstName} ${user.lastName}.`,
        user: req.user?.id,
        metadata: { assignedTo: user._id },
      });

      const populated = await populateLead(Lead.findById(lead._id));
      res.json({ message: "Lead assigned successfully", lead: toClientLead(populated) });
    } catch (error) {
      res.status(500).json({ error: "Failed to assign lead", details: error.message });
    }
  }

  static async addActivity(req, res) {
    try {
      const lead = await Lead.findById(req.params.id);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const activity = await LeadActivity.create({
        lead: lead._id,
        type: req.body.type || "note",
        title: req.body.title || "Lead activity",
        description: req.body.description || req.body.note,
        user: req.user?.id,
        duration: req.body.duration,
        outcome: req.body.outcome,
        metadata: req.body.metadata,
      });

      await Lead.updateOne({ _id: lead._id }, { $set: { lastActivity: new Date() } });
      res.status(201).json({ message: "Lead activity created successfully", activity });
    } catch (error) {
      res.status(500).json({ error: "Failed to create lead activity", details: error.message });
    }
  }

  static async addTask(req, res) {
    try {
      const lead = await Lead.findById(req.params.id);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      if (!req.body.title) return res.status(400).json({ error: "Task title is required" });
      if (!req.body.dueDate) return res.status(400).json({ error: "Task dueDate is required" });

      const assignedTo = req.body.assignedTo || lead.assignedTo || req.user?.id;
      const task = await LeadTask.create({
        lead: lead._id,
        title: req.body.title,
        description: req.body.description,
        type: req.body.type || "follow_up",
        dueDate: new Date(req.body.dueDate),
        priority: req.body.priority || lead.priority || "medium",
        assignedTo,
      });

      await Lead.updateOne({ _id: lead._id }, { $set: { nextFollowUp: task.dueDate, lastActivity: new Date() } });
      await LeadActivity.create({
        lead: lead._id,
        type: "note",
        title: "Lead task created",
        description: task.title,
        user: req.user?.id,
        metadata: { task: task._id },
      });

      res.status(201).json({ message: "Lead task created successfully", task });
    } catch (error) {
      res.status(500).json({ error: "Failed to create lead task", details: error.message });
    }
  }

  static async timeline(req, res) {
    try {
      const lead = await Lead.findById(req.params.id).populate("submissions");
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const [activities, tasks, submissions] = await Promise.all([
        LeadActivity.find({ lead: lead._id }).sort({ createdAt: -1 }).populate("user", "firstName lastName email"),
        LeadTask.find({ lead: lead._id }).sort({ dueDate: 1 }).populate("assignedTo", "firstName lastName email"),
        FormSubmission.find({ lead: lead._id }).sort({ createdAt: -1 }),
      ]);

      const timeline = [
        ...activities.map((item) => ({ type: "activity", at: item.createdAt, item })),
        ...tasks.map((item) => ({ type: "task", at: item.createdAt, item })),
        ...submissions.map((item) => ({ type: "submission", at: item.createdAt, item })),
      ].sort((a, b) => new Date(b.at) - new Date(a.at));

      res.json({ timeline });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lead timeline", details: error.message });
    }
  }

  static async export(req, res) {
    try {
      const leads = await populateLead(Lead.find({}).sort({ createdAt: -1 }).limit(5000));
      const headers = [
        "id",
        "name",
        "phone",
        "email",
        "companyName",
        "industry",
        "requiredService",
        "budgetRange",
        "city",
        "state",
        "country",
        "leadStatus",
        "priority",
        "leadSource",
        "utmSource",
        "utmMedium",
        "utmCampaign",
        "landingPage",
        "referrer",
        "dateTime",
      ];
      const rows = leads.map((lead) => {
        const item = toClientLead(lead);
        return headers.map((header) => csvEscape(item[header])).join(",");
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=\"leads.csv\"");
      res.send([headers.join(","), ...rows].join("\n"));
    } catch (error) {
      res.status(500).json({ error: "Failed to export leads", details: error.message });
    }
  }
}
