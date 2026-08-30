import mongoose from "mongoose";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { backendRoot } from "../../config/environment.js";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { ApplicationActivity, CareerApplication, JobOpening, Site } from "../../models/index.js";
import { EmailUtil } from "../../utils/email/EmailUtil.js";

const MIGRATION = "careers-jobs-v1";
const SITE = "markgenexes";
const COMPANY_NAME = process.env.COMPANY_NAME || "MarkGenexes";
const APPLICATION_STATUSES = ["New", "Reviewed", "Shortlisted", "Interview", "Selected", "Rejected"];
const statusLookup = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status.toLowerCase(), status]));
function normalizeApplicationStatus(value) { return statusLookup[String(value || "").trim().toLowerCase()] || null; }
async function migrateApplicationStatuses() { await Promise.all(APPLICATION_STATUSES.map((status) => CareerApplication.updateMany({ status: status.toLowerCase() }, { $set: { status } }))); }
const seedJobs = [
  { title: "Senior Performance Marketing Manager", slug: "senior-performance-marketing-manager", department: "Growth", location: "India", workMode: "remote", description: "We are looking for a senior performance marketing manager to join our Growth team. You will own meaningful work from day one, partner directly with clients, and have the autonomy to do your best work." },
  { title: "Content Strategist", slug: "content-strategist", department: "Content", location: "India", workMode: "remote", description: "Shape content strategy, editorial systems, and high-quality narratives that connect audience needs with measurable business growth." },
  { title: "Brand Designer", slug: "brand-designer", department: "Creative", location: "Bangalore / Remote", workMode: "hybrid", description: "Build distinctive brand systems and campaign creative for ambitious companies across digital and offline touchpoints." },
  { title: "SEO Lead", slug: "seo-lead", department: "Content", location: "India", workMode: "remote", description: "Lead technical and content-led search programs, turning customer intent into sustainable organic growth." },
];

