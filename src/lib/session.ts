import { apiPost } from "./api";

const ACTIVE_RUN_KEY = "sg-active-run";

export function beginSession() {
  sessionStorage.setItem("sg-session", "active");
}

export async function endSession() {
  try {
    await apiPost("/auth/logout");
  } finally {
    sessionStorage.removeItem("sg-session");
    localStorage.removeItem(ACTIVE_RUN_KEY);
    window.location.assign("/login");
  }
}
