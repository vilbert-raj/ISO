import type { ClauseRecord, Standard } from './types';

// Requirement clauses 4–10 of ISO 9001:2015 and ISO 45001:2018
// (incl. the 2024 climate-change amendment to 4.1/4.2).
const ISO9001: [string, string][] = [
  ['4.1', 'Understanding the organization and its context'],
  ['4.2', 'Needs and expectations of interested parties'],
  ['4.3', 'Scope of the quality management system'],
  ['4.4', 'QMS and its processes'],
  ['5.1', 'Leadership and commitment (incl. customer focus)'],
  ['5.2', 'Quality policy'],
  ['5.3', 'Roles, responsibilities and authorities'],
  ['6.1', 'Actions to address risks and opportunities'],
  ['6.2', 'Quality objectives and planning to achieve them'],
  ['6.3', 'Planning of changes'],
  ['7.1', 'Resources (people, infrastructure, environment, M&M resources, knowledge)'],
  ['7.2', 'Competence'],
  ['7.3', 'Awareness'],
  ['7.4', 'Communication'],
  ['7.5', 'Documented information'],
  ['8.1', 'Operational planning and control'],
  ['8.2', 'Requirements for products and services'],
  ['8.3', 'Design and development of products and services'],
  ['8.4', 'Control of externally provided processes, products and services'],
  ['8.5', 'Production and service provision'],
  ['8.6', 'Release of products and services'],
  ['8.7', 'Control of nonconforming outputs'],
  ['9.1', 'Monitoring, measurement, analysis and evaluation (incl. customer satisfaction)'],
  ['9.2', 'Internal audit'],
  ['9.3', 'Management review'],
  ['10.1', 'Improvement – general'],
  ['10.2', 'Nonconformity and corrective action'],
  ['10.3', 'Continual improvement'],
];

const ISO45001: [string, string][] = [
  ['4.1', 'Understanding the organization and its context'],
  ['4.2', 'Needs and expectations of workers and other interested parties'],
  ['4.3', 'Scope of the OH&S management system'],
  ['4.4', 'OH&S management system'],
  ['5.1', 'Leadership and commitment'],
  ['5.2', 'OH&S policy'],
  ['5.3', 'Organizational roles, responsibilities and authorities'],
  ['5.4', 'Consultation and participation of workers'],
  ['6.1.1', 'Actions to address risks and opportunities – general'],
  ['6.1.2', 'Hazard identification and assessment of risks and opportunities'],
  ['6.1.3', 'Determination of legal requirements and other requirements'],
  ['6.1.4', 'Planning action'],
  ['6.2', 'OH&S objectives and planning to achieve them'],
  ['7.1', 'Resources'],
  ['7.2', 'Competence'],
  ['7.3', 'Awareness'],
  ['7.4', 'Communication'],
  ['7.5', 'Documented information'],
  ['8.1.1', 'Operational planning and control – general'],
  ['8.1.2', 'Eliminating hazards and reducing OH&S risks'],
  ['8.1.3', 'Management of change'],
  ['8.1.4', 'Procurement (contractors, outsourcing)'],
  ['8.2', 'Emergency preparedness and response'],
  ['9.1.1', 'Monitoring, measurement, analysis and performance evaluation'],
  ['9.1.2', 'Evaluation of compliance'],
  ['9.2', 'Internal audit'],
  ['9.3', 'Management review'],
  ['10.1', 'Improvement – general'],
  ['10.2', 'Incident, nonconformity and corrective action'],
  ['10.3', 'Continual improvement'],
];

function build(standard: Standard, list: [string, string][]): ClauseRecord[] {
  const prefix = standard === 'ISO 9001' ? '9001' : '45001';
  return list.map(([clause, title]) => ({
    id: `${prefix}-${clause}`,
    standard,
    clause,
    title,
    status: 'Not started',
    owner: '',
    evidence: '',
    lastReviewed: '',
    notes: '',
  }));
}

export function blankClauses(): ClauseRecord[] {
  return [...build('ISO 9001', ISO9001), ...build('ISO 45001', ISO45001)];
}

export function section(clause: string): string {
  return clause.split('.')[0];
}

export const SECTION_NAMES: Record<string, string> = {
  '4': 'Context',
  '5': 'Leadership',
  '6': 'Planning',
  '7': 'Support',
  '8': 'Operation',
  '9': 'Performance evaluation',
  '10': 'Improvement',
};
