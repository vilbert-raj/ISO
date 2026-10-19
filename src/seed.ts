import { blankClauses } from './clauses';
import type { AppData, ClauseStatus } from './types';
import { uid } from './util';

/** Date string offset from today, so sample data always looks current. */
function d(offsetDays: number): string {
  const t = new Date();
  t.setDate(t.getDate() + offsetDays);
  return t.toISOString().slice(0, 10);
}

export function emptyData(): AppData {
  return {
    version: 1,
    settings: { company: 'My Company', hoursWorkedYTD: 0, certBody: '', cert9001Expiry: '', cert45001Expiry: '' },
    clauses: blankClauses(),
    audits: [],
    findings: [],
    incidents: [],
    hazards: [],
    documents: [],
    training: [],
    objectives: [],
  };
}

export function sampleData(): AppData {
  const data = emptyData();
  data.settings = {
    company: 'Sample Co. (demo data)',
    hoursWorkedYTD: 412000,
    certBody: 'Certification body',
    cert9001Expiry: d(420),
    cert45001Expiry: d(160),
  };

  const statusCycle: ClauseStatus[] = ['Verified', 'Implemented', 'Implemented', 'Verified', 'In progress', 'Implemented', 'Not started'];
  data.clauses = data.clauses.map((c, i) => ({
    ...c,
    status: c.standard === 'ISO 9001' && c.clause === '8.3' ? 'Not applicable' : statusCycle[i % statusCycle.length],
    owner: ['QHSE Manager', 'Operations Manager', 'HR Manager', 'Managing Director'][i % 4],
    evidence: i % 3 === 0 ? 'Procedure + records on shared drive' : '',
    lastReviewed: d(-((i * 11) % 200)),
    notes: c.standard === 'ISO 9001' && c.clause === '8.3' ? 'Excluded – no design activities (justified in scope statement)' : '',
  }));

  data.audits = [
    { id: uid(), title: 'Internal audit – Operations & site services', standard: 'Integrated', type: 'Internal', scope: 'Clauses 8.1–8.7, 8.1.2, 8.2', auditor: 'Internal audit team', plannedDate: d(-45), status: 'Completed', notes: '' },
    { id: uid(), title: 'Internal audit – HR, training & competence', standard: 'Integrated', type: 'Internal', scope: '7.1–7.3, 5.4', auditor: 'Internal audit team', plannedDate: d(12), status: 'Planned', notes: '' },
    { id: uid(), title: 'Surveillance audit – ISO 45001', standard: 'ISO 45001', type: 'External surveillance', scope: 'Full OH&S MS', auditor: 'Certification body', plannedDate: d(38), status: 'Planned', notes: '' },
    { id: uid(), title: 'Management review', standard: 'Integrated', type: 'Management review', scope: '9.3 inputs/outputs', auditor: 'Top management', plannedDate: d(55), status: 'Planned', notes: '' },
    { id: uid(), title: 'Supplier audit – uniform & PPE vendor', standard: 'ISO 9001', type: 'Supplier', scope: '8.4', auditor: 'Purchasing', plannedDate: d(-8), status: 'In progress', notes: '' },
  ];

  data.findings = [
    { id: uid(), ref: 'NCR-001', standard: 'ISO 45001', clause: '7.2', source: 'Internal audit', grade: 'Minor NC', description: 'Three site staff without current first-aid certificate', rootCause: 'No expiry tracking for certificates', action: 'Book refresher course; add expiry tracking', owner: 'HR Manager', raised: d(-44), due: d(-4), status: 'In progress', closedDate: '' },
    { id: uid(), ref: 'NCR-002', standard: 'ISO 9001', clause: '7.5', source: 'Internal audit', grade: 'Minor NC', description: 'Obsolete site instruction found at client site', rootCause: 'Superseded copies not withdrawn', action: 'Withdraw and confirm via site checklist', owner: 'Operations Manager', raised: d(-44), due: d(10), status: 'Awaiting verification', closedDate: '' },
    { id: uid(), ref: 'OBS-003', standard: 'ISO 9001', clause: '9.1', source: 'Customer complaint', grade: 'Observation', description: 'Customer satisfaction survey response rate low (18%)', rootCause: '', action: 'Move survey to QR code at handover', owner: 'QHSE Manager', raised: d(-20), due: d(30), status: 'Open', closedDate: '' },
    { id: uid(), ref: 'NCR-004', standard: 'ISO 45001', clause: '8.2', source: 'Incident', grade: 'Major NC', description: 'Emergency drill not carried out at two sites in last 12 months', rootCause: 'Drill schedule not assigned to site supervisors', action: 'Assign drill owners; run drills at both sites', owner: 'QHSE Manager', raised: d(-30), due: d(-2), status: 'Open', closedDate: '' },
    { id: uid(), ref: 'NCR-000', standard: 'ISO 9001', clause: '8.7', source: 'External audit', grade: 'Minor NC', description: 'Service failures not logged consistently', rootCause: 'Form not available on mobile', action: 'Digital incident/service-failure form', owner: 'Operations Manager', raised: d(-120), due: d(-60), status: 'Closed', closedDate: d(-65) },
  ];

  data.incidents = [
    { id: uid(), ref: 'INC-101', date: d(-150), type: 'Near miss', location: 'Site A car park', description: 'Vehicle reversed close to guard on patrol', daysLost: 0, reportedToAuthority: 'Not required', investigationOwner: 'Site Supervisor', status: 'Closed' },
    { id: uid(), ref: 'INC-102', date: d(-118), type: 'First aid', location: 'Site B', description: 'Minor cut from broken gate latch', daysLost: 0, reportedToAuthority: 'Not required', investigationOwner: 'Site Supervisor', status: 'Closed' },
    { id: uid(), ref: 'INC-103', date: d(-96), type: 'Lost time injury', location: 'Site C stairwell', description: 'Slip on wet stairs during night patrol – sprained ankle', daysLost: 5, reportedToAuthority: 'Yes', investigationOwner: 'QHSE Manager', status: 'Closed' },
    { id: uid(), ref: 'INC-104', date: d(-60), type: 'Near miss', location: 'HQ', description: 'Overloaded power socket in control room', daysLost: 0, reportedToAuthority: 'Not required', investigationOwner: 'Admin', status: 'Closed' },
    { id: uid(), ref: 'INC-105', date: d(-33), type: 'Medical treatment', location: 'Site A', description: 'Heat exhaustion during day shift', daysLost: 0, reportedToAuthority: 'No', investigationOwner: 'QHSE Manager', status: 'Actions assigned' },
    { id: uid(), ref: 'INC-106', date: d(-9), type: 'Near miss', location: 'Site D', description: 'Aggressive visitor at entrance', daysLost: 0, reportedToAuthority: 'Not required', investigationOwner: 'Operations Manager', status: 'Under investigation' },
  ];

  data.hazards = [
    { id: uid(), activity: 'Night patrol', hazard: 'Poor lighting / slips & trips', consequence: 'Fractures, sprains', likelihood: 4, severity: 3, controls: 'Torches issued, anti-slip footwear, lighting survey', residualLikelihood: 2, residualSeverity: 3, owner: 'Operations Manager', reviewDate: d(40), legalRef: 'OSH Act' },
    { id: uid(), activity: 'Outdoor day shifts', hazard: 'Heat stress', consequence: 'Heat exhaustion / stroke', likelihood: 4, severity: 4, controls: 'Water stations, shaded posts, rotation', residualLikelihood: 3, residualSeverity: 4, owner: 'QHSE Manager', reviewDate: d(-5), legalRef: '' },
    { id: uid(), activity: 'Access control', hazard: 'Workplace violence', consequence: 'Injury, trauma', likelihood: 3, severity: 4, controls: 'De-escalation training, radios, panic button', residualLikelihood: 2, residualSeverity: 4, owner: 'Operations Manager', reviewDate: d(70), legalRef: '' },
    { id: uid(), activity: 'Car park duty', hazard: 'Moving vehicles', consequence: 'Struck by vehicle', likelihood: 3, severity: 5, controls: 'Hi-vis vests, designated stands', residualLikelihood: 2, residualSeverity: 5, owner: 'Site Supervisor', reviewDate: d(20), legalRef: '' },
    { id: uid(), activity: 'Control room', hazard: 'Electrical overload', consequence: 'Fire, shock', likelihood: 2, severity: 4, controls: 'PAT testing, no daisy-chaining', residualLikelihood: 1, residualSeverity: 4, owner: 'Admin', reviewDate: d(120), legalRef: '' },
  ];

  data.documents = [
    { id: uid(), code: 'QM-01', title: 'Integrated management system manual', standard: 'Integrated', clause: '4.3', version: '3.0', owner: 'QHSE Manager', lastReview: d(-300), nextReview: d(65), status: 'Approved' },
    { id: uid(), code: 'POL-01', title: 'Quality & OH&S policy', standard: 'Integrated', clause: '5.2', version: '2.1', owner: 'Managing Director', lastReview: d(-370), nextReview: d(-5), status: 'Approved' },
    { id: uid(), code: 'PR-07', title: 'Hazard identification & risk assessment (HIRARC)', standard: 'ISO 45001', clause: '6.1.2', version: '1.4', owner: 'QHSE Manager', lastReview: d(-200), nextReview: d(165), status: 'Approved' },
    { id: uid(), code: 'PR-11', title: 'Control of nonconformity & corrective action', standard: 'ISO 9001', clause: '10.2', version: '2.0', owner: 'QHSE Manager', lastReview: d(-340), nextReview: d(25), status: 'Approved' },
    { id: uid(), code: 'PR-14', title: 'Emergency preparedness & response', standard: 'ISO 45001', clause: '8.2', version: '1.1', owner: 'Operations Manager', lastReview: d(-30), nextReview: d(335), status: 'Under review' },
    { id: uid(), code: 'PR-03', title: 'Control of documented information', standard: 'Integrated', clause: '7.5', version: '2.2', owner: 'QHSE Manager', lastReview: d(-100), nextReview: d(265), status: 'Approved' },
  ];

  data.training = [
    { id: uid(), employee: 'Ahmad R.', role: 'Security officer', course: 'First aid & CPR', standard: 'ISO 45001', completed: d(-700), expiry: d(-30), status: 'Expired' },
    { id: uid(), employee: 'Siti N.', role: 'Site supervisor', course: 'Internal auditor (ISO 9001/45001)', standard: 'Integrated', completed: d(-200), expiry: '', status: 'Completed' },
    { id: uid(), employee: 'Kumar V.', role: 'Security officer', course: 'Fire safety & evacuation', standard: 'ISO 45001', completed: d(-340), expiry: d(25), status: 'Completed' },
    { id: uid(), employee: 'Lim C.', role: 'Control room operator', course: 'Customer service standards', standard: 'ISO 9001', completed: d(-90), expiry: '', status: 'Completed' },
    { id: uid(), employee: 'Ahmad R.', role: 'Security officer', course: 'Conflict de-escalation', standard: 'ISO 45001', completed: '', expiry: '', status: 'Scheduled' },
    { id: uid(), employee: 'Farah Z.', role: 'Security officer', course: 'First aid & CPR', standard: 'ISO 45001', completed: d(-400), expiry: d(330), status: 'Completed' },
  ];

  data.objectives = [
    { id: uid(), standard: 'ISO 9001', objective: 'Improve customer satisfaction', kpi: 'Satisfaction score', target: 90, actual: 86, direction: 'Higher is better', unit: '%', owner: 'Operations Manager', due: d(70) },
    { id: uid(), standard: 'ISO 9001', objective: 'Reduce service complaints', kpi: 'Complaints per month', target: 3, actual: 2, direction: 'Lower is better', unit: '', owner: 'Operations Manager', due: d(70) },
    { id: uid(), standard: 'ISO 45001', objective: 'Reduce lost time injuries', kpi: 'LTIFR', target: 2, actual: 2.43, direction: 'Lower is better', unit: '', owner: 'QHSE Manager', due: d(70) },
    { id: uid(), standard: 'ISO 45001', objective: 'Complete safety training', kpi: 'Staff trained', target: 100, actual: 92, direction: 'Higher is better', unit: '%', owner: 'HR Manager', due: d(40) },
    { id: uid(), standard: 'ISO 45001', objective: 'Run emergency drills at all sites', kpi: 'Sites drilled', target: 100, actual: 60, direction: 'Higher is better', unit: '%', owner: 'QHSE Manager', due: d(20) },
  ];

  return data;
}
