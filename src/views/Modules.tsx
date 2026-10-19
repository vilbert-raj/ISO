import { CrudTable, type Field } from '../components/CrudTable';
import { Badge, Card, Progress } from '../components/ui';
import { clauseCompliance } from '../metrics';
import { useStore } from '../store';
import { CLAUSE_STATUSES, STANDARDS, type Audit, type ClauseRecord, type DocRecord, type Finding, type Hazard, type Incident, type Objective, type Training } from '../types';
import { daysUntil, objectiveOnTrack, objectiveProgress, riskLevel, riskScore, today } from '../util';

const STD_OPTS = ['ISO 9001', 'ISO 45001', 'Integrated'];
const SCALE = ['1', '2', '3', '4', '5'];

const clauseCmp = (a: string, b: string) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
};

/* ---------------- Clauses ---------------- */

const clauseFields: Field<ClauseRecord>[] = [
  { key: 'standard', label: 'Standard', type: 'select', options: STANDARDS, required: true },
  { key: 'clause', label: 'Clause', required: true },
  { key: 'title', label: 'Requirement', required: true },
  { key: 'status', label: 'Status', type: 'select', options: CLAUSE_STATUSES, badge: true, required: true },
  { key: 'owner', label: 'Owner' },
  { key: 'lastReviewed', label: 'Last reviewed', type: 'date' },
  { key: 'evidence', label: 'Evidence / records', type: 'textarea', inTable: true },
  { key: 'notes', label: 'Notes / gaps', type: 'textarea' },
];

export function ClausesView() {
  const { data } = useStore();
  return (
    <div className="grid">
      {STANDARDS.map((s) => {
        const c = clauseCompliance(data.clauses, s);
        return (
          <Card key={s} title={s}>
            <div className="big-pct">{Math.round(c.pct * 100)}%</div>
            <Progress value={c.pct} tone={c.pct >= 0.9 ? 'good' : 'warn'} />
            <p className="muted small">
              {c.verified} verified · {c.done - c.verified} implemented · {c.inProgress} in progress · {c.notStarted} not started (of {c.total} applicable)
            </p>
          </Card>
        );
      })}
      <div className="span-all">
        <CrudTable
          title="Clause compliance register"
          collection="clauses"
          fields={clauseFields}
          intro="One row per requirement clause (4–10). Click a row to set its status, owner and evidence. ‘Implemented’ and ‘Verified’ count towards readiness; ‘Not applicable’ is excluded (justify it in your scope)."
          newItem={() => ({ standard: 'ISO 9001' as const, clause: '', title: '', status: 'Not started' as const, owner: '', evidence: '', lastReviewed: today(), notes: '' })}
          filterKeys={['standard', 'status', 'owner']}
          sort={(a, b) => a.standard.localeCompare(b.standard) || clauseCmp(a.clause, b.clause)}
          rowFlag={(r) => (r.status === 'Not started' ? 'soon' : undefined)}
        />
      </div>
    </div>
  );
}

/* ---------------- Audits & CAPA ---------------- */

