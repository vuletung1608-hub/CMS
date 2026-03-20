export type UserRole = 'Coordinator' | 'Occurring Coordinator' | 'Line Manager' | 'ORM Staff' | 'ORM Leader' | 'ORMD Header' | 'Head of Division' | 'admin';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  division?: string;
  department?: string;
}

export type RiskEventStatus = 
  | 'Initiated'
  | 'Submitted'
  | 'Waiting for ORM Assignment'
  | 'Under Review by ORM for initial'
  | 'Cancelled'
  | 'Waiting for Coordinator of Occurring Unit Update'
  | 'Under Review by Line Manager of Occurring Unit'
  | 'Under Review by ORM for Update'
  | 'Under Review by ORM leader'
  | 'Waiting for ORM Update'
  | 'Under Review by Head of ORMD'
  | 'In Progress'
  | 'Done';

export interface RiskEvent {
  id: string;
  summary: string;
  idCode: string;
  description: string;
  detectingDivision: string;
  detectingDept: string;
  occurringDivision: string;
  occurringDept: string;
  dateOfDetection: string;
  dateOfOccurrence: string;
  lineManagerDetecting: string;
  coordinatorDetecting: string;
  lineManagerOccurring: string;
  coordinatorOccurring: string;
  ormStaff: string;
  rootCause: string;
  riskType: string;
  eventType: string;
  classificationOfLoss: string;
  lossAmount: number;
  additionalExpense: number;
  recoveryInsurance: number;
  recoveryStaff: number;
  recoveryOther: number;
  netLoss: number;
  likelihood: number; // 1-5
  impact: number; // 1-5
  riskLevel: 'High' | 'Medium' | 'Low';
  criticalRisk: boolean;
  comments: string;
  dueDate: string;
  overdue: boolean;
  contactInformation: string;
  isApproved: boolean;
  extendingDueDate: string;
  extendingRequestCount: number;
  headOfDivision: string;
  coordinatorOfDivision: string;
  completionDate: string;
  status: RiskEventStatus;
  createdBy: string;
  createdAt: string;
  attachments?: Attachment[];
}

export interface MitigationAction {
  id: string;
  riskEventId: string;
  summary: string;
  actionType: string;
  description: string;
  divisionInCharge: string;
  supportingUnits: string[];
  dueDate: string;
  implementationPlan: string;
  completeDate: string;
  actualStatus: 'completed' | 'in progress' | 'deleted';
  isOverDue: boolean;
  comments: string;
  createdBy: string;
  createdAt: string;
}
