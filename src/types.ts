// Tipe domain yang dipakai bersama. Bentuk mengikuti respons API backend (lihat backend/src/routes).

export type Role = 'super_admin' | 'hr' | 'engineering_manager' | 'tech_lead' | 'project_manager' | 'client_evaluator' | 'employee';
export type Seniority = 'junior' | 'middle' | 'senior';
export type Classification = 'Top Performer' | 'Middle Performer' | 'Low Performer';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  department: string | null;
  client_id: number | null;
  employee_id: number | null;
}

export interface Position { id: number; name: string; active: boolean }

export interface Department {
  id: number;
  name: string;
  active: boolean;
  employees: number;
  own_config: boolean;
  own_career: boolean;
  positions: Position[];
}

export interface Employee {
  id: number;
  code: string;
  name: string;
  email: string | null;
  position: string;
  seniority: Seniority;
  join_date: string;
  status: 'active' | 'inactive';
  department: string;
  tech_stack: string | null;
  lead_user_id: number | null;
  lead_name?: string | null;
  has_account?: boolean;
  projects?: string[];
}

export interface Period {
  id: number;
  name: string;
  department: string | null;
  start_date: string;
  end_date: string;
  deadline: string;
  status: 'draft' | 'active' | 'closed';
}

export interface DepartmentSummary {
  department: string;
  evaluated: number;
  completed: number;
  avg_score: number | null;
  distribution: Record<Classification, number>;
}

/** Respons daftar berhalaman dari API (`?page=&size=`). `summary` hanya ada pada endpoint yang menyediakannya. */
export interface Paged<T, S = unknown> {
  total: number;
  page: number;
  size: number;
  rows: T[];
  summary: S;
}
