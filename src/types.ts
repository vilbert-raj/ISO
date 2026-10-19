export type Standard = 'ISO 9001' | 'ISO 45001';
export const STANDARDS: Standard[] = ['ISO 9001', 'ISO 45001'];

export type ClauseStatus = 'Not started' | 'In progress' | 'Implemented' | 'Verified' | 'Not applicable';
export const CLAUSE_STATUSES: ClauseStatus[] = ['Not started', 'In progress', 'Implemented', 'Verified', 'Not applicable'];

export interface ClauseRecord {
  id: string; // e.g. "9001-7.2"
  standard: Standard;
  clause: string; // "7.2"
  title: string;
  status: ClauseStatus;
  owner: string;
  evidence: string;
  lastReviewed: string;
  notes: string;
}

export interface Audit {
  id: string;
  title: string;
  standard: string; // ISO 9001 / ISO 45001 / Integrated
  type: string; // Internal / External surveillance / Certification / Supplier
  scope: string;
  auditor: string;
  plannedDate: string;
  status: string; // Planned / In progress / Completed / Cancelled
  notes: string;
}

export interface Finding {
  id: string;
  ref: string;
  standard: string;
  clause: string;
  source: string; // Internal audit / External audit / Customer complaint / Incident / Other
  grade: string; // Major NC / Minor NC / Observation / OFI
  description: string;
  rootCause: string;
  action: string;
  owner: string;
  raised: string;
  due: string;
  status: string; // Open / In progress / Awaiting verification / Closed
  closedDate: string;
}

export interface Incident {
  id: string;
  ref: string;
  date: string;
  type: string; // Near miss / First aid / Medical treatment / Lost time injury / Dangerous occurrence / Occupational disease / Property damage
  location: string;
  description: string;
  daysLost: number;
  reportedToAuthority: string; // Yes / No / Not required
  investigationOwner: string;
  status: string; // Open / Under investigation / Actions assigned / Closed
}

export interface Hazard {
  id: string;
  activity: string;
  hazard: string;
  consequence: string;
  likelihood: number; // 1–5
  severity: number; // 1–5
  controls: string;
  residualLikelihood: number;
  residualSeverity: number;
  owner: string;
  reviewDate: string;
  legalRef: string;
}

export interface DocRecord {
  id: string;
  code: string;
  title: string;
  standard: string;
  clause: string;
  version: string;
  owner: string;
  lastReview: string;
  nextReview: string;
  status: string; // Draft / Under review / Approved / Obsolete
}

export interface Training {
  id: string;
  employee: string;
  role: string;
  course: string;
  standard: string;
  completed: string;
  expiry: string;
  status: string; // Scheduled / Completed / Expired
}

export interface Objective {
  id: string;
  standard: string;
  objective: string;
  kpi: string;
  target: number;
  actual: number;
  direction: string; // Higher is better / Lower is better
  unit: string;
  owner: string;
  due: string;
}

export interface Settings {
  company: string;
  hoursWorkedYTD: number;
  certBody: string;
  cert9001Expiry: string;
  cert45001Expiry: string;
}

export interface AppData {
  version: 1;
  settings: Settings;
  clauses: ClauseRecord[];
  audits: Audit[];
  findings: Finding[];
  incidents: Incident[];
  hazards: Hazard[];
  documents: DocRecord[];
  training: Training[];
  objectives: Objective[];
}

export type CollectionKey = Exclude<keyof AppData, 'version' | 'settings'>;
