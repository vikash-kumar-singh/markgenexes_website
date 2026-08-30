import {
  Organization,
  Membership,
  Role,
  User,
  AuthToken,
} from "../../models/index.js";
import { JwtUtil } from "../../utils/jwt/JwtUtil.js";
import { EmailUtil } from "../../utils/email/EmailUtil.js";

export class OrganizationController {
  /**
   * Create organization
   * POST /organizations
   */
  static async createOrganization(req, res) {
    try {
      const { name, description, website, industry } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Organization name is required" });
      }

      const organization = new Organization({
        name,
        description,
        website,
        industry,
      });

      await organization.save();

      // Create default roles
      const adminRole = new Role({
        name: "admin",
        description: "Administrator with full access",
        organization: organization._id,
        permissions: [
          {
            resource: "users",
            actions: ["create", "read", "update", "delete"],
          },
          {
            resource: "roles",
            actions: ["create", "read", "update", "delete"],
          },
          {
            resource: "sites",
            actions: ["create", "read", "update", "delete"],
          },
          {
            resource: "forms",
            actions: ["create", "read", "update", "delete"],
          },
          {
            resource: "leads",
            actions: ["create", "read", "update", "delete"],
          },
          {
            resource: "analytics",
            actions: ["read"],
          },
          {
            resource: "settings",
            actions: ["read", "update"],
          },
          {
            resource: "integrations",
            actions: ["create", "read", "update", "delete"],
          },
        ],
        isSystem: true,
      });

      const memberRole = new Role({
        name: "member",
        description: "Regular member with basic access",
        organization: organization._id,
        permissions: [
          {
            resource: "leads",
            actions: ["read", "update"],
          },
          {
            resource: "forms",
            actions: ["read"],
          },
          {
            resource: "analytics",
            actions: ["read"],
          },
        ],
        isSystem: true,
      });

      await adminRole.save();
      await memberRole.save();

      // Add creator as admin
      const membership = new Membership({
        user: req.user.id,
        organization: organization._id,
        role: adminRole._id,
        status: "active",
        joinedAt: new Date(),
      });

      await membership.save();

      res.status(201).json({
        message: "Organization created successfully",
        organization: {
          id: organization._id,
          name: organization.name,
          roles: [
            { id: adminRole._id, name: adminRole.name },
            { id: memberRole._id, name: memberRole.name },
          ],
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Organization creation failed", details: error.message });
    }
  }

  /**
   * Get organization details
   * GET /organizations/:organizationId
   */
  static async getOrganization(req, res) {
    try {
      const organization = await Organization.findById(req.organizationId);

      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const memberCount = await Membership.countDocuments({
        organization: organization._id,
        status: "active",
      });

      res.json({
        organization: {
          id: organization._id,
          name: organization.name,
          description: organization.description,
          website: organization.website,
          industry: organization.industry,
          timezone: organization.timezone,
          memberCount,
          settings: organization.settings,
          createdAt: organization.createdAt,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get organization", details: error.message });
    }
  }

  /**
   * Update organization
   * PUT /organizations/:organizationId
   */
  static async updateOrganization(req, res) {
    try {
      const { name, description, website, industry, timezone, settings } = req.body;

      const organization = await Organization.findById(req.organizationId);
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      if (name) organization.name = name;
      if (description) organization.description = description;
      if (website) organization.website = website;
      if (industry) organization.industry = industry;
      if (timezone) organization.timezone = timezone;
      if (settings) organization.settings = { ...organization.settings, ...settings };

      await organization.save();

      res.json({
        message: "Organization updated successfully",
        organization: {
          id: organization._id,
          name: organization.name,
          description: organization.description,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Organization update failed", details: error.message });
    }
  }

  /**
   * Invite user to organization
   * POST /organizations/:organizationId/invite
   */
  static async inviteUser(req, res) {
    try {
      const { email, roleId } = req.body;

      if (typeof email !== "string" || !email.trim() || !roleId) {
        return res.status(400).json({ error: "Email and role are required" });
      }

      const organization = await Organization.findById(req.organizationId);
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const role = await Role.findById(roleId);
      if (!role || String(role.organization) !== String(req.organizationId)) {
        return res.status(404).json({ error: "Role not found" });
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({ error: "A valid email address is required" });
      }
      const user = await User.findOne({ email: normalizedEmail });
      const existingMembership = await Membership.findOne({
        organization: req.organizationId,
        ...(user ? { user: user._id } : { invitedEmail: normalizedEmail }),
      });

      if (existingMembership) {
        return res.status(409).json({ error: "User is already a member of this organization" });
      }

      const invitationToken = JwtUtil.generateInvitationToken({
        email: normalizedEmail,
        organizationId: req.organizationId,
      });
      const invitationLink = `${process.env.APP_URL || "http://localhost:3000"}/accept-invitation?token=${invitationToken}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await Membership.create({
        ...(user ? { user: user._id } : { invitedEmail: normalizedEmail }),
        organization: req.organizationId,
        role: roleId,
        status: "invited",
        invitedBy: req.user.id,
        invitationToken,
        invitationExpires: expiresAt,
      });

      // Save invitation token
      await AuthToken.create({
        ...(user ? { user: user._id } : {}),
        email: normalizedEmail,
        organization: req.organizationId,
        token: invitationToken,
        type: "invitation",
        expiresAt,
      });

      // Send invitation email
      try {
        await EmailUtil.sendInvitationEmail(normalizedEmail, invitationLink, organization.name);
      } catch (emailError) {
        console.error("Email send failed:", emailError);
      }

      res.status(201).json({
        message: "Invitation sent successfully",
        invitation: {
          email: normalizedEmail,
          role: role.name,
          expiresAt,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Invitation failed", details: error.message });
    }
  }

  /**
   * Accept invitation
   * POST /organizations/accept-invitation
   */
  static async acceptInvitation(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Invitation token is required" });
      }

      const decoded = JwtUtil.verifyInvitationToken(token);
      if (!decoded?.email || !decoded?.organizationId) {
        return res.status(400).json({ error: "Invalid or expired invitation token" });
      }

      if (decoded.email.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ error: "This invitation was issued to another email address" });
      }

      const storedToken = await AuthToken.findOne({
        token,
        type: "invitation",
        email: decoded.email.toLowerCase(),
        organization: decoded.organizationId,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      });
      if (!storedToken) return res.status(400).json({ error: "Invitation token has expired or already been used" });

      const membership = await Membership.findOne({
        invitationToken: token,
        status: "invited",
      }).populate("organization role");

      if (!membership) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      if (
        !membership.organization ||
        !membership.role ||
        membership.organization._id.toString() !== String(decoded.organizationId) ||
        !membership.invitationExpires ||
        membership.invitationExpires <= new Date()
      ) {
        return res.status(400).json({ error: "Invitation has expired or is invalid" });
      }

      const duplicateMembership = await Membership.exists({
        user: req.user.id,
        organization: membership.organization._id,
        _id: { $ne: membership._id },
      });
      if (duplicateMembership) return res.status(409).json({ error: "User is already a member of this organization" });

      membership.user = req.user.id;
      membership.invitedEmail = undefined;
      membership.status = "active";
      membership.joinedAt = new Date();
      membership.invitationToken = null;
      membership.invitationExpires = null;

      await membership.save();

      // Mark token as used
      storedToken.isUsed = true;
      storedToken.usedAt = new Date();
      await storedToken.save();

      res.json({
        message: "Invitation accepted successfully",
        membership: {
          organization: membership.organization.name,
          role: membership.role.name,
          status: membership.status,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to accept invitation", details: error.message });
    }
  }

  /**
   * Get organization members
   * GET /organizations/:organizationId/members
   */
  static async getMembers(req, res) {
    try {
      const memberships = await Membership.find({
        organization: req.organizationId,
      })
        .populate("user", "firstName lastName email avatar")
        .populate("role", "name permissions")
        .sort("-createdAt");

      const members = memberships.map((m) => ({
        id: m._id,
        user: m.user
          ? {
              id: m.user._id,
              firstName: m.user.firstName,
              lastName: m.user.lastName,
              email: m.user.email,
              avatar: m.user.avatar,
            }
          : null,
        role: m.role?.name || null,
        status: m.status,
        joinedAt: m.joinedAt,
        invitedBy: m.invitedBy,
      }));

      res.json({ members });
    } catch (error) {
      res.status(500).json({ error: "Failed to get members", details: error.message });
    }
  }

  /**
   * Update member role
   * PUT /organizations/:organizationId/members/:memberId/role
   */
  static async updateMemberRole(req, res) {
    try {
      const { roleId } = req.body;

      if (!roleId) {
        return res.status(400).json({ error: "Role ID is required" });
      }

      const membership = await Membership.findOne({
        _id: req.params.memberId,
        organization: req.organizationId,
      }).populate("role");
      if (!membership) {
        return res.status(404).json({ error: "Membership not found" });
      }

      const role = await Role.findById(roleId);
      if (!role || String(role.organization) !== String(req.organizationId)) {
        return res.status(404).json({ error: "Role not found" });
      }

      membership.role = roleId;
      await membership.save();

      res.json({
        message: "Member role updated successfully",
        membership: {
          id: membership._id,
          role: role.name,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update member role", details: error.message });
    }
  }

  /**
   * Remove member from organization
   * DELETE /organizations/:organizationId/members/:memberId
   */
  static async removeMember(req, res) {
    try {
      const membership = await Membership.findOne({
        _id: req.params.memberId,
        organization: req.organizationId,
      });
      if (!membership) {
        return res.status(404).json({ error: "Membership not found" });
      }

      membership.status = "inactive";
      membership.deactivatedAt = new Date();
      await membership.save();

      res.json({ message: "Member removed successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove member", details: error.message });
    }
  }

  /**
   * Get roles
   * GET /organizations/:organizationId/roles
   */
  static async getRoles(req, res) {
    try {
      const roles = await Role.find({
        organization: req.organizationId,
      });

      res.json({ roles });
    } catch (error) {
      res.status(500).json({ error: "Failed to get roles", details: error.message });
    }
  }

  /**
   * Create role
   * POST /organizations/:organizationId/roles
   */
  static async createRole(req, res) {
    try {
      const { name, description, permissions } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Role name is required" });
      }

      const existingRole = await Role.findOne({
        organization: req.organizationId,
        name,
      });

      if (existingRole) {
        return res.status(409).json({ error: "Role already exists" });
      }

      const role = new Role({
        name,
        description,
        organization: req.organizationId,
        permissions,
      });

      await role.save();

      res.status(201).json({
        message: "Role created successfully",
        role: {
          id: role._id,
          name: role.name,
          permissions: role.permissions,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Role creation failed", details: error.message });
    }
  }
}