function slugify(value) { return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function strings(value) { return Array.isArray(value) ? value.map(String).map((x) => x.trim()).filter(Boolean) : String(value || "").split("\n").map((x) => x.trim()).filter(Boolean); }
async function getSite() { return Site.findOne({ subdomain: SITE }); }

async function migrate(site) {
  if (site.contentMigrations?.includes(MIGRATION)) return;
  await JobOpening.bulkWrite(seedJobs.map((job, displayOrder) => ({ updateOne: { filter: { site: site._id, slug: job.slug }, update: { $setOnInsert: { site: site._id, ...job, shortDescription: job.description, employmentType: "full-time", seniority: "senior", displayOrder, numberOfOpenings: 1, responsibilities: [], qualifications: [], skills: [], benefits: [], status: "open", publishedAt: new Date() } }, upsert: true } })));
  await Site.updateOne({ _id: site._id }, { $addToSet: { contentMigrations: MIGRATION } });
  site.contentMigrations = [...(site.contentMigrations || []), MIGRATION];
}

function jobPayload(body, current = {}) {
  const title = String(body.title ?? current.title ?? "").trim();
  if (!title) throw new Error("Job title is required");
  return {
    title, slug: slugify(body.slug ?? current.slug ?? title),
    department: String(body.department ?? current.department ?? "").trim(),
    employmentType: body.employmentType ?? current.employmentType ?? "full-time",
    workMode: body.workMode ?? current.workMode ?? "remote",
    location: String(body.location ?? current.location ?? "").trim(),
    experienceRequired: String(body.experienceRequired ?? current.experienceRequired ?? "").trim(),
    salaryRange: String(body.salaryRange ?? current.salaryRange ?? "").trim(),
    description: String(body.description ?? current.description ?? "").trim(),
    shortDescription: String(body.shortDescription ?? body.description ?? current.shortDescription ?? "").trim(),
    responsibilities: strings(body.responsibilities ?? current.responsibilities),
    qualifications: strings(body.qualifications ?? current.qualifications),
    skills: strings(body.skills ?? current.skills), benefits: strings(body.benefits ?? current.benefits),
    numberOfOpenings: Math.max(1, Number(body.numberOfOpenings ?? current.numberOfOpenings ?? 1)),
    applicationDeadline: body.applicationDeadline ? new Date(body.applicationDeadline) : current.applicationDeadline || null,
    displayOrder: Math.max(0, Number(body.displayOrder ?? current.displayOrder ?? 0)),
    status: ["draft", "open", "closed", "filled"].includes(body.status) ? body.status : current.status || "draft",
  };
}

function jobJson(job) { return { id: String(job._id), title: job.title, slug: job.slug, department: job.department || "", employmentType: job.employmentType, workMode: job.workMode, location: job.location || "", experienceRequired: job.experienceRequired || "", salaryRange: job.salaryRange || "", description: job.description, shortDescription: job.shortDescription || job.description, responsibilities: job.responsibilities || [], requirements: job.qualifications || [], skills: job.skills || [], benefits: job.benefits || [], numberOfOpenings: job.numberOfOpenings, applicationDeadline: job.applicationDeadline, displayOrder: job.displayOrder, status: job.status, applicationCount: job.applicationCount, createdAt: job.createdAt, updatedAt: job.updatedAt }; }
function applicationJson(app) { const job = app.jobOpening || {}; const message = app.coverLetter || app.emailMessage || ""; return { id: String(app._id), jobId: job._id ? String(job._id) : String(app.jobOpening), appliedJob: job.title || "", department: job.department || "", name: `${app.firstName} ${app.lastName}`.trim(), firstName: app.firstName, lastName: app.lastName, email: app.email, phone: app.phone || "", resumeAvailable: Boolean(app.resumeStorageName || app.resumeData), resumeFileName: app.resumeFileName || "", portfolio: app.portfolio || "", linkedinProfile: app.linkedinProfile || "", experience: app.experience || "", coverLetter: app.emailSubject ? `Subject: ${app.emailSubject}\n\n${message}` : message, subject: app.emailSubject || "", source: app.source || "website", attachments: app.emailAttachments || [], status: app.status, appliedAt: app.appliedAt || app.createdAt }; }

const resumeDirectory = path.join(backendRoot, "private_uploads", "resumes");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedResumeTypes = new Set(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
function hasValidResumeSignature(file) {
  if (!file?.buffer?.length) return false;
  if (file.mimetype === "application/pdf") return file.buffer.subarray(0, 5).toString() === "%PDF-";
  if (file.mimetype === "application/msword") return file.buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  return file.buffer.subarray(0, 2).toString() === "PK";
}

export class CareerController {
  static async publicJobs(req, res) { try { const site = await getSite(); if (!site) return res.json({ jobs: [] }); await migrate(site); const jobs = await JobOpening.find({ site: site._id, status: "open", $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }] }).sort({ displayOrder: 1 }); return res.json({ jobs: jobs.map(jobJson) }); } catch (e) { return res.status(500).json({ error: "Failed to fetch jobs", details: e.message }); } }
  static async adminJobs(req, res) { try { const site = await getSite(); if (!site) return res.json({ jobs: [] }); await migrate(site); const jobs = await JobOpening.find({ site: site._id }).sort({ displayOrder: 1 }); return res.json({ jobs: jobs.map(jobJson) }); } catch (e) { return res.status(500).json({ error: "Failed to fetch jobs", details: e.message }); } }
  static async createJob(req, res) { try { const site = await getSite(); const payload = jobPayload(req.body); const job = await JobOpening.create({ site: site._id, postedBy: req.user.id, ...payload, ...(payload.status === "open" ? { publishedAt: new Date() } : {}) }); return res.status(201).json({ job: jobJson(job) }); } catch (e) { return res.status(400).json({ error: "Failed to create job", details: e.message }); } }
  static async updateJob(req, res) { try { if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid job ID" }); const job = await JobOpening.findById(req.params.id); if (!job) return res.status(404).json({ error: "Job not found" }); const payload = jobPayload(req.body, job.toObject()); Object.assign(job, payload); if (payload.status === "open" && !job.publishedAt) job.publishedAt = new Date(); if (["closed", "filled"].includes(payload.status)) job.closedAt = new Date(); await job.save(); return res.json({ job: jobJson(job) }); } catch (e) { return res.status(400).json({ error: "Failed to update job", details: e.message }); } }
  static async deleteJob(req, res) { try { const count = await CareerApplication.countDocuments({ jobOpening: req.params.id }); if (count) return res.status(409).json({ error: "Jobs with applicants cannot be deleted; close the job instead" }); const job = await JobOpening.findByIdAndDelete(req.params.id); if (!job) return res.status(404).json({ error: "Job not found" }); return res.json({ message: "Job deleted" }); } catch (e) { return res.status(500).json({ error: "Failed to delete job", details: e.message }); } }
  static async apply(req, res) {
    let storedPath;
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid job ID" });
      const job = await JobOpening.findOne({ _id: req.params.id, status: "open", $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }] });
      if (!job) return res.status(404).json({ error: "This job is not accepting applications" });
      const body = req.body || {};
      const fullName = String(body.fullName || "").trim().replace(/\s+/g, " ");
      const email = String(body.email || "").trim().toLowerCase();
      const phone = String(body.phone || "").trim();
      const experience = String(body.experience || "").trim();
      const portfolio = String(body.portfolio || "").trim();
      if (fullName.length < 2 || !emailPattern.test(email) || phone.length < 7 || !experience) return res.status(400).json({ error: "Please provide a valid name, email, phone number, and experience" });
      if (!req.file || !allowedResumeTypes.has(req.file.mimetype) || !hasValidResumeSignature(req.file)) return res.status(400).json({ error: "Please upload a valid PDF, DOC, or DOCX resume" });
      if (portfolio) { try { const url = new URL(portfolio); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); } catch { return res.status(400).json({ error: "Portfolio link must be a valid http(s) URL" }); } }
      const parts = fullName.split(" ");
      const extension = req.file.mimetype === "application/pdf" ? ".pdf" : req.file.mimetype === "application/msword" ? ".doc" : ".docx";
      const storageName = `${crypto.randomUUID()}${extension}`;
      await fs.mkdir(resumeDirectory, { recursive: true });
      storedPath = path.join(resumeDirectory, storageName);
      await fs.writeFile(storedPath, req.file.buffer, { flag: "wx", mode: 0o600 });
      const app = await CareerApplication.create({ jobOpening: job._id, firstName: parts[0], lastName: parts.slice(1).join(" ") || "-", email, phone, experience, portfolio, resumeStorageName: storageName, resumeFileName: path.basename(req.file.originalname), resumeMimeType: req.file.mimetype, resumeSize: req.file.size, status: "New", appliedAt: new Date() });
      await JobOpening.updateOne({ _id: job._id }, { $inc: { applicationCount: 1 } });
      return res.status(201).json({ message: `Your application for ${job.title} was submitted successfully.`, applicationId: String(app._id) });
    } catch (e) {
      if (storedPath) await fs.unlink(storedPath).catch(() => {});
      return res.status(400).json({ error: "Failed to submit application", details: e.message });
    }
  }
  static async resume(req, res) { try { const app = await CareerApplication.findById(req.params.id); if (!app) return res.status(404).json({ error: "Application not found" }); if (app.resumeStorageName) { const filePath = path.join(resumeDirectory, path.basename(app.resumeStorageName)); const disposition = req.query.download === "1" ? "attachment" : "inline"; res.setHeader("Content-Type", app.resumeMimeType || "application/octet-stream"); res.setHeader("Content-Disposition", `${disposition}; filename*=UTF-8''${encodeURIComponent(app.resumeFileName || "resume")}`); return res.sendFile(filePath); } if (app.resumeData) { const match = app.resumeData.match(/^data:([^;]+);base64,(.+)$/); if (!match) return res.status(404).json({ error: "Resume is unavailable" }); res.setHeader("Content-Type", match[1]); res.setHeader("Content-Disposition", `${req.query.download === "1" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(app.resumeFileName || "resume.pdf")}`); return res.send(Buffer.from(match[2], "base64")); } return res.status(404).json({ error: "Resume is unavailable" }); } catch (e) { return res.status(400).json({ error: "Failed to retrieve resume", details: e.message }); } }
  static async syncMailbox(req, res) {
    const { CAREERS_IMAP_HOST: host, CAREERS_IMAP_PORT: port, CAREERS_IMAP_USER: user, CAREERS_IMAP_PASSWORD: pass, CAREERS_IMAP_SECURE: secure } = process.env;
    if (!host || !user || !pass) return res.status(503).json({ error: "Careers mailbox sync is not configured" });
    const client = new ImapFlow({ host, port: Number(port || 993), secure: secure !== "false", auth: { user, pass }, logger: false });
    let imported = 0, skipped = 0;
    try {
      await client.connect();
      const lock = await client.getMailboxLock(process.env.CAREERS_IMAP_MAILBOX || "INBOX");
      try {
        const since = new Date(Date.now() - Number(process.env.CAREERS_IMAP_DAYS || 90) * 86400000);
        const ids = await client.search({ since });
        if (ids.length) {
          for await (const message of client.fetch(ids, { source: true, envelope: true, uid: true })) {
            const parsed = await simpleParser(message.source);
            const subject = String(parsed.subject || message.envelope?.subject || "").trim();
            const match = subject.match(/^Job Application\s*[–—-]\s*(.+)$/i);
            if (!match) { skipped += 1; continue; }
            const messageId = String(parsed.messageId || message.envelope?.messageId || `${user}:${message.uid}`);
            if (await CareerApplication.exists({ inboundMessageId: messageId })) { skipped += 1; continue; }
            const roleName = match[1].trim();
            const jobs = await JobOpening.find({});
            const job = jobs.find((item) => item.title.toLowerCase() === roleName.toLowerCase());
            if (!job) { skipped += 1; continue; }
            const sender = parsed.from?.value?.[0] || {};
            if (!sender.address) { skipped += 1; continue; }
            const parts = String(sender.name || sender.address?.split("@")[0] || "Email Applicant").trim().split(/\s+/);
            const body = String(parsed.text || parsed.html || "").trim();
            const phone = body.match(/(?:phone|mobile|contact)\s*:\s*([^\n\r]+)/i)?.[1]?.trim() || "";
            const experience = body.match(/experience\s*:\s*([^\n\r]+)/i)?.[1]?.trim() || "";
            const portfolio = body.match(/(?:portfolio|resume\s*\/\s*portfolio link)\s*:\s*(https?:\/\/\S+)/i)?.[1] || "";
            const attachments = (parsed.attachments || []).filter((a) => a.content?.length <= 4 * 1024 * 1024).map((a) => ({ fileName: a.filename || "attachment", contentType: a.contentType, size: a.size, data: `data:${a.contentType};base64,${a.content.toString("base64")}` }));
            const resume = attachments.find((a) => /pdf|msword|officedocument/i.test(a.contentType || ""));
            await CareerApplication.create({ jobOpening: job._id, firstName: parts[0] || "Email", lastName: parts.slice(1).join(" ") || "Applicant", email: String(sender.address || "").toLowerCase(), phone, experience, portfolio, coverLetter: body, resumeData: resume?.data || "", resumeFileName: resume?.fileName || "", source: "email", inboundMessageId: messageId, emailSubject: subject, emailMessage: body, emailAttachments: attachments, status: "New", appliedAt: parsed.date || message.envelope?.date || new Date() });
            await JobOpening.updateOne({ _id: job._id }, { $inc: { applicationCount: 1 } });
            imported += 1;
          }
        }
      } finally { lock.release(); }
      return res.json({ message: "Mailbox sync complete", imported, skipped });
    } catch (error) { return res.status(502).json({ error: "Careers mailbox sync failed", details: error.message }); }
    finally { if (client.usable) await client.logout().catch(() => {}); }
  }
  static async applications(req, res) { try { await migrateApplicationStatuses(); const filter = {}; if (req.query.jobId) filter.jobOpening = req.query.jobId; if (req.query.status) { const status = normalizeApplicationStatus(req.query.status); if (!status) return res.status(400).json({ error: "Invalid application status" }); filter.status = status; } if (req.query.dateFrom || req.query.dateTo) filter.appliedAt = { ...(req.query.dateFrom ? { $gte: new Date(req.query.dateFrom) } : {}), ...(req.query.dateTo ? { $lte: new Date(`${req.query.dateTo}T23:59:59.999Z`) } : {}) }; let query = CareerApplication.find(filter).populate("jobOpening", "title department").sort({ appliedAt: -1, createdAt: -1 }); const apps = await query; let data = apps.map(applicationJson); if (req.query.department) data = data.filter((x) => x.department === req.query.department); if (req.query.q) { const q = String(req.query.q).toLowerCase(); data = data.filter((x) => [x.name, x.email, x.phone, x.appliedJob].some((v) => v.toLowerCase().includes(q))); } return res.json({ applications: data }); } catch (e) { return res.status(500).json({ error: "Failed to fetch applications", details: e.message }); } }
  static async updateApplication(req, res) {
    try {
      const status = normalizeApplicationStatus(req.body.status);
      if (!status) return res.status(400).json({ error: "Invalid application status", allowedStatuses: APPLICATION_STATUSES });
      const app = await CareerApplication.findById(req.params.id).populate("jobOpening", "title department");
      if (!app) return res.status(404).json({ error: "Application not found" });
      const oldStatus = normalizeApplicationStatus(app.status) || app.status;
      if (oldStatus === status) return res.json({ application: applicationJson(app), message: `Application is already ${status}.`, unchanged: true, emailSent: false });
      app.status = status;
      app.reviewedBy = req.user.id;
      app.reviewedAt = new Date();
      await app.save();
      await ApplicationActivity.create({ application: app._id, type: "status_change", title: "Application status updated", oldStatus, newStatus: status, performedBy: req.user.id }).catch(() => {});
      let emailSent = false, emailError = "";
      try {
        await EmailUtil.sendJobApplicationStatusEmail({ email: app.email, applicantName: `${app.firstName} ${app.lastName}`.replace(/\s+-$/, "").trim(), jobTitle: app.jobOpening?.title || "the position", companyName: COMPANY_NAME, status });
        emailSent = true;
        await ApplicationActivity.create({ application: app._id, type: "email_sent", title: `${status} status email sent`, newStatus: status, performedBy: req.user.id, metadata: { recipient: app.email } });
      } catch (error) {
        emailError = "Status was saved, but the notification email could not be sent.";
        await ApplicationActivity.create({ application: app._id, type: "email_sent", title: `${status} status email failed`, newStatus: status, performedBy: req.user.id, metadata: { recipient: app.email, error: error.message } }).catch(() => {});
      }
      return res.json({ application: applicationJson(app), message: emailSent ? `Status updated to ${status} and email sent.` : `Status updated to ${status}.`, emailSent, emailError });
    } catch (e) { return res.status(400).json({ error: "Failed to update application", details: e.message }); }
  }
}
