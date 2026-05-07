export function getUserId(): string {
  if (typeof window === "undefined") return "";
  let userId = localStorage.getItem("hemu_user_id");
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("hemu_user_id", userId);
  }
  return userId;
}
