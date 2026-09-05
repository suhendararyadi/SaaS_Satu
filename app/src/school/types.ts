import { type User } from "wasp/entities";
import { type UserRole, type SubscriptionTier } from "@prisma/client";

export { type UserRole, type SubscriptionTier };

export type SchoolScopedUser = User & {
  schoolId: string;
  role: UserRole;
};

export interface SchoolContext {
  user?: User;
}
