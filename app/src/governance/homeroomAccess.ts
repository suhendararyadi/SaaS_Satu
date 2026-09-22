type HomeroomActor = { role: string };

export function canUseHomeroomWorkspace(user: HomeroomActor): boolean {
  return user.role === "TEACHER";
}
