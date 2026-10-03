import { useAuth } from "./useAuth";

export type CrudAction = "view" | "create" | "edit" | "delete" | "approve";

/**
 * Universal Permission & Role Hook for SanSuite
 * Provides granular RBAC and CRUD permission checks across all modules.
 */
export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role || "staff";
  const isSuperAdmin = role === "admin" || role === "super_accountant";
  const permissions = user?.permissions;

  /**
   * Checks whether the current user has access to a primary module.
   */
  const canAccessModule = (moduleKey: string): boolean => {
    if (isSuperAdmin) return true;
    if (!permissions?.modulePermissions) return true;
    return permissions.modulePermissions[moduleKey] !== false;
  };

  /**
   * Checks whether the current user is authorized to perform a specific action (CRUD or Sign-Off)
   * on a given module.
   */
  const canPerform = (moduleKey: string, action: CrudAction): boolean => {
    // Super Admins & Partners have unchecked authority
    if (isSuperAdmin) return true;

    // If master module is disabled, all actions are prohibited
    if (!canAccessModule(moduleKey)) return false;

    // Statutory Auditors are strictly read-only
    if (role === "auditor" && action !== "view") return false;

    // Check custom saved CRUD permissions matrix
    const crud = permissions?.crudPermissions?.[moduleKey];
    if (crud && typeof crud[action] === "boolean") {
      return crud[action];
    }

    // Role-based fallbacks
    if (action === "approve") {
      return role === "accountant" || role === "super_accountant";
    }
    if (action === "delete") {
      return role === "accountant" && moduleKey !== "practice_management";
    }

    return true;
  };

  /**
   * Checks whether a specific sub-feature or option is enabled for the current user.
   */
  const isFeatureEnabled = (subFeatureKey: string): boolean => {
    if (isSuperAdmin) return true;
    if (!permissions?.modulePermissions) return true;
    return permissions.modulePermissions[subFeatureKey] !== false;
  };

  /**
   * Checks whether the user is assigned to a specific client company.
   */
  const isClientAssigned = (clientId: number): boolean => {
    if (isSuperAdmin) return true;
    if (permissions?.autoAssign) return true;
    const assigned = permissions?.assignedClientIds;
    if (Array.isArray(assigned)) {
      return assigned.includes(clientId);
    }
    return true;
  };

  return {
    user,
    role,
    isSuperAdmin,
    isSeniorAccountant: role === "accountant",
    isJuniorStaff: role === "staff",
    isAuditor: role === "auditor",
    canManageUsers: isSuperAdmin || permissions?.canManageUsers === true,
    canManageRoles: isSuperAdmin,
    canAccessModule,
    canPerform,
    isFeatureEnabled,
    isClientAssigned,
  };
}