const auditFields: Field<Audit>[] = [
  { key: 'title', label: 'Audit', required: true },
  { key: 'standard', label: 'Standard', type: 'select', options: STD_OPTS },
  { key: 'type', label: 'Type', type: 'select', options: ['Internal', 'External surveillance', 'Certification', 'Recertification', 'Supplier', 'Management review'] },
  { key: 'scope', label: 'Scope / clauses' },
  { key: 'auditor', label: 'Auditor' },
  { key: 'plannedDate', label: 'Date', type: 'date', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Planned', 'In progress', 'Completed', 'Cancelled'], badge: true },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const findingFields: Field<Finding>[] = [
  { key: 'ref', label: 'Ref', required: true },
  { key: 'standard', label: 'Standard', type: 'select', options: STD_OPTS },
  { key: 'clause', label: 'Clause' },
  { key: 'grade', label: 'Grade', type: 'select', options: ['Major NC', 'Minor NC', 'Observation', 'OFI'], badge: true },
  { key: 'source', label: 'Source', type: 'select', options: ['Internal audit', 'External audit', 'Customer complaint', 'Incident', 'Management review', 'Other'] },
  { key: 'description', label: 'Finding', required: true, inTable: true },
  { key: 'rootCause', label: 'Root cause', type: 'textarea' },
  { key: 'action', label: 'Corrective action', type: 'textarea' },
  { key: 'owner', label: 'Owner' },
  { key: 'raised', label: 'Raised', type: 'date', inTable: false },
  { key: 'due', label: 'Due', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Open', 'In progress', 'Awaiting verification', 'Closed'], badge: true },
  { key: 'closedDate', label: 'Closed on', type: 'date', inTable: false },
];

export function AuditsView() {
  return (
    <div className="stack">
      <CrudTable
        title="Audit programme"
        collection="audits"
        fields={auditFields}
        newItem={() => ({ title: '', standard: 'Integrated', type: 'Internal', scope: '', auditor: '', plannedDate: '', status: 'Planned', notes: '' })}
        filterKeys={['standard', 'type', 'status']}
        sort={(a, b) => a.plannedDate.localeCompare(b.plannedDate)}
        rowFlag={(r) => (r.status === 'Planned' && daysUntil(r.plannedDate) < 0 ? 'overdue' : r.status === 'Planned' && daysUntil(r.plannedDate) <= 14 ? 'soon' : undefined)}
      />
      <CrudTable
        title="Findings & corrective actions (CAPA)"
        collection="findings"
        fields={findingFields}
        intro="Log nonconformities from audits, complaints and incidents (ISO 9001 10.2 / ISO 45001 10.2). Overdue open actions are highlighted."
        newItem={() => ({ ref: '', standard: 'ISO 9001', clause: '', source: 'Internal audit', grade: 'Minor NC', description: '', rootCause: '', action: '', owner: '', raised: today(), due: '', status: 'Open', closedDate: '' })}
        filterKeys={['standard', 'grade', 'status', 'owner']}
        sort={(a, b) => Number(a.status === 'Closed') - Number(b.status === 'Closed') || (a.due || '9').localeCompare(b.due || '9')}
        rowFlag={(r) => (r.status !== 'Closed' && daysUntil(r.due) < 0 ? 'overdue' : r.status !== 'Closed' && daysUntil(r.due) <= 7 ? 'soon' : undefined)}
      />
    </div>
  );
}

/* ---------------- OH&S ---------------- */

const incidentFields: Field<Incident>[] = [
  { key: 'ref', label: 'Ref', required: true },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'type', label: 'Type', type: 'select', options: ['Near miss', 'First aid', 'Medical treatment', 'Lost time injury', 'Dangerous occurrence', 'Occupational disease', 'Fatality', 'Property damage'], badge: true },
  { key: 'location', label: 'Location' },
  { key: 'description', label: 'Description', type: 'textarea', inTable: true },
  { key: 'daysLost', label: 'Days lost', type: 'number' },
  { key: 'reportedToAuthority', label: 'Reported to authority', type: 'select', options: ['Yes', 'No', 'Not required'], inTable: false, hint: 'e.g. statutory notification of accidents / dangerous occurrences' },
  { key: 'investigationOwner', label: 'Investigation owner' },
  { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Under investigation', 'Actions assigned', 'Closed'], badge: true },
];

const hazardFields: Field<Hazard>[] = [
  { key: 'activity', label: 'Activity / area', required: true },
  { key: 'hazard', label: 'Hazard', required: true },
  { key: 'consequence', label: 'Consequence', inTable: false },
  { key: 'likelihood', label: 'Likelihood (1–5)', type: 'select', options: SCALE, inTable: false },
  { key: 'severity', label: 'Severity (1–5)', type: 'select', options: SCALE, inTable: false },
  { key: 'controls', label: 'Controls', type: 'textarea' },
  { key: 'residualLikelihood', label: 'Residual likelihood (1–5)', type: 'select', options: SCALE, inTable: false },
  { key: 'residualSeverity', label: 'Residual severity (1–5)', type: 'select', options: SCALE, inTable: false },
  { key: 'owner', label: 'Owner' },
  { key: 'reviewDate', label: 'Next review', type: 'date' },
  { key: 'legalRef', label: 'Legal / other requirement', inTable: false },
];

function RiskCell({ l, s }: { l: number; s: number }) {
  const score = riskScore(l, s);
  return <Badge>{`${riskLevel(score)}`}</Badge>;
}

export function SafetyView() {
  const hazardColumns: Field<Hazard>[] = [
    hazardFields[0],
    hazardFields[1],
    { key: 'likelihood', label: 'Initial risk', render: (r) => <span className="nowrap">{riskScore(r.likelihood, r.severity)} <RiskCell l={r.likelihood} s={r.severity} /></span> },
    { key: 'residualLikelihood', label: 'Residual risk', render: (r) => <span className="nowrap">{riskScore(r.residualLikelihood, r.residualSeverity)} <RiskCell l={r.residualLikelihood} s={r.residualSeverity} /></span> },
    ...hazardFields.filter((f) => ['controls', 'owner', 'reviewDate'].includes(f.key)),
  ];
  return (
    <div className="stack">
      <CrudTable
        title="Incidents & near misses"
        collection="incidents"
        fields={incidentFields}
        intro="Record every incident and near miss (ISO 45001 10.2). LTIFR and days-since-LTI on the overview are calculated from this log and the hours worked in Settings."
        newItem={() => ({ ref: '', date: today(), type: 'Near miss', location: '', description: '', daysLost: 0, reportedToAuthority: 'Not required', investigationOwner: '', status: 'Open' })}
        filterKeys={['type', 'status', 'location']}
        sort={(a, b) => b.date.localeCompare(a.date)}
        rowFlag={(r) => (r.status !== 'Closed' && daysUntil(r.date) < -30 ? 'overdue' : r.status === 'Open' ? 'soon' : undefined)}
      />
      <CrudTable
        title="Hazard & risk register (HIRARC)"
        collection="hazards"
        fields={hazardFields}
        columns={hazardColumns}
        intro="Risk = likelihood × severity on a 5×5 scale (High ≥ 15, Medium 8–14, Low ≤ 7). Record initial and residual (after controls) ratings (ISO 45001 6.1.2, 8.1.2)."
        newItem={() => ({ activity: '', hazard: '', consequence: '', likelihood: 3, severity: 3, controls: '', residualLikelihood: 2, residualSeverity: 3, owner: '', reviewDate: '', legalRef: '' })}
        filterKeys={['owner']}
        sort={(a, b) => riskScore(b.residualLikelihood, b.residualSeverity) - riskScore(a.residualLikelihood, a.residualSeverity)}
        rowFlag={(r) => (daysUntil(r.reviewDate) < 0 ? 'overdue' : riskLevel(riskScore(r.residualLikelihood, r.residualSeverity)) === 'High' ? 'soon' : undefined)}
      />
    </div>
  );
}

/* ---------------- Records ---------------- */

const docFields: Field<DocRecord>[] = [
  { key: 'code', label: 'Code', required: true },
  { key: 'title', label: 'Title', required: true },
  { key: 'standard', label: 'Standard', type: 'select', options: STD_OPTS },
  { key: 'clause', label: 'Clause' },
  { key: 'version', label: 'Version' },
  { key: 'owner', label: 'Owner' },
  { key: 'lastReview', label: 'Last review', type: 'date', inTable: false },
  { key: 'nextReview', label: 'Next review', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Under review', 'Approved', 'Obsolete'], badge: true },
];

const trainingFields: Field<Training>[] = [
  { key: 'employee', label: 'Employee', required: true },
  { key: 'role', label: 'Role' },
  { key: 'course', label: 'Course / competence', required: true },
  { key: 'standard', label: 'Standard', type: 'select', options: STD_OPTS },
  { key: 'completed', label: 'Completed', type: 'date' },
  { key: 'expiry', label: 'Expiry', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Completed', 'Expired'], badge: true },
];

const objectiveFields: Field<Objective>[] = [
  { key: 'standard', label: 'Standard', type: 'select', options: STD_OPTS },
  { key: 'objective', label: 'Objective', required: true },
  { key: 'kpi', label: 'KPI' },
  { key: 'target', label: 'Target', type: 'number' },
  { key: 'actual', label: 'Actual', type: 'number' },
  { key: 'unit', label: 'Unit', inTable: false },
  { key: 'direction', label: 'Direction', type: 'select', options: ['Higher is better', 'Lower is better'], inTable: false },
  { key: 'owner', label: 'Owner' },
  { key: 'due', label: 'Due', type: 'date' },
];

export function RecordsView() {
  const objCols: Field<Objective>[] = [
    ...objectiveFields.filter((f) => f.inTable !== false),
    { key: 'id', label: 'Progress', render: (o) => (
      <div className="prog-cell"><Progress value={objectiveProgress(o)} tone={objectiveOnTrack(o) ? 'good' : 'warn'} /><Badge>{objectiveOnTrack(o) ? 'On track' : 'Off track'}</Badge></div>
    ) },
  ];
  return (
    <div className="stack">
      <CrudTable
        title="Controlled documents"
        collection="documents"
        fields={docFields}
        intro="Master list of documented information (7.5): policies, procedures, forms. Overdue reviews are highlighted."
        newItem={() => ({ code: '', title: '', standard: 'Integrated', clause: '', version: '1.0', owner: '', lastReview: today(), nextReview: '', status: 'Draft' })}
        filterKeys={['standard', 'status', 'owner']}
        sort={(a, b) => (a.nextReview || '9').localeCompare(b.nextReview || '9')}
        rowFlag={(r) => (r.status !== 'Obsolete' && daysUntil(r.nextReview) < 0 ? 'overdue' : r.status !== 'Obsolete' && daysUntil(r.nextReview) <= 30 ? 'soon' : undefined)}
      />
      <CrudTable
        title="Training & competence"
        collection="training"
        fields={trainingFields}
        intro="Competence records (7.2). Certificates past expiry count as expired even if not marked so."
        newItem={() => ({ employee: '', role: '', course: '', standard: 'ISO 45001', completed: '', expiry: '', status: 'Scheduled' })}
        filterKeys={['standard', 'status', 'course']}
        sort={(a, b) => (a.expiry || '9').localeCompare(b.expiry || '9')}
        rowFlag={(r) => (r.status === 'Expired' || daysUntil(r.expiry) < 0 ? 'overdue' : daysUntil(r.expiry) <= 30 ? 'soon' : undefined)}
      />
      <CrudTable
        title="Quality & OH&S objectives"
        collection="objectives"
        fields={objectiveFields}
        columns={objCols}
        intro="Measurable objectives (ISO 9001 6.2 / ISO 45001 6.2). Update ‘Actual’ as results come in."
        newItem={() => ({ standard: 'ISO 9001', objective: '', kpi: '', target: 0, actual: 0, direction: 'Higher is better', unit: '', owner: '', due: '' })}
        filterKeys={['standard', 'owner']}
        rowFlag={(o) => (!objectiveOnTrack(o) && daysUntil(o.due) < 0 ? 'overdue' : !objectiveOnTrack(o) ? 'soon' : undefined)}
      />
    </div>
  );
}
