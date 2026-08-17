/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum JobStatus {
  ACTIVE = "active",
  DRAFT = "draft",
  CLOSED = "closed"
}

export enum UserRole {
  ADMIN = "ADMIN",
  HR = "HR",
  INTERVIEWER = "INTERVIEWER",
  HIRING_MANAGER = "HIRING_MANAGER"
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  role: UserRole;
  status: "ACTIVE" | "DEACTIVATED";
  lastLogin?: string;
  isFirstLogin?: boolean;
}

export enum JobType {
  FULL_TIME = "Full-time",
  PART_TIME = "Part-time",
  CONTRACT = "Contract",
  REMOTE = "Remote",
  INTERNSHIP = "Internship"
}

export interface Job {
  id: string;
  title: string;
  department: string;
  hiringManager: string;
  recruiter: string;
  location: string;
  type: JobType;
  workMode: "Remote" | "Hybrid" | "On-site";
  experienceRange: string;
  salaryRange: string;
  openings: number;
  deadline: string;
  targetJoiningDate: string;
  status: JobStatus;
  description?: string;
  
  // Education
  education: {
    degree: string;
    branch: string;
    minCGPA: number;
    preferredUniversities: string[];
  };
  
  // Skills
  requiredSkills: string[];
  preferredSkills: string[];
  
  // Content
  responsibilities: string[];
  requirements: {
    mustHave: string[];
    goodToHave: string[];
    softSkills: string[];
    languages: string[];
  };
  benefits: string[];
  
  // AI/Process
  aiEvaluationCriteria: {
    skillsWeight: number;
    educationWeight: number;
    experienceWeight: number;
    certificationsWeight: number;
  };
  interviewStages: string[];
  
  // Meta
  attachments: {
    jdUrl?: string;
    brochureUrl?: string;
    interviewGuideUrl?: string;
  };
  publishedPlatforms: string[];
  publicApplyLink?: string;
  
  createdAt: string;
  candidateCount: number;
}

export enum ApplicationStatus {
  APPLIED = "Applied",
  SCREENING = "Screening",
  SHORTLISTED = "Shortlisted",
  INTERVIEWING = "Interviewing",
  OFFERED = "Offered",
  REJECTED = "Rejected"
}

export interface AIEvaluation {
  score: number; // 0 - 100
  summary: string;
  strengths: string[];
  gaps: string[];
  interviewQuestions: string[];
  fitReasoning: string;
}

export interface TimelineEvent {
  id: string;
  status: ApplicationStatus | string;
  title: string;
  description: string;
  timestamp: string;
  performedBy?: string;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  appliedAt: string;
  aiEvaluation?: AIEvaluation;
  timeline: TimelineEvent[];
  notes?: string;
}

export interface Candidate {
  id: string;
  candidateId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentRole: string;
  currentCompany: string;
  skills: string[];
  experienceYears: number;
  resumeText?: string;
  linkedinUrl?: string;
  avatarUrl?: string;
  source?: string;
  location?: string;
  expectedCTC?: number; // Expected CTC in LPA
  currentCTC?: number;  // Current CTC in LPA
  hrNotes?: string;
  hrApprovalStatus?: "pending" | "approved" | "rejected";
  customFields?: { key: string; value: string }[];
  
  // New application form fields
  experienceLevel?: string;
  noticePeriod?: string;
  portfolioUrl?: string;
  highestEducation?: string;
  specialization?: string;
  yearOfPassing?: string;
  totalExperience?: string;
  keySkills?: string;
  inHandSalary?: string;
  projectsWorkedOn?: string;
  relocateToPune?: string;
}

export interface DashboardStats {
  totalJobs: number;
  activeVacancies: number;
  activeCandidates: number;
  totalCandidates: number;
  talentPoolCount: number;
  pendingReviews: number;
  aiShortlistedCount: number;
  interviewStageCount: number;
  offeredCount: number;
  hiredCount: number;
  rejectedCount: number;
  appsTodayCount: number;
  averageMatchScore: number;
  todayInterviews: number;
  upcomingInterviews: number;
  completedInterviews: number;
  cancelledInterviews: number;
  pendingFeedback: number;
  totalInterviews: number;
  totalOffers: number;
  pendingOffers: number;
  averageDuration: number;
  pipelineDistribution?: { status: ApplicationStatus; count: number }[];
  weeklyApplications: { name: string; count: number }[];
}

export enum InterviewStatus {
  UPCOMING = "Upcoming",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled"
}

export enum InterviewType {
  ONLINE = "Online",
  OFFLINE = "Offline"
}

export enum RecommendationType {
  HIRE = "Hire",
  HOLD = "Hold",
  REJECT = "Reject"
}

export interface InterviewFeedback {
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  comments: string;
  recommendation: RecommendationType;
}

export interface Interview {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  round: string;
  interviewer: string;
  date: string;
  time: string;
  type: InterviewType;
  platform?: string;
  location?: string;
  status: InterviewStatus;
  notes?: string;
  feedback?: InterviewFeedback;
  
  // Google Workspace Integration Fields
  googleEventId?: string;
  googleMeetUrl?: string;
  meetingProvider?: string;
  meetingStatus?: string;
  calendarSynced?: boolean;
  duration?: number;
}

export interface NotificationItem {
  id: string;
  type: 
    | "candidate_applied"
    | "interview_reminder"
    | "offer_accepted"
    | "offer_rejected"
    | "candidate_withdrawn"
    | "resume_uploaded"
    | "ai_screening_completed"
    | "job_published"
    | "new_referral"
    | "system";
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  priority: "HIGH" | "MEDIUM" | "LOW";
  candidateName?: string;
  jobTitle?: string;
  recruiterName?: string;
  matchScore?: number;
  actionLabel?: string;
}

export interface EmailLog {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  subject: string;
  body: string;
  sentAt: string;
  type: "shortlisted" | "interview" | "offer" | "rejection";
  recipients: string[];
  interviewerName?: string;
  meetingLink?: string;
  hasAttachment?: boolean;
  attachmentName?: string;
  attachmentData?: string; // base64 or custom string representation of PDF
}


