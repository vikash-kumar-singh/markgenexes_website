import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import { LeadController } from "../controllers/leads/LeadController.js";
import { IndustryController } from "../controllers/cms/IndustryController.js";
import { CareerController } from "../controllers/careers/CareerController.js";
import { TrackingController } from "../controllers/analytics/TrackingController.js";
import { CaseStudyController } from "../controllers/cms/CaseStudyController.js";
import { PartnerContentController } from "../controllers/partnerships/PartnerContentController.js";
import { isAuthenticated, requireAdminAccess } from "../middlewares/auth/tokenMiddleware.js";
import { createRateLimiter } from "../middlewares/security/securityMiddleware.js";

const router = express.Router();
const publicWriteLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: "public-write" });
const trackingLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 180, keyPrefix: "tracking" });
const applicationLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10, keyPrefix: "job-application" });
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    const allowed = new Set(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
    callback(allowed.has(file.mimetype) ? null : new Error("Resume must be a PDF, DOC, or DOCX file"), allowed.has(file.mimetype));
  },
});
const acceptResume = (req, res, next) => resumeUpload.single("resume")(req, res, (error) => {
  if (error) return res.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Resume must be 5 MB or smaller" : error.message });
  return next();
});
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 }, fileFilter(req, file, callback) { callback(/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype) ? null : new Error("Image must be JPEG, PNG, WebP, or GIF"), /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)); } });
const acceptImage = (req, res, next) => imageUpload.single("image")(req, res, (error) => error ? res.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Image must be 8 MB or smaller" : error.message }) : next());

router.get("/", (req, res) => {
  res.json({ message: "MarkGenexes API", version: "v1" });
});

router.get("/v1/health", (req, res) => {
  res.json({ status: "ok", service: "markgenexes-api", uptime: process.uptime(), timestamp: new Date().toISOString(), requestId: req.id });
});
router.get("/v1/ready", (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ready" : "not-ready",
    database: databaseReady ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    requestId: req.id,
  });
});

router.post("/v1/public/leads", publicWriteLimiter, LeadController.publicLead);
router.post("/v1/public/contact", publicWriteLimiter, LeadController.publicContact);
router.post("/v1/public/consultations", publicWriteLimiter, LeadController.publicConsultation);
router.post("/v1/public/service-enquiries", publicWriteLimiter, LeadController.publicServiceEnquiry);
router.get("/v1/public/industries", IndustryController.publicList);
router.get("/v1/public/jobs", CareerController.publicJobs);
router.get("/v1/public/case-studies", CaseStudyController.publicList);
router.get("/v1/public/partners", PartnerContentController.publicList);
router.get("/v1/public/case-study-images/:id", CaseStudyController.image);
router.get("/v1/public/tracking", TrackingController.publicConfig);
router.post("/v1/public/tracking/events", trackingLimiter, TrackingController.collect);
router.post("/v1/public/jobs/:id/applications", applicationLimiter, acceptResume, CareerController.apply);

router.use("/v1/admin", isAuthenticated, requireAdminAccess);

router.get("/v1/admin/jobs", isAuthenticated, CareerController.adminJobs);
router.get("/v1/admin/case-studies", isAuthenticated, CaseStudyController.adminList);
router.get("/v1/admin/partners", isAuthenticated, PartnerContentController.adminList);
router.post("/v1/admin/partners", isAuthenticated, PartnerContentController.create);
router.patch("/v1/admin/partners/:id", isAuthenticated, PartnerContentController.update);
router.delete("/v1/admin/partners/:id", isAuthenticated, PartnerContentController.remove);
router.post("/v1/admin/case-studies", isAuthenticated, CaseStudyController.create);
router.patch("/v1/admin/case-studies/:id", isAuthenticated, CaseStudyController.update);
router.delete("/v1/admin/case-studies/:id", isAuthenticated, CaseStudyController.remove);
router.post("/v1/admin/case-studies/images", isAuthenticated, acceptImage, CaseStudyController.upload);
router.get("/v1/admin/tracking", isAuthenticated, TrackingController.adminConfig);
router.put("/v1/admin/tracking", isAuthenticated, TrackingController.updateConfig);
router.get("/v1/admin/tracking/report", isAuthenticated, TrackingController.report);
router.post("/v1/admin/jobs", isAuthenticated, CareerController.createJob);
router.patch("/v1/admin/jobs/:id", isAuthenticated, CareerController.updateJob);
router.delete("/v1/admin/jobs/:id", isAuthenticated, CareerController.deleteJob);
router.get("/v1/admin/job-applications", isAuthenticated, CareerController.applications);
router.post("/v1/admin/job-applications/sync", isAuthenticated, CareerController.syncMailbox);
router.patch("/v1/admin/job-applications/:id", isAuthenticated, CareerController.updateApplication);
router.get("/v1/admin/job-applications/:id/resume", isAuthenticated, CareerController.resume);

router.get("/v1/admin/industries", isAuthenticated, IndustryController.adminList);
router.post("/v1/admin/industries", isAuthenticated, IndustryController.create);
router.patch("/v1/admin/industries/:id", isAuthenticated, IndustryController.update);
router.delete("/v1/admin/industries/:id", isAuthenticated, IndustryController.remove);

router.get("/v1/admin/leads/export", isAuthenticated, LeadController.export);
router.get("/v1/admin/service-enquiries", isAuthenticated, LeadController.listServiceEnquiries);
router.get("/v1/admin/leads", isAuthenticated, LeadController.list);
router.get("/v1/admin/leads/:id", isAuthenticated, LeadController.getById);
router.post("/v1/admin/leads", isAuthenticated, LeadController.adminCreate);
router.patch("/v1/admin/leads/:id", isAuthenticated, LeadController.update);
router.patch("/v1/admin/leads/:id/status", isAuthenticated, LeadController.updateStatus);
router.patch("/v1/admin/leads/:id/assign", isAuthenticated, LeadController.assign);
router.post("/v1/admin/leads/:id/activities", isAuthenticated, LeadController.addActivity);
router.post("/v1/admin/leads/:id/tasks", isAuthenticated, LeadController.addTask);
router.get("/v1/admin/leads/:id/timeline", isAuthenticated, LeadController.timeline);

router.post("/leads", LeadController.create);
router.post("/forms/contact-enquiries", LeadController.create);
router.post("/forms/consultation-bookings", LeadController.create);
router.post("/forms/service-enquiries", LeadController.create);
router.post("/careers/applications", LeadController.create);
router.post("/partnerships/applications", LeadController.create);
router.get("/leads", isAuthenticated, requireAdminAccess, LeadController.list);
router.patch("/leads/:id", isAuthenticated, requireAdminAccess, LeadController.update);

export default router;
