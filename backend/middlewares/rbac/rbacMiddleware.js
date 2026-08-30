import { Membership, Role } from "../../models/index.js";

export const requireOrganization = async (req, res, next) => {
  try {
    const { organizationId } = req.params || req.body;

    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    const membership = await Membership.findOne({
      user: req.user.id,
      organization: organizationId,
      status: "active",
    });

    if (!membership) {
      return res.status(403).json({ error: "You don't have access to this organization" });
    }

    req.membership = membership;
    req.organizationId = organizationId;

    next();
  } catch (error) {
    res.status(500).json({ error: "Organization verification failed", details: error.message });
  }
};

export const checkPermission = (requiredResource, requiredAction) => {
  return async (req, res, next) => {
    try {
      if (!req.membership) {
        return res.status(403).json({ error: "Organization access required" });
      }

      const role = await Role.findById(req.membership.role);

      if (!role || role.status !== "active" || String(role.organization) !== String(req.organizationId)) {
        return res.status(403).json({ error: "Role not found" });
      }

      const hasPermission = role.permissions.some((perm) => {
        return (
          perm.resource === requiredResource &&
          perm.actions.includes(requiredAction)
        );
      });

      if (!hasPermission) {
        return res.status(403).json({
          error: `You don't have permission to ${requiredAction} ${requiredResource}`,
        });
      }

      req.role = role;

      next();
    } catch (error) {
      res.status(500).json({ error: "Permission check failed", details: error.message });
    }
  };
};

export const checkRoleAccess = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.membership) {
        return res.status(403).json({ error: "Organization access required" });
      }

      const role = await Role.findById(req.membership.role);

      if (!role || role.status !== "active" || String(role.organization) !== String(req.organizationId)) {
        return res.status(403).json({ error: "Role not found" });
      }

      if (!allowedRoles.includes(role.name)) {
        return res.status(403).json({
          error: `This action requires one of these roles: ${allowedRoles.join(", ")}`,
        });
      }

      req.role = role;

      next();
    } catch (error) {
      res.status(500).json({ error: "Role access check failed", details: error.message });
    }
  };
};

export const isAdmin = async (req, res, next) => {
  try {
    if (!req.membership) {
      return res.status(403).json({ error: "Organization access required" });
    }

    const role = await Role.findById(req.membership.role);

    if (
      !role ||
      role.status !== "active" ||
      String(role.organization) !== String(req.organizationId) ||
      !role.isSystem ||
      role.name !== "admin"
    ) {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.role = role;

    next();
  } catch (error) {
    res.status(500).json({ error: "Admin check failed", details: error.message });
  }
};

export const resourceAccess = (getUserFieldName = "userId") => {
  return async (req, res, next) => {
    try {
      const resourceUserId = req.params[getUserFieldName] || req.body[getUserFieldName];

      if (!resourceUserId) {
        return next();
      }

      if (resourceUserId.toString() !== req.user.id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ error: "You don't have access to this resource" });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: "Resource access check failed", details: error.message });
    }
  };
};
