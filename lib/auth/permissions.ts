export const USER_ROLES = ["READER", "EDITOR", "ADMIN"] as const;
export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "BANNED", "DELETED"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export type AuthorizationSubject = {
  role: UserRole;
  status: UserStatus;
};

export function isActiveUser(subject: Pick<AuthorizationSubject, "status">): boolean {
  return subject.status === "ACTIVE";
}

export function canAccessAdmin(subject: AuthorizationSubject): boolean {
  return subject.status === "ACTIVE" && (subject.role === "ADMIN" || subject.role === "EDITOR");
}
