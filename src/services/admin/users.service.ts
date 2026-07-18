import {
  listAdminUsers,
  getAdminUser,
  createAdminUser,
  updateAdminUser,
  setUserStatus,
  assignUserRole,
  removeUserRole,
} from "@/features/admin/users.functions";

export const adminUsersService = {
  list: listAdminUsers,
  get: getAdminUser,
  create: createAdminUser,
  update: updateAdminUser,
  setStatus: setUserStatus,
  assignRole: assignUserRole,
  removeRole: removeUserRole,
};