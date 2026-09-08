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

export const TRANSLATION_PERMISSIONS = [
  "translation.view",
  "translation.configure",
  "translation.run",
  "translation.edit",
  "translation.approve",
  "translation.publish",
  "translation.cancel_job",
  "translation.manage_models",
] as const;

export type TranslationPermission = (typeof TRANSLATION_PERMISSIONS)[number];

const editorTranslationPermissions = new Set<TranslationPermission>([
  "translation.view",
  "translation.configure",
  "translation.run",
  "translation.edit",
  "translation.approve",
]);

export function can(subject: AuthorizationSubject, permission: TranslationPermission): boolean {
  if (!isActiveUser(subject)) return false;
  if (subject.role === "ADMIN") return true;
  return subject.role === "EDITOR" && editorTranslationPermissions.has(permission);
}
