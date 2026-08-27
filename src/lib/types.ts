export interface User {
  uid: string;
  company_name: string;
  total_branches: number;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface AuthPayload {
  uid: string;
  company_name: string;
  iat: number;
  exp: number;
}
