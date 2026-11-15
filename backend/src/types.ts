export type Role = "SAILOR" | "STAFF" | "ADMIN";
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
}
export interface Session {
  user: User;
  sessionId: string;
  csrfToken: string;
}
declare global {
  namespace Express {
    interface Request {
      auth?: Session;
    }
  }
}
