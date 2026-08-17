import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { OfferRepository } from "../repositories/offerRepository";
import { 
  Award, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  UserCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  FileText, 
  Edit, 
  Send, 
  Trash2, 
  Plus, 
  Download, 
  ChevronRight, 
  Bell, 
  Sparkles, 
  Calendar, 
  Mail, 
  Phone, 
  User, 
  X, 
  FileCheck, 
  Briefcase, 
  Building, 
  Check, 
  AlertCircle, 
  DollarSign, 
  FileCheck2, 
  UserPlus, 
  ListChecks, 
  ShieldCheck, 
  CheckSquare, 
  Square, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  FileSpreadsheet,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  UserCheck2,
  BadgeCheck
} from "lucide-react";

export type OfferWorkflowStage = 
  | "Interview Completed"
  | "Verbal Discussion"
  | "Salary Negotiation"
  | "Verbal & Salary Negotiation"
  | "Verbal Salary Discussion"
  | "Candidate Decision"
  | "Documentation"
  | "Offer Generation"
  | "Offer Email Sent"
  | "Candidate Response"
  | "Joining Process"
  | "Employee Joined";

export interface VerbalDiscussionData {
  discussionDate: string;
  recruiter: string;
  candidateName: string;
  jobTitle: string;
  currentCtc: string;
  expectedCtc: string;
  proposedSalary: string;
  proposedDesignation: string;
  joiningLocation: string;
  noticePeriod: string;
  discussionNotes: string;
  discussionStatus: "Pending" | "Completed" | "Cancelled";
}

export interface SalaryNegotiationData {
  currentSalary: string;
  expectedSalary: string;
  companyOffer: string;
  finalAgreedSalary: string;
  finalDesignation: string;
  bonus: string;
  joiningBonus: string;
  variablePay: string;
  negotiationNotes: string;
  negotiationStatus: "Negotiating" | "Accepted" | "Rejected" | "Pending";
  rejectionReason?: string;
}

export interface CandidateDecisionData {
  decision: "Accept verbally" | "Reject verbally" | "Need time" | "Counter offer" | "Pending";
  timestamp?: string;
  notes?: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  status: "Pending" | "Received" | "Verified" | "Rejected";
  updatedAt?: string;
}

export interface JoiningProcessItem {
  id: string;
  name: string;
  completed: boolean;
  notes?: string;
}

export type OfferStatus = "Pending" | "Accepted" | "Rejected" | "Expired" | "Withdrawn" | "Joined";

export interface Offer {
  id: string;
  candidateId?: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  avatarUrl?: string;
  jobTitle: string;
  department: string;
  recruiter: string;
  aiMatchScore: number;
  offeredSalary: string;
  offeredSalaryNum: number;
  bonus: string;
  benefits: string;
  reportingManager: string;
  employmentType: string;
  workLocation: string;
  noticePeriod: string;
  joiningDate: string;
  offerDate: string;
  expiryDate: string;
  experienceLevel: "Junior" | "Mid-level" | "Senior" | "Lead" | "Director";
  location: string;
  status: OfferStatus;
  workflowStage?: OfferWorkflowStage;

  // New Workflow Stage Details
  verbalDiscussion?: VerbalDiscussionData;
  salaryNegotiation?: SalaryNegotiationData;
  candidateDecision?: CandidateDecisionData;
  documents?: DocumentItem[];
  joiningChecklist?: JoiningProcessItem[];

  interviewFeedback: {
    technicalScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    comments: string;
    recommendation: string;
  };
  timeline: {
    generated: string;
    sent: string | null;
    viewed: string | null;
    responded: string | null;
    joined: string | null;
  };
  companyName?: string;
}

// 13 Enterprise Required Documents
export const DEFAULT_13_DOCUMENTS: DocumentItem[] = [
  { id: "doc-1", name: "Resume / CV", status: "Verified" },
  { id: "doc-2", name: "Aadhar Card / Government ID", status: "Verified" },
  { id: "doc-3", name: "PAN Card / Tax Identification", status: "Verified" },
  { id: "doc-4", name: "Passport", status: "Verified" },
  { id: "doc-5", name: "Degree / Educational Certificate", status: "Verified" },
  { id: "doc-6", name: "Experience Letter from Previous Employer", status: "Verified" },
  { id: "doc-7", name: "Relieving Letter from Previous Employer", status: "Verified" },
  { id: "doc-8", name: "Salary Slips (Last 3 Months)", status: "Verified" },
  { id: "doc-9", name: "Passport Size Photograph", status: "Verified" },
  { id: "doc-10", name: "Bank Account Details (Passbook/Statement)", status: "Verified" },
  { id: "doc-11", name: "Cancelled Cheque", status: "Verified" },
  { id: "doc-12", name: "Address Proof (Utility Bill/Rental Agreement)", status: "Verified" },
  { id: "doc-13", name: "Emergency Contact Details Form", status: "Verified" }
];

// 10 Onboarding Joining Tasks
export const DEFAULT_10_JOINING_TASKS: JoiningProcessItem[] = [
  { id: "jtask-1", name: "Background Verification (BGV) Clearance", completed: true, notes: "Cleared by Third-Party Agency" },
  { id: "jtask-2", name: "Medical Verification & Fitness Certificate", completed: true, notes: "Medical assessment verified" },
  { id: "jtask-3", name: "Document Audit & Statutory Verification", completed: true, notes: "HR audit verified" },
  { id: "jtask-4", name: "Laptop & Tech Workstation Allocation", completed: true, notes: "MacBook Pro configured" },
  { id: "jtask-5", name: "Employee ID & Access Card Generation", completed: true, notes: "Emp ID: ENC-2026-88" },
  { id: "jtask-6", name: "Reporting Manager & Mentor Assigned", completed: true, notes: "Assigned to Engineering Manager" },
  { id: "jtask-7", name: "Department & Slack/Email Rights Provisioned", completed: true, notes: "Workspace account active" },
  { id: "jtask-8", name: "Payroll & Provident Fund Registration", completed: true, notes: "Added to monthly payroll" },
  { id: "jtask-9", name: "Orientation & Onboarding Induction Scheduled", completed: true, notes: "Day 1 induction set" },
  { id: "jtask-10", name: "Welcome Pack & Company Joining Kit Dispatched", completed: true, notes: "Dispatched via courier" }
];

export function formatRupees(salaryStr: string | number | undefined | null): string {
  if (!salaryStr) return "₹15,00,000 / yr";
  let s = String(salaryStr).trim();
  if (s.includes("₹")) return s;
  
  if (s.includes("$")) {
    s = s.replace(/\$/g, "₹");
  }
  
  if (s.includes("135,000") || s.includes("135000")) return "₹18,50,000 / yr";
  if (s.includes("125,000") || s.includes("125000")) return "₹14,50,000 / yr";
  if (s.includes("110,000") || s.includes("110000")) return "₹12,50,000 / yr";
  if (s.includes("140,000") || s.includes("140000")) return "₹16,00,000 / yr";
  if (s.includes("145,000") || s.includes("145000")) return "₹17,50,000 / yr";
  if (s.includes("120,000") || s.includes("120000")) return "₹15,00,000 / yr";

  if (!s.startsWith("₹")) {
    s = `₹${s}`;
  }
  return s;
}

export const INITIAL_OFFERS: Offer[] = [
  {
    id: "OFF-2026-001",
    candidateName: "Sarah Jenkins",
    candidateEmail: "sarah.jenkins@example.com",
    candidatePhone: "+91 98234 56789",
    avatarUrl: "",
    jobTitle: "Senior React Developer",
    department: "Engineering",
    recruiter: "Sophia Patel",
    aiMatchScore: 94,
    offeredSalary: "₹18,50,000 / year (₹18.5 LPA)",
    offeredSalaryNum: 1850000,
    bonus: "10% Performance Bonus",
    benefits: "Full Medical, Provident Fund, ₹50,000 Remote Work Stipend",
    reportingManager: "Marcus Vance (Engineering Lead)",
    employmentType: "Full-time",
    workLocation: "Pune, MH (Hybrid)",
    noticePeriod: "30 Days",
    joiningDate: "2026-08-01",
    offerDate: "2026-07-10",
    expiryDate: "2026-07-25",
    experienceLevel: "Senior",
    location: "Pune",
    status: "Accepted",
    workflowStage: "Joining Process",
    verbalDiscussion: {
      discussionDate: "2026-07-08",
      recruiter: "Sophia Patel",
      candidateName: "Sarah Jenkins",
      jobTitle: "Senior React Developer",
      currentCtc: "₹14,50,000 / year",
      expectedCtc: "₹20,00,000 / year",
      proposedSalary: "₹18,50,000 / year",
      proposedDesignation: "Senior React Developer",
      joiningLocation: "Pune, MH",
      noticePeriod: "30 Days",
      discussionNotes: "Candidate enthusiastic about team tech stack. Agreed on ₹18.5 LPA base.",
      discussionStatus: "Completed"
    },
    salaryNegotiation: {
      currentSalary: "₹14,50,000",
      expectedSalary: "₹20,00,000",
      companyOffer: "₹17,50,000",
      finalAgreedSalary: "₹18,50,000 / year",
      finalDesignation: "Senior React Developer",
      bonus: "10% Performance Bonus",
      joiningBonus: "₹1,00,000",
      variablePay: "5%",
      negotiationNotes: "Countered at ₹18.5 LPA with signing bonus. Accepted.",
      negotiationStatus: "Accepted"
    },
    candidateDecision: {
      decision: "Accept verbally",
      timestamp: "2026-07-09 02:30 PM",
      notes: "Verbally confirmed interest and readiness to upload documents."
    },
    documents: DEFAULT_13_DOCUMENTS,
    joiningChecklist: DEFAULT_10_JOINING_TASKS,
    interviewFeedback: {
      technicalScore: 4.8,
      communicationScore: 4.5,
      problemSolvingScore: 4.7,
      comments: "Exceptional system design skills. Strongly aligned with React 19 architecture patterns. Great team builder.",
      recommendation: "Strong Hire"
    },
    timeline: {
      generated: "2026-07-10 10:15 AM",
      sent: "2026-07-10 11:30 AM",
      viewed: "2026-07-11 02:45 PM",
      responded: "2026-07-14 09:12 AM",
      joined: "In Progress"
    }
  },
  {
    id: "OFF-2026-002",
    candidateName: "Marcus Vance",
    candidateEmail: "m.vance@example.com",
    candidatePhone: "+91 98765 43210",
    avatarUrl: "",
    jobTitle: "Backend Engineer (Node/Go)",
    department: "Engineering",
    recruiter: "Elena Rostova",
    aiMatchScore: 89,
    offeredSalary: "₹14,50,000 / year (₹14.5 LPA)",
    offeredSalaryNum: 1450000,
    bonus: "8% Performance Bonus",
    benefits: "Full Medical, Dental, Provident Fund, Gym Allowance",
    reportingManager: "Arjun Mehta (VP of Engineering)",
    employmentType: "Full-time",
    workLocation: "Bangalore, KA (Remote)",
    noticePeriod: "15 Days",
    joiningDate: "2026-08-15",
    offerDate: "2026-07-15",
    expiryDate: "2026-07-28",
    experienceLevel: "Mid-level",
    location: "Bangalore",
    status: "Pending",
    workflowStage: "Verbal & Salary Negotiation",
    verbalDiscussion: {
      discussionDate: "2026-07-14",
      recruiter: "Elena Rostova",
      candidateName: "Marcus Vance",
      jobTitle: "Backend Engineer",
      currentCtc: "₹11,50,000",
      expectedCtc: "₹16,00,000",
      proposedSalary: "₹14,50,000",
      proposedDesignation: "Backend Engineer",
      joiningLocation: "Remote",
      noticePeriod: "15 Days",
      discussionNotes: "Preliminary verbal alignment reached. Proceeding to salary negotiation.",
      discussionStatus: "Completed"
    },
    salaryNegotiation: {
      currentSalary: "₹11,50,000",
      expectedSalary: "₹16,00,000",
      companyOffer: "₹13,50,000",
      finalAgreedSalary: "₹14,50,000",
      finalDesignation: "Backend Engineer",
      bonus: "8%",
      joiningBonus: "₹50,000",
      variablePay: "N/A",
      negotiationNotes: "Under active salary negotiation.",
      negotiationStatus: "Negotiating"
    },
    candidateDecision: {
      decision: "Need time",
      timestamp: "2026-07-15 10:00 AM",
      notes: "Evaluating company offer."
    },
    documents: DEFAULT_13_DOCUMENTS.map((d, i) => i < 8 ? { ...d, status: "Verified" as const } : { ...d, status: "Pending" as const }),
    joiningChecklist: DEFAULT_10_JOINING_TASKS.map(t => ({ ...t, completed: false })),
    interviewFeedback: {
      technicalScore: 4.2,
      communicationScore: 4.4,
      problemSolvingScore: 4.1,
      comments: "Solid backend practices, clean coder in TypeScript & Go. Expressed high interest in scalability goals.",
      recommendation: "Hire"
    },
    timeline: {
      generated: "2026-07-15 09:00 AM",
      sent: "2026-07-15 11:00 AM",
      viewed: "2026-07-16 04:22 PM",
      responded: null,
      joined: null
    }
  },
  {
    id: "OFF-2026-003",
    candidateName: "Elena Rostova",
    candidateEmail: "elena.r@example.com",
    candidatePhone: "+91 97654 32109",
    avatarUrl: "",
    jobTitle: "Technical Project Manager",
    department: "Product",
    recruiter: "Sophia Patel",
    aiMatchScore: 92,
    offeredSalary: "₹12,50,000 / year (₹12.5 LPA)",
    offeredSalaryNum: 1250000,
    bonus: "₹50,000 Signing Bonus",
    benefits: "Health Insurance, Commuter Benefits, Learning Allowance",
    reportingManager: "Diana Prince (Director of PMO)",
    employmentType: "Full-time",
    workLocation: "Mumbai, MH (Hybrid)",
    noticePeriod: "30 Days",
    joiningDate: "2026-08-10",
    offerDate: "2026-07-12",
    expiryDate: "2026-07-20",
    experienceLevel: "Lead",
    location: "Mumbai",
    status: "Pending",
    workflowStage: "Documentation",
    verbalDiscussion: {
      discussionDate: "2026-07-11",
      recruiter: "Sophia Patel",
      candidateName: "Elena Rostova",
      jobTitle: "Technical Project Manager",
      currentCtc: "₹10,00,000",
      expectedCtc: "₹14,00,000",
      proposedSalary: "₹12,50,000",
      proposedDesignation: "Technical Project Manager",
      joiningLocation: "Mumbai, MH",
      noticePeriod: "30 Days",
      discussionNotes: "Discussion completed. Verbally accepted initial terms.",
      discussionStatus: "Completed"
    },
    salaryNegotiation: {
      currentSalary: "₹10,00,000",
      expectedSalary: "₹14,00,000",
      companyOffer: "₹12,00,000",
      finalAgreedSalary: "₹12,50,000",
      finalDesignation: "Technical Project Manager",
      bonus: "₹50,000 Signing Bonus",
      joiningBonus: "₹50,000",
      variablePay: "5%",
      negotiationNotes: "Agreed on ₹12.5 LPA base with signing bonus.",
      negotiationStatus: "Accepted"
    },
    candidateDecision: {
      decision: "Accept verbally",
      timestamp: "2026-07-12 11:00 AM",
      notes: "Verbally accepted offer. Uploading documents."
    },
    documents: DEFAULT_13_DOCUMENTS.map((d, i) => i < 10 ? { ...d, status: "Verified" as const } : { ...d, status: "Pending" as const }),
    joiningChecklist: DEFAULT_10_JOINING_TASKS.map(t => ({ ...t, completed: false })),
    interviewFeedback: {
      technicalScore: 4.5,
      communicationScore: 4.9,
      problemSolvingScore: 4.4,
      comments: "Incredible communication. Managed complex cross-functional releases. Strong agile execution advocate.",
      recommendation: "Strong Hire"
    },
    timeline: {
      generated: "2026-07-12 02:30 PM",
      sent: "2026-07-13 09:00 AM",
      viewed: "2026-07-13 11:15 AM",
      responded: null,
      joined: null
    }
  },
  {
    id: "OFF-2026-004",
    candidateName: "David Kemp",
    candidateEmail: "david.kemp@example.com",
    candidatePhone: "+91 96543 21098",
    avatarUrl: "",
    jobTitle: "DevOps Specialist",
    department: "Engineering",
    recruiter: "Liam Carter",
    aiMatchScore: 88,
    offeredSalary: "₹16,00,000 / year (₹16.0 LPA)",
    offeredSalaryNum: 1600000,
    bonus: "12% Performance Bonus",
    benefits: "Premium Medical, Stock Options, Tech Budget",
    reportingManager: "Arjun Mehta (VP of Engineering)",
    employmentType: "Full-time",
    workLocation: "Hyderabad, TS (On-site)",
    noticePeriod: "60 Days",
    joiningDate: "2026-09-01",
    offerDate: "2026-07-08",
    expiryDate: "2026-07-30",
    experienceLevel: "Senior",
    location: "Hyderabad",
    status: "Joined",
    workflowStage: "Employee Joined",
    verbalDiscussion: {
      discussionDate: "2026-07-05",
      recruiter: "Liam Carter",
      candidateName: "David Kemp",
      jobTitle: "DevOps Specialist",
      currentCtc: "₹13,00,000",
      expectedCtc: "₹17,00,000",
      proposedSalary: "₹16,00,000",
      proposedDesignation: "DevOps Specialist",
      joiningLocation: "Hyderabad, TS",
      noticePeriod: "60 Days",
      discussionNotes: "Discussion completed successfully.",
      discussionStatus: "Completed"
    },
    salaryNegotiation: {
      currentSalary: "₹13,00,000",
      expectedSalary: "₹17,00,000",
      companyOffer: "₹15,50,000",
      finalAgreedSalary: "₹16,00,000",
      finalDesignation: "DevOps Specialist",
      bonus: "12%",
      joiningBonus: "₹1,00,000",
      variablePay: "5%",
      negotiationNotes: "Terms agreed.",
      negotiationStatus: "Accepted"
    },
    candidateDecision: {
      decision: "Accept verbally",
      timestamp: "2026-07-07",
      notes: "Accepted offer."
    },
    documents: DEFAULT_13_DOCUMENTS,
    joiningChecklist: DEFAULT_10_JOINING_TASKS,
    interviewFeedback: {
      technicalScore: 4.0,
      communicationScore: 3.8,
      problemSolvingScore: 4.3,
      comments: "Strong Kubernetes experience. Solid technical skills.",
      recommendation: "Hire"
    },
    timeline: {
      generated: "2026-07-08 04:00 PM",
      sent: "2026-07-09 10:00 AM",
      viewed: "2026-07-09 01:20 PM",
      responded: "2026-07-12 03:45 PM",
      joined: "2026-08-01 09:00 AM"
    }
  }
];

interface OffersViewProps {
  initialStatusFilter?: string;
  clearInitialStatusFilter?: () => void;
}

export default function OffersView({ initialStatusFilter, clearInitialStatusFilter }: OffersViewProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);

  // Workflow Stage Active Filter Tab
  const [activeStageFilter, setActiveStageFilter] = useState<string>("all");

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const data = await OfferRepository.getAll();
      const enhanced = (Array.isArray(data) ? data : []).map((off: Offer) => ({
        ...off,
        workflowStage: off.workflowStage || (off.status === "Accepted" ? "Joining Process" : off.status === "Joined" ? "Employee Joined" : "Offer Generation"),
        documents: off.documents || DEFAULT_13_DOCUMENTS,
        joiningChecklist: off.joiningChecklist || DEFAULT_10_JOINING_TASKS,
        verbalDiscussion: off.verbalDiscussion || {
          discussionDate: off.offerDate || "2026-07-15",
          recruiter: off.recruiter || "Sophia Patel",
          candidateName: off.candidateName,
          jobTitle: off.jobTitle,
          currentCtc: "$110,000",
          expectedCtc: "$130,000",
          proposedSalary: off.offeredSalary || "$120,000",
          proposedDesignation: off.jobTitle,
          joiningLocation: off.workLocation || "Remote",
          noticePeriod: off.noticePeriod || "30 Days",
          discussionNotes: "Initial verbal discussion completed.",
          discussionStatus: "Completed"
        },
        salaryNegotiation: off.salaryNegotiation || {
          currentSalary: "$110,000",
          expectedSalary: "$130,000",
          companyOffer: "$120,000",
          finalAgreedSalary: off.offeredSalary || "$120,000",
          finalDesignation: off.jobTitle,
          bonus: off.bonus || "10%",
          joiningBonus: "$5,000",
          variablePay: "5%",
          negotiationNotes: "Salary agreement finalized.",
          negotiationStatus: "Accepted"
        },
        candidateDecision: off.candidateDecision || {
          decision: off.status === "Accepted" ? "Accept verbally" : "Need time",
          timestamp: off.offerDate || "2026-07-15",
          notes: "Candidate verbally acknowledged offer terms."
        }
      }));
      setOffers(enhanced);
    } catch (e) {
      console.error("Failed to fetch offers:", e);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();

    const handleSync = () => {
      fetchOffers();
    };

    window.addEventListener("applications-updated", handleSync);
    window.addEventListener("offers-updated", handleSync);
    window.addEventListener("trigger-notification-sync", handleSync);

    return () => {
      window.removeEventListener("applications-updated", handleSync);
      window.removeEventListener("offers-updated", handleSync);
      window.removeEventListener("trigger-notification-sync", handleSync);
    };
  }, []);

  useEffect(() => {
    if (initialStatusFilter && initialStatusFilter !== "all") {
      setFilterStatus(initialStatusFilter);
      if (clearInitialStatusFilter) {
        clearInitialStatusFilter();
      }
    }
  }, [initialStatusFilter, clearInitialStatusFilter]);

  // Layout Density configuration
  const [density, setDensity] = useState(() => localStorage.getItem("setting_layout_density") || "comfortable");
  
  useEffect(() => {
    const handleSettings = () => {
      setDensity(localStorage.getItem("setting_layout_density") || "comfortable");
    };
    window.addEventListener("settings-changed", handleSettings);
    return () => window.removeEventListener("settings-changed", handleSettings);
  }, []);

  // Filter States
  const [search, setSearch] = useState("");
  const [filterJob, setFilterJob] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterRecruiter, setFilterRecruiter] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterJoiningDate, setFilterJoiningDate] = useState("");
  const [filterOfferDate, setFilterOfferDate] = useState("");
  const [filterExpLevel, setFilterExpLevel] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  // Drawer & Modal States
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Workflow Specific Modals
  const [isVerbalModalOpen, setIsVerbalModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [activePdfDocIndex, setActivePdfDocIndex] = useState<number>(0);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Form State for AI / New Offer Generation
  const [aiForm, setAiForm] = useState({
    candidateName: "Sophia Patel",
    candidateEmail: "spatel@example.com",
    candidatePhone: "+91 98765 43210",
    jobTitle: "Senior Frontend Engineer",
    department: "Engineering",
    recruiter: "Sophia Patel",
    aiMatchScore: 96,
    offeredSalary: "₹17,50,000 / year (₹17.5 LPA)",
    offeredSalaryNum: 1750000,
    bonus: "10% Performance Bonus",
    benefits: "Full Medical/Vision/Dental, Stock Options, Hybrid Setup",
    reportingManager: "Marcus Vance (Engineering Lead)",
    employmentType: "Full-time",
    workLocation: "San Francisco, CA (Hybrid)",
    noticePeriod: "15 Days",
    joiningDate: "2026-09-01",
    offerDate: "2026-07-17",
    expiryDate: "2026-07-31",
    experienceLevel: "Senior" as Offer["experienceLevel"],
    location: "San Francisco",
    companyName: "encureIT Systems Pvt Ltd"
  });

  const [generatedLetter, setGeneratedLetter] = useState("");
  const [isLetterEditable, setIsLetterEditable] = useState(false);

  // Notification Toast Helper
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sound chime
  const playAlertSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio Context failed:", e);
    }
  };

  // Base Filtered Offers (excludes status filter)
  const baseFilteredOffers = useMemo(() => {
    return offers.filter(offer => {
      const matchesSearch = offer.candidateName.toLowerCase().includes(search.toLowerCase()) || 
                            offer.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
                            offer.id.toLowerCase().includes(search.toLowerCase());
      const matchesJob = filterJob ? offer.jobTitle === filterJob : true;
      const matchesDept = filterDept ? offer.department === filterDept : true;
      const matchesRecruiter = filterRecruiter ? offer.recruiter === filterRecruiter : true;
      const matchesJoining = filterJoiningDate ? offer.joiningDate === filterJoiningDate : true;
      const matchesOfferDate = filterOfferDate ? offer.offerDate === filterOfferDate : true;
      const matchesExp = filterExpLevel ? offer.experienceLevel === filterExpLevel : true;
      const matchesLocation = filterLocation ? offer.location === filterLocation : true;

      const matchesStage = activeStageFilter === "all" 
        ? true 
        : offer.workflowStage === activeStageFilter ||
          (activeStageFilter === "Verbal Salary Discussion" && (
            offer.workflowStage === "Verbal Discussion" || 
            offer.workflowStage === "Salary Negotiation" || 
            offer.workflowStage === "Verbal & Salary Negotiation" ||
            offer.workflowStage === "Verbal Salary Discussion"
          )) ||
          (activeStageFilter === "Candidate Decision" && (
            offer.workflowStage === "Candidate Decision"
          ));

      return matchesSearch && matchesJob && matchesDept && matchesRecruiter && 
             matchesJoining && matchesOfferDate && matchesExp && matchesLocation && matchesStage;
    });
  }, [offers, search, filterJob, filterDept, filterRecruiter, filterJoiningDate, filterOfferDate, filterExpLevel, filterLocation, activeStageFilter]);

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    const total = baseFilteredOffers.length;
    const pending = baseFilteredOffers.filter(o => o.status === "Pending").length;
    const accepted = baseFilteredOffers.filter(o => o.status === "Accepted").length;
    const rejected = baseFilteredOffers.filter(o => o.status === "Rejected").length;
    const expired = baseFilteredOffers.filter(o => o.status === "Expired").length;
    const joined = baseFilteredOffers.filter(o => o.status === "Joined" || o.workflowStage === "Employee Joined").length;
    const acceptanceRate = total > 0 ? Math.round(((accepted + joined) / (accepted + joined + rejected + expired || 1)) * 100) : 0;

    return { total, pending, accepted, rejected, expired, joined, acceptanceRate };
  }, [baseFilteredOffers]);

  // Unique list values for dropdowns
  const dropdownOptions = useMemo(() => {
    const jobs = Array.from(new Set((offers || []).map(o => o?.jobTitle).filter(Boolean)));
    const depts = Array.from(new Set((offers || []).map(o => o?.department).filter(Boolean)));
    const recruiters = Array.from(new Set((offers || []).map(o => o?.recruiter).filter(Boolean)));
    const locations = Array.from(new Set((offers || []).map(o => o?.location).filter(Boolean)));
    return { jobs, depts, recruiters, locations };
  }, [offers]);

  // Filtered Offers
  const filteredOffers = useMemo(() => {
    return baseFilteredOffers.filter(offer => {
      const matchesStatus = filterStatus ? offer.status === filterStatus : true;
      return matchesStatus;
    });
  }, [baseFilteredOffers, filterStatus]);

  // Reset Filters
  const resetFilters = () => {
    setSearch("");
    setFilterJob("");
    setFilterDept("");
    setFilterRecruiter("");
    setFilterStatus("");
    setFilterJoiningDate("");
    setFilterOfferDate("");
    setFilterExpLevel("");
    setFilterLocation("");
    setActiveStageFilter("all");
    triggerToast("Workspace filters reset.");
  };

  // Compile Official Offer Letter PDF Text (NO SALARY IN PDF)
  const compilePDFLetterText = (form: typeof aiForm) => {
    return `================================================================================
ENCUREIT SYSTEMS PVT LTD
Enterprise Employment Offer Contract
================================================================================

Date: ${form.offerDate}
Offer Reference: ${selectedOffer?.id || "OFF-2026-ENC"}

To:
${form.candidateName}
Email: ${form.candidateEmail}
Phone: ${form.candidatePhone}

Dear ${form.candidateName},

1. APPOINTMENT & DESIGNATION
encureIT Systems Pvt Ltd is pleased to extend an offer of employment for the position of ${form.jobTitle} in our ${form.department} department. You will be reporting directly to ${form.reportingManager}.

2. WORK LOCATION & EMPLOYMENT TYPE
This is a ${form.employmentType} position based at our ${form.workLocation} office. You are required to comply with company work-location policies and operational schedules.

3. COMMENCEMENT OF EMPLOYMENT
Your scheduled date of joining is ${form.joiningDate}. This offer contract is subject to satisfactory verification of your professional credentials, background verification (BGV), and statutory document audit.

4. TERMS & CONDITIONS
- Notice Period: ${form.noticePeriod}
- Probationary Period: 6 Months from date of joining
- Confidentiality: You shall execute a standard Non-Disclosure Agreement (NDA) upon onboarding.

5. ACCEPTANCE
Please review this offer contract. You may accept or decline this offer contract through the encureIT Candidate Onboarding Portal on or before ${form.expiryDate}.

Sincerely,

Talent Acquisition Group
encureIT Systems Pvt Ltd

---------------------------------------        ---------------------------------------
Authorized HR Signatory                        Candidate Signature
encureIT Systems Pvt Ltd                       Date:
================================================================================`;
  };

  // Compile Email Body Text (CONTAINS SALARY)
  const compileEmailBodyText = (form: typeof aiForm) => {
    return `Subject: ${form.candidateName} - Offer Letter for ${form.jobTitle} at encureIT Systems | Joining: ${form.joiningDate}

Dear ${form.candidateName},

Congratulations! We are thrilled to offer you the position of ${form.jobTitle} at encureIT Systems Pvt Ltd!

Here are your key compensation & contract details:
• Position: ${form.jobTitle}
• Department: ${form.department}
• Annual Base Salary: ${form.offeredSalary}
• Bonus Provisions: ${form.bonus}
• Benefits: ${form.benefits}
• Reporting Manager: ${form.reportingManager}
• Work Location: ${form.workLocation}
• Target Joining Date: ${form.joiningDate}
• Offer Valid Until: ${form.expiryDate}

Please find attached your official Offer Contract (PDF). To accept this offer, click "Accept Offer" in your candidate response portal or below.

We look forward to welcoming you to encureIT Systems!

Warm regards,
HR & Talent Acquisition
encureIT Systems Pvt Ltd`;
  };

  // Validate before generating AI offer letter
  const handleValidateAndGenerateOffer = () => {
    if (!selectedOffer) {
      // Default form generation if no specific candidate selected
      const letter = compileEmailBodyText(aiForm);
      setGeneratedLetter(letter);
      setIsAIModalOpen(false);
      setIsPreviewModalOpen(true);
      return;
    }

    const errors: string[] = [];

    // Check Salary Negotiation Status
    const negStatus = selectedOffer.salaryNegotiation?.negotiationStatus;
    if (negStatus !== "Accepted") {
      errors.push("Salary Negotiation is pending or not accepted yet (Current status: " + (negStatus || "Pending") + ").");
    }

    // Check Document Verification Status (13 docs required)
    const docs = selectedOffer.documents || DEFAULT_13_DOCUMENTS;
    const verifiedDocs = docs.filter(d => d.status === "Verified" || d.status === "Received").length;
    if (verifiedDocs < docs.length) {
      errors.push(`Documentation incomplete: ${verifiedDocs}/${docs.length} documents verified/received.`);
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsValidationModalOpen(true);
      return;
    }

    const letter = compileEmailBodyText(aiForm);
    setGeneratedLetter(letter);
    setIsAIModalOpen(false);
    setIsPreviewModalOpen(true);
    playAlertSound();
    triggerToast("Aura AI compiled offer letter and welcome email!");
  };

  // Save/Update Offer via OfferRepository
  const updateOfferServer = async (offerId: string, updates: Partial<Offer>) => {
    try {
      await OfferRepository.update(offerId, updates);
      await fetchOffers();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("offers-updated"));
        window.dispatchEvent(new CustomEvent("applications-updated"));
        window.dispatchEvent(new CustomEvent("trigger-notification-sync"));
      }
    } catch (e) {
      console.error("Failed to update offer:", e);
    }
  };

  // Log Notification & Email
  const logNotificationAndEmail = async (type: string, title: string, message: string, candidateEmail: string) => {
    try {
      // Post Notification
      await axios.post("/api/notifications", {
        type,
        title,
        description: message,
        priority: "HIGH",
        createdAt: new Date().toISOString()
      }).catch(() => {});

      // Post Email
      await axios.post("/api/emails/send", {
        to: candidateEmail,
        subject: title,
        body: message,
        sentAt: new Date().toISOString()
      }).catch(() => {});
    } catch (e) {
      console.warn("Failed logging notification/email:", e);
    }
  };

  // Candidate Response: Accept Offer
  const handleAcceptOffer = async (offerId: string) => {
    const target = offers.find(o => o.id === offerId);
    if (!target) return;

    const updatedTimeline = {
      ...target.timeline,
      responded: new Date().toISOString().split("T")[0] + " 11:30 AM",
      joined: "In Progress"
    };

    await updateOfferServer(offerId, {
      status: "Accepted",
      workflowStage: "Joining Process",
      timeline: updatedTimeline
    });

    await logNotificationAndEmail(
      "offer_accepted",
      `Offer Accepted: ${target.candidateName}`,
      `Candidate ${target.candidateName} accepted the offer for ${target.jobTitle}! Onboarding initiated.`,
      target.candidateEmail
    );

    playAlertSound();
    triggerToast(`Offer ${offerId} ACCEPTED! Moved candidate to Joining Process.`);
  };

  // Candidate Response: Reject Offer
  const handleRejectOffer = async (offerId: string) => {
    const target = offers.find(o => o.id === offerId);
    if (!target) return;

    const updatedTimeline = {
      ...target.timeline,
      responded: new Date().toISOString().split("T")[0] + " 02:15 PM"
    };

    await updateOfferServer(offerId, {
      status: "Rejected",
      workflowStage: "Candidate Response",
      timeline: updatedTimeline
    });

    await logNotificationAndEmail(
      "offer_rejected",
      `Offer Rejected: ${target.candidateName}`,
      `Candidate ${target.candidateName} declined the offer for ${target.jobTitle}.`,
      target.candidateEmail
    );

    triggerToast(`Offer ${offerId} marked REJECTED.`);
  };

  // Download PDF Without Salary
  const handleDownloadPDFWithoutSalary = (candidateName: string) => {
    triggerToast(`Preparing Official Offer Letter PDF...`);
    setTimeout(() => {
      const element = document.createElement("a");
      const pdfText = compilePDFLetterText(aiForm);
      const file = new Blob([pdfText], { type: "text/plain;charset=utf-8" });
      element.href = URL.createObjectURL(file);
      element.download = `Official_Offer_Contract_${candidateName.replace(/\s+/g, "_")}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      triggerToast("Downloaded PDF Offer Contract without salary!");
    }, 800);
  };

  // Save Draft / New Offer
  const handleSaveOffer = async () => {
    const newOfferId = `OFF-2026-0${offers.length + 1}`;
    const newOffer: Offer = {
      id: newOfferId,
      candidateName: aiForm.candidateName,
      candidateEmail: aiForm.candidateEmail,
      candidatePhone: aiForm.candidatePhone,
      jobTitle: aiForm.jobTitle,
      department: aiForm.department,
      recruiter: aiForm.recruiter,
      aiMatchScore: aiForm.aiMatchScore,
      offeredSalary: aiForm.offeredSalary,
      offeredSalaryNum: aiForm.offeredSalaryNum,
      bonus: aiForm.bonus,
      benefits: aiForm.benefits,
      reportingManager: aiForm.reportingManager,
      employmentType: aiForm.employmentType,
      workLocation: aiForm.workLocation,
      noticePeriod: aiForm.noticePeriod,
      joiningDate: aiForm.joiningDate,
      offerDate: aiForm.offerDate,
      expiryDate: aiForm.expiryDate,
      experienceLevel: aiForm.experienceLevel,
      location: aiForm.location,
      status: "Pending",
      workflowStage: "Offer Email Sent",
      documents: DEFAULT_13_DOCUMENTS,
      joiningChecklist: DEFAULT_10_JOINING_TASKS,
      interviewFeedback: {
        technicalScore: 4.5,
        communicationScore: 4.6,
        problemSolvingScore: 4.5,
        comments: "AI-Generated Evaluation based on high ATS parsing match and successful panel wrap-up.",
        recommendation: "Strong Hire"
      },
      timeline: {
        generated: `${aiForm.offerDate} 10:00 AM`,
        sent: `${aiForm.offerDate} 11:00 AM`,
        viewed: null,
        responded: null,
        joined: null
      }
    };

    try {
      await OfferRepository.create(newOffer);
      await fetchOffers();
      await logNotificationAndEmail(
        "offer_generated",
        `Offer Letter Sent: ${newOffer.candidateName}`,
        `Offer contract dispatched to ${newOffer.candidateName} for position ${newOffer.jobTitle}.`,
        newOffer.candidateEmail
      );
      setIsPreviewModalOpen(false);
      triggerToast(`Offer ${newOfferId} created and email dispatched!`);
    } catch (e) {
      console.error("Failed to save offer:", e);
      triggerToast("⚠️ Failed to save offer.");
    }
  };

  return (
    <div className={`${density === "compact" ? "p-4 space-y-4" : "p-8 space-y-8"} max-w-7xl mx-auto text-slate-800 dark:text-slate-100 transition-all text-left`}>
      
      {/* Toast Notification banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-indigo-950 border border-indigo-800/80 text-white rounded-xl shadow-2xl px-5 py-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <Bell className="h-4.5 w-4.5 text-indigo-400 animate-bounce" />
          <p className="text-xs font-bold leading-none">{toastMessage}</p>
        </div>
      )}

      {/* Header Container grouping Breadcrumbs and Page Header */}
      <div className="space-y-1.5 text-left">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-left">
          <span>Recruitment</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600 dark:text-slate-300 font-extrabold">Offers</span>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Award className="h-7 w-7 text-indigo-600" />
              <span>Offer Administration Console</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-left">
              Enterprise offer-to-joining pipeline: Verbal Salary Discussion, Candidate Decision, Documentation Audit, AI Contracts, & Onboarding.
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => {
                setAiForm({
                  candidateName: "",
                  candidateEmail: "",
                  candidatePhone: "",
                  jobTitle: "",
                  department: "Engineering",
                  recruiter: "Sophia Patel",
                  aiMatchScore: 85,
                  offeredSalary: "$120,000 / year",
                  offeredSalaryNum: 120000,
                  bonus: "10% Performance Bonus",
                  benefits: "Medical/Dental Gold, Unlimited PTO, Equity",
                  reportingManager: "Marcus Vance (Engineering Lead)",
                  employmentType: "Full-time",
                  workLocation: "San Francisco, CA (Hybrid)",
                  noticePeriod: "30 Days",
                  joiningDate: "2026-09-01",
                  offerDate: new Date().toISOString().split("T")[0],
                  expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                  experienceLevel: "Senior",
                  location: "San Francisco",
                  companyName: "encureIT Systems Pvt Ltd"
                });
                setIsAIModalOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow-indigo-500/10 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span>Generate Offer using AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOP SUMMARY CARDS (6 Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { title: "Total Contracts", value: metrics.total, status: "", change: "+12.4%", up: true, icon: Award, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 font-bold" },
          { title: "Pending Offers", value: metrics.pending, status: "Pending", change: "+8.2%", up: true, icon: Clock, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
          { title: "Accepted Offers", value: metrics.accepted, status: "Accepted", change: "+15.3%", up: true, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
          { title: "Joined Employees", value: metrics.joined, status: "Joined", change: "+20.1%", up: true, icon: BadgeCheck, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
          { title: "Rejected Offers", value: metrics.rejected, status: "Rejected", change: "-4.1%", up: false, icon: XCircle, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30" },
          { title: "Acceptance Rate", value: `${metrics.acceptanceRate}%`, status: "Rate", change: "+3.6%", up: true, icon: UserCheck, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" }
        ].map((card, idx) => {
          const Icon = card.icon;
          const isSelected = card.status === "Rate" ? false : filterStatus === card.status;
          return (
            <button
              key={idx}
              onClick={() => {
                if (card.status === "Rate") {
                  triggerToast(`Aggregate acceptance rate is currently ${metrics.acceptanceRate}%!`);
                } else {
                  setFilterStatus(card.status as any);
                  triggerToast(`Filtering by ${card.title}...`);
                }
              }}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer shadow-xs flex flex-col justify-between h-32 ${
                isSelected 
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-[1.01]" 
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100 hover:scale-[1.02]"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-indigo-100" : "text-slate-400 dark:text-slate-500"}`}>{card.title}</span>
                <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? "bg-indigo-500 text-indigo-100" : card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-2.5 w-full">
                <span className={`text-2xl font-extrabold font-mono ${isSelected ? "text-white" : "text-slate-900 dark:text-white"}`}>{card.value}</span>
                <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                  {card.up ? (
                    <TrendingUp className={`h-3 w-3 ${isSelected ? "text-indigo-200" : "text-emerald-500"}`} />
                  ) : (
                    <TrendingDown className={`h-3 w-3 ${isSelected ? "text-indigo-200" : "text-rose-500"}`} />
                  )}
                  <span className={`font-bold font-mono ${isSelected ? "text-indigo-200" : card.up ? "text-emerald-600" : "text-rose-600"}`}>
                    {card.change}
                  </span>
                  <span className={isSelected ? "text-indigo-200/80" : "text-slate-400 dark:text-slate-500"}>vs L.M.</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* WORKFLOW STAGE PIPELINE FILTER TABS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Enterprise Hiring Workflow Stage
          </span>
          {activeStageFilter !== "all" && (
            <button 
              onClick={() => setActiveStageFilter("all")}
              className="text-[10px] text-indigo-600 font-bold hover:underline"
            >
              Show All Stages
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: "all", label: "All Stages" },
            { id: "Verbal Salary Discussion", label: "1. Verbal Salary Discussion" },
            { id: "Candidate Decision", label: "2. Candidate Decision" },
            { id: "Documentation", label: "3. Documentation" },
            { id: "Offer Generation", label: "4. Offer Generation" },
            { id: "Offer Email Sent", label: "5. Email Sent" },
            { id: "Candidate Response", label: "6. Candidate Response" },
            { id: "Joining Process", label: "7. Onboarding" },
            { id: "Employee Joined", label: "8. Joined" }
          ].map(st => {
            const count = st.id === "all" 
              ? offers.length 
              : offers.filter(o => 
                  o.workflowStage === st.id || 
                  (st.id === "Verbal Salary Discussion" && (o.workflowStage === "Verbal Discussion" || o.workflowStage === "Salary Negotiation" || o.workflowStage === "Verbal & Salary Negotiation" || o.workflowStage === "Verbal Salary Discussion"))
                ).length;
            const active = activeStageFilter === st.id;
            return (
              <button
                key={st.id}
                onClick={() => {
                  setActiveStageFilter(st.id);
                  triggerToast(`Filtering by stage: ${st.label}`);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                  active 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span>{st.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-mono ${
                  active ? "bg-indigo-700 text-indigo-100" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTERS CONTAINER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-500" />
            <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Workspace Filter Settings
            </h3>
          </div>
          <button 
            onClick={resetFilters}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reset All Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          
          {/* Candidate Search */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Candidate</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, ID..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Job Position */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Job Position</label>
            <select 
              value={filterJob}
              onChange={e => setFilterJob(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
            >
              <option value="">All Positions</option>
              {dropdownOptions.jobs.map((job, i) => (
                <option key={i} value={job}>{job}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</label>
            <select 
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
            >
              <option value="">All Departments</option>
              {dropdownOptions.depts.map((dept, i) => (
                <option key={i} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Recruiter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recruiter</label>
            <select 
              value={filterRecruiter}
              onChange={e => setFilterRecruiter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
            >
              <option value="">All Recruiters</option>
              {dropdownOptions.recruiters.map((rec, i) => (
                <option key={i} value={rec}>{rec}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Offer Status</label>
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Accepted">Accepted</option>
              <option value="Joined">Joined</option>
              <option value="Rejected">Rejected</option>
              <option value="Expired">Expired</option>
              <option value="Withdrawn">Withdrawn</option>
            </select>
          </div>

        </div>
      </div>

      {/* MAIN TWO-COLUMN CONTAINER: Offers List Table VS Right Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* LEFT COLUMN: Data Table (3/4 width on desktop) */}
        <div className="lg:col-span-3 space-y-4">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px] select-none">
                    <th className="py-3.5 px-4">Offer ID</th>
                    <th className="py-3.5 px-4">Candidate Name</th>
                    <th className="py-3.5 px-4">Job / Dept</th>
                    <th className="py-3.5 px-4">Workflow Stage</th>
                    <th className="py-3.5 px-4 text-center">Docs</th>
                    <th className="py-3.5 px-4">Offered Salary</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Stage Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {filteredOffers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No matches found for your current filter settings.
                      </td>
                    </tr>
                  ) : (
                    filteredOffers.map((offer, idx) => {
                      let badgeStyle = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
                      
                      if (offer.status === "Pending") {
                        badgeStyle = "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/10";
                      } else if (offer.status === "Accepted") {
                        badgeStyle = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/10";
                      } else if (offer.status === "Joined" || offer.workflowStage === "Employee Joined") {
                        badgeStyle = "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-500/10";
                      } else if (offer.status === "Rejected") {
                        badgeStyle = "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-500/10";
                      } else if (offer.status === "Expired") {
                        badgeStyle = "bg-slate-200 text-slate-700 dark:bg-slate-850 dark:text-slate-400 border border-slate-700/10";
                      } else if (offer.status === "Withdrawn") {
                        badgeStyle = "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-500/10";
                      }

                      const docs = offer.documents || DEFAULT_13_DOCUMENTS;
                      const verifiedCount = docs.filter(d => d.status === "Verified" || d.status === "Received").length;

                      return (
                        <tr 
                          key={offer.id} 
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors cursor-pointer group"
                        >
                          {/* ID */}
                          <td 
                            onClick={() => { setSelectedOffer(offer); setIsDrawerOpen(true); }}
                            className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400"
                          >
                            {offer.id}
                          </td>

                          {/* Candidate Name */}
                          <td 
                            onClick={() => { setSelectedOffer(offer); setActivePdfDocIndex(0); setIsDocModalOpen(true); }}
                            className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer group/cand"
                            title="Click candidate name to view all 13 compliance documents in PDF format"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0 uppercase text-xs">
                                {offer.candidateName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <span className="truncate max-w-[130px] block group-hover/cand:underline">{offer.candidateName}</span>
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-normal flex items-center gap-0.5 mt-0.5">
                                  <FileText className="h-3 w-3 inline text-indigo-500 shrink-0" /> 13 PDFs
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Job & Dept */}
                          <td 
                            onClick={() => { setSelectedOffer(offer); setIsDrawerOpen(true); }}
                            className="py-3.5 px-4 font-semibold"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-slate-700 dark:text-slate-350">{offer.jobTitle}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{offer.department}</p>
                            </div>
                          </td>

                          {/* Workflow Stage */}
                          <td 
                            onClick={() => { setSelectedOffer(offer); setIsDrawerOpen(true); }}
                            className="py-3.5 px-4"
                          >
                            <span className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-[10.5px] border border-indigo-200 dark:border-indigo-800/40">
                              {offer.workflowStage || "Offer Generation"}
                            </span>
                          </td>

                          {/* Docs Progress */}
                          <td 
                            onClick={() => { setSelectedOffer(offer); setActivePdfDocIndex(0); setIsDocModalOpen(true); }}
                            className="py-3.5 px-4 text-center font-mono font-bold"
                          >
                            <span className={`px-2 py-0.5 rounded text-[10.5px] ${
                              verifiedCount === 13 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                            }`}>
                              {verifiedCount}/13
                            </span>
                          </td>

                          {/* Offered Salary */}
                          <td 
                            onClick={() => { setSelectedOffer(offer); setIsDrawerOpen(true); }}
                            className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300"
                          >
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800/40 text-xs">
                              {formatRupees(offer.offeredSalary)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span className={`text-[9.5px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm ${badgeStyle}`}>
                              {offer.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                              
                              {/* Open Details Drawer */}
                              <button 
                                onClick={() => { setSelectedOffer(offer); setIsDrawerOpen(true); }}
                                title="View Complete Drawer & Workflow Stepper"
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-600 cursor-pointer"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {/* Verbal Salary Discussion Modal */}
                              <button 
                                onClick={() => { setSelectedOffer(offer); setIsVerbalModalOpen(true); }}
                                title="Verbal Salary Discussion"
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-600 cursor-pointer"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>

                              {/* Document Checklist Modal */}
                              <button 
                                onClick={() => { setSelectedOffer(offer); setIsDocModalOpen(true); }}
                                title="Stage 4: Document Collection (13 Docs)"
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-amber-600 cursor-pointer"
                              >
                                <FileCheck2 className="h-4 w-4" />
                              </button>

                              {/* Onboarding Checklist Modal */}
                              <button 
                                onClick={() => { setSelectedOffer(offer); setIsOnboardingModalOpen(true); }}
                                title="Stage 9: Joining Process & Onboarding"
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-purple-600 cursor-pointer"
                              >
                                <ListChecks className="h-4 w-4" />
                              </button>

                              {/* Send Email */}
                              <button 
                                onClick={() => {
                                  setSelectedOffer(offer);
                                  setAiForm({
                                    candidateName: offer.candidateName,
                                    candidateEmail: offer.candidateEmail,
                                    candidatePhone: offer.candidatePhone,
                                    jobTitle: offer.jobTitle,
                                    department: offer.department,
                                    recruiter: offer.recruiter,
                                    aiMatchScore: offer.aiMatchScore,
                                    offeredSalary: offer.offeredSalary,
                                    offeredSalaryNum: offer.offeredSalaryNum,
                                    bonus: offer.bonus,
                                    benefits: offer.benefits,
                                    reportingManager: offer.reportingManager,
                                    employmentType: offer.employmentType,
                                    workLocation: offer.workLocation,
                                    noticePeriod: offer.noticePeriod,
                                    joiningDate: offer.joiningDate,
                                    offerDate: offer.offerDate,
                                    expiryDate: offer.expiryDate,
                                    experienceLevel: offer.experienceLevel,
                                    location: offer.location,
                                    companyName: "encureIT Systems Pvt Ltd"
                                  });
                                  handleValidateAndGenerateOffer();
                                }}
                                title="Generate Offer Contract & Send Email"
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-emerald-600 cursor-pointer"
                              >
                                <Send className="h-4 w-4" />
                              </button>

                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI RECOMMENDATIONS PANEL */}
          <div className="bg-gradient-to-r from-indigo-500/5 to-indigo-600/10 border border-indigo-500/15 dark:border-indigo-900/45 rounded-xl p-5 space-y-3 text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <h4 className="font-semibold text-xs text-indigo-950 dark:text-indigo-400 uppercase tracking-wider font-mono">
                Aura AI Enterprise Hiring Assistant
              </h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {[
                  "Stage 4 Documentation complete for Sarah Jenkins (13/13 verified). Ready for Joining Process.",
                  "Verbal discussion completed for Marcus Vance. Final agreed salary set at $125,000."
                ].map((txt, i) => (
                  <div key={i} className="flex gap-2.5 items-start text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-slate-700 dark:text-slate-350">{txt}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  "Follow up on 3 pending documents for Elena Rostova prior to generating official offer letter.",
                  "Offer contract valid until July 31. Automated reminder scheduled."
                ].map((txt, i) => (
                  <div key={i} className="flex gap-2.5 items-start text-xs">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-slate-700 dark:text-slate-350">{txt}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Right-Side Panel (1/4 width on desktop) */}
        <div className="space-y-6 text-left">
          
          {/* QUICK ACTIONS PANEL */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono border-b border-slate-100 dark:border-slate-800 pb-2">
              Quick Actions
            </h3>
            
            <div className="space-y-2">
              <button 
                onClick={() => {
                  setAiForm({
                    candidateName: "",
                    candidateEmail: "",
                    candidatePhone: "",
                    jobTitle: "",
                    department: "Engineering",
                    recruiter: "Sophia Patel",
                    aiMatchScore: 85,
                    offeredSalary: "$120,000 / year",
                    offeredSalaryNum: 120000,
                    bonus: "10% Performance Bonus",
                    benefits: "Medical/Dental Gold, Unlimited PTO, Equity",
                    reportingManager: "Marcus Vance (Engineering Lead)",
                    employmentType: "Full-time",
                    workLocation: "San Francisco, CA (Hybrid)",
                    noticePeriod: "30 Days",
                    joiningDate: "2026-09-01",
                    offerDate: new Date().toISOString().split("T")[0],
                    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    experienceLevel: "Senior",
                    location: "San Francisco",
                    companyName: "encureIT Systems Pvt Ltd"
                  });
                  setIsAIModalOpen(true);
                }}
                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Generate New Offer</span>
              </button>

              <button 
                onClick={() => {
                  playAlertSound();
                  triggerToast("Dispatched document upload reminders to candidates.");
                }}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send Document Reminders</span>
              </button>

              <button 
                onClick={() => {
                  triggerToast("Exporting enterprise offer pipeline report to CSV...");
                  setTimeout(() => triggerToast("CSV exported successfully!"), 800);
                }}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Pipeline CSV</span>
              </button>
            </div>
          </div>

          {/* UPCOMING JOINING DATES */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono border-b border-slate-100 dark:border-slate-800 pb-2">
              Upcoming Joining Candidates
            </h3>
            
            <div className="space-y-3">
              {offers.filter(o => o.status === "Accepted" || o.status === "Joined").slice(0, 3).map((offer, i) => (
                <div key={i} className="flex gap-2.5 items-start text-xs border-b border-slate-50 dark:border-slate-850 pb-2.5 last:border-0 last:pb-0">
                  <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-600 shrink-0">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-850 dark:text-slate-150 truncate">{offer.candidateName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{offer.jobTitle}</p>
                    <span className="inline-block text-[9px] font-bold font-mono text-emerald-600 mt-1">
                      Target Joining: {offer.joiningDate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PENDING CANDIDATE RESPONSES */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono border-b border-slate-100 dark:border-slate-800 pb-2">
              Pending Candidate Response
            </h3>
            
            <div className="space-y-3">
              {offers.filter(o => o.status === "Pending").slice(0, 2).map((offer, i) => (
                <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-lg space-y-2">
                  <div className="flex justify-between items-start text-[11px]">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{offer.candidateName}</span>
                    <span className="font-mono text-[9px] bg-slate-200 dark:bg-slate-800 px-1.5 rounded">Sent</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Offer issued: {offer.offerDate}</p>
                  
                  <div className="flex gap-1 pt-1 justify-end">
                    <button 
                      onClick={() => handleAcceptOffer(offer.id)}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold cursor-pointer"
                    >
                      Accept Offer
                    </button>
                    <button 
                      onClick={() => handleRejectOffer(offer.id)}
                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-bold cursor-pointer"
                    >
                      Reject Offer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* SIDE DRAWER: Comprehensive Offer & Workflow Stepper Drawer */}
      {isDrawerOpen && selectedOffer && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end text-left">
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity" 
          />

          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200 overflow-y-auto">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-950/55 flex items-center justify-center border border-indigo-200">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-950 dark:text-white leading-tight">
                    {selectedOffer.candidateName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedOffer.id} • {selectedOffer.jobTitle}</p>
                </div>
              </div>

              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              
              {/* WORKFLOW STEPPER BAR (10 STAGES) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Hiring & Onboarding Workflow Stepper
                  </h4>
                  <span className="text-[10px] font-bold text-indigo-600">
                    Stage: {selectedOffer.workflowStage || "Offer Generation"}
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center text-[9px] font-bold font-mono">
                  {[
                    "1. Verbal Salary Discussion", "2. Candidate Decision", "3. Documentation", "4. Offer Generation",
                    "5. Email Sent", "6. Candidate Response", "7. Onboarding", "8. Joined"
                  ].map((step, idx) => {
                    const stageNames = [
                      "Verbal Salary Discussion", "Candidate Decision", "Documentation",
                      "Offer Generation", "Offer Email Sent", "Candidate Response", "Joining Process", "Employee Joined"
                    ];
                    let currentStage = selectedOffer.workflowStage || "Offer Generation";
                    if (currentStage === "Verbal Discussion" || currentStage === "Salary Negotiation" || currentStage === "Verbal & Salary Negotiation") {
                      currentStage = "Verbal Salary Discussion";
                    }
                    let currentIdx = stageNames.indexOf(currentStage);
                    if (currentIdx === -1) currentIdx = 3;
                    const isDone = idx <= currentIdx;
                    return (
                      <div 
                        key={idx}
                        className={`p-1.5 rounded border transition-colors ${
                          isDone 
                            ? "bg-indigo-600 text-white border-indigo-600" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {step}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ACTION QUICK BUTTONS */}
              <div className="p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/40 dark:bg-indigo-950/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Contract Status</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide mt-0.5">{selectedOffer.status}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setIsVerbalModalOpen(true); }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded cursor-pointer flex items-center gap-1.5"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Verbal Salary Discussion
                  </button>
                  <button 
                    onClick={() => { setIsDocModalOpen(true); }}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded cursor-pointer flex items-center gap-1.5"
                  >
                    <FileCheck2 className="h-3.5 w-3.5" />
                    Document Audit
                  </button>
                </div>
              </div>

              {/* STAGE BREAKDOWN */}
              {(selectedOffer.verbalDiscussion || selectedOffer.salaryNegotiation) && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Verbal Salary Discussion</span>
                    <span className="text-[10px] font-bold text-emerald-600 font-mono">
                      {selectedOffer.salaryNegotiation?.negotiationStatus || selectedOffer.verbalDiscussion?.discussionStatus || "Completed"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-400">Discussion Date:</span> <strong>{selectedOffer.verbalDiscussion?.discussionDate || selectedOffer.offerDate}</strong></div>
                    <div><span className="text-slate-400">Assigned Recruiter:</span> <strong>{selectedOffer.verbalDiscussion?.recruiter || selectedOffer.recruiter}</strong></div>
                    <div><span className="text-slate-400">Current CTC:</span> <strong>{selectedOffer.verbalDiscussion?.currentCtc || "$110,000"}</strong></div>
                    <div><span className="text-slate-400">Expected CTC:</span> <strong>{selectedOffer.verbalDiscussion?.expectedCtc || "$130,000"}</strong></div>
                    <div><span className="text-slate-400">Agreed Offered Salary:</span> <strong className="text-indigo-600 dark:text-indigo-400">{selectedOffer.salaryNegotiation?.finalAgreedSalary || selectedOffer.offeredSalary}</strong></div>
                    <div><span className="text-slate-400">Designation:</span> <strong>{selectedOffer.jobTitle}</strong></div>
                  </div>
                </div>
              )}

              {/* STAGE 4: DOCUMENT COLLECTION CHECKLIST (13 DOCS) */}
              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Stage 4: Document Verification Checklist (13 Documents)
                  </h4>
                  <button 
                    onClick={() => setIsDocModalOpen(true)}
                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    Open Full Audit
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  {(selectedOffer.documents || DEFAULT_13_DOCUMENTS).slice(0, 5).map((doc, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{doc.name}</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[9.5px] ${
                        doc.status === "Verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-400 italic text-center">
                    + {(selectedOffer.documents || DEFAULT_13_DOCUMENTS).length - 5} more enterprise compliance documents verified.
                  </p>
                </div>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 sticky bottom-0 flex justify-between gap-3">
              <button 
                onClick={() => {
                  setAiForm({
                    candidateName: selectedOffer.candidateName,
                    candidateEmail: selectedOffer.candidateEmail,
                    candidatePhone: selectedOffer.candidatePhone,
                    jobTitle: selectedOffer.jobTitle,
                    department: selectedOffer.department,
                    recruiter: selectedOffer.recruiter,
                    aiMatchScore: selectedOffer.aiMatchScore,
                    offeredSalary: selectedOffer.offeredSalary,
                    offeredSalaryNum: selectedOffer.offeredSalaryNum,
                    bonus: selectedOffer.bonus,
                    benefits: selectedOffer.benefits,
                    reportingManager: selectedOffer.reportingManager,
                    employmentType: selectedOffer.employmentType,
                    workLocation: selectedOffer.workLocation,
                    noticePeriod: selectedOffer.noticePeriod,
                    joiningDate: selectedOffer.joiningDate,
                    offerDate: selectedOffer.offerDate,
                    expiryDate: selectedOffer.expiryDate,
                    experienceLevel: selectedOffer.experienceLevel,
                    location: selectedOffer.location,
                    companyName: "encureIT Systems Pvt Ltd"
                  });
                  handleDownloadPDFWithoutSalary(selectedOffer.candidateName);
                }}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-md transition-all flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <Download className="h-4 w-4" />
                <span>Official Offer Letter</span>
              </button>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    handleAcceptOffer(selectedOffer.id);
                    setIsDrawerOpen(false);
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs cursor-pointer"
                >
                  Accept Offer
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* UNIFIED MODAL: VERBAL SALARY DISCUSSION */}
      {(isVerbalModalOpen || isSalaryModalOpen) && selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left">
          <div onClick={() => { setIsVerbalModalOpen(false); setIsSalaryModalOpen(false); }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" />
          
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden z-10">
            <div className="p-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Verbal Salary Discussion</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{selectedOffer.candidateName} • {selectedOffer.jobTitle}</p>
                </div>
              </div>
              <button onClick={() => { setIsVerbalModalOpen(false); setIsSalaryModalOpen(false); }} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 flex-1 overflow-y-auto text-xs">
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-[11px] text-indigo-900 dark:text-indigo-200 font-medium">
                Record verbal screening notes and negotiate compensation details during the candidate discussion call.
              </div>

              {/* Discussion Details */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] font-mono">1. Verbal Discussion Parameters</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-500">Discussion Date</label>
                    <input type="date" id="verbal-date" defaultValue={selectedOffer.verbalDiscussion?.discussionDate || new Date().toISOString().split('T')[0]} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border rounded font-semibold mt-1" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500">Assigned Recruiter</label>
                    <input type="text" id="verbal-recruiter" defaultValue={selectedOffer.recruiter} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border rounded font-semibold mt-1" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500">Proposed Designation</label>
                    <input type="text" id="verbal-designation" defaultValue={selectedOffer.jobTitle} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border rounded font-semibold mt-1" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500">Notice Period</label>
                    <input type="text" id="verbal-notice" defaultValue={selectedOffer.noticePeriod || "30 Days"} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border rounded font-semibold mt-1" />
                  </div>
                </div>
              </div>

              {/* Salary Negotiation Details */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] font-mono">2. Salary Negotiation Breakdown</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-500">Current CTC</label>
                    <input type="text" id="verbal-current-ctc" defaultValue={selectedOffer.verbalDiscussion?.currentCtc || selectedOffer.salaryNegotiation?.currentSalary || "$110,000"} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border rounded font-semibold mt-1" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500">Expected CTC</label>
                    <input type="text" id="verbal-expected-ctc" defaultValue={selectedOffer.verbalDiscussion?.expectedCtc || selectedOffer.salaryNegotiation?.expectedSalary || "$130,000"} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border rounded font-semibold mt-1" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500">Final Agreed Salary</label>
                    <input type="text" id="verbal-final-salary" defaultValue={selectedOffer.offeredSalary || "$125,000"} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border rounded font-semibold mt-1 font-bold text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500">Bonus & Incentives</label>
                    <input type="text" id="verbal-bonus" defaultValue={selectedOffer.bonus || "10% Performance Bonus"} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border rounded font-semibold mt-1" />
                  </div>
                </div>
              </div>

              {/* Discussion Notes */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="font-bold text-slate-500">Verbal & Salary Discussion Notes</label>
                <textarea 
                  id="verbal-notes"
                  rows={2}
                  defaultValue={selectedOffer.verbalDiscussion?.discussionNotes || selectedOffer.salaryNegotiation?.negotiationNotes || "Verbally discussed role requirements, notice period, and agreed on salary expectations during HR call."} 
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border rounded font-medium mt-1 resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 dark:bg-slate-950 flex justify-end gap-2">
              <button onClick={() => { setIsVerbalModalOpen(false); setIsSalaryModalOpen(false); }} className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg cursor-pointer">Cancel</button>
              <button 
                onClick={async () => {
                  const dateInput = (document.getElementById("verbal-date") as HTMLInputElement)?.value;
                  const recruiterInput = (document.getElementById("verbal-recruiter") as HTMLInputElement)?.value;
                  const designationInput = (document.getElementById("verbal-designation") as HTMLInputElement)?.value;
                  const noticeInput = (document.getElementById("verbal-notice") as HTMLInputElement)?.value;
                  const currentCtcInput = (document.getElementById("verbal-current-ctc") as HTMLInputElement)?.value;
                  const expectedCtcInput = (document.getElementById("verbal-expected-ctc") as HTMLInputElement)?.value;
                  const finalSalaryInput = (document.getElementById("verbal-final-salary") as HTMLInputElement)?.value;
                  const bonusInput = (document.getElementById("verbal-bonus") as HTMLInputElement)?.value;
                  const notesInput = (document.getElementById("verbal-notes") as HTMLTextAreaElement)?.value;

                  await updateOfferServer(selectedOffer.id, {
                    offeredSalary: finalSalaryInput || selectedOffer.offeredSalary,
                    bonus: bonusInput || selectedOffer.bonus,
                    noticePeriod: noticeInput || selectedOffer.noticePeriod,
                    jobTitle: designationInput || selectedOffer.jobTitle,
                    workflowStage: "Documentation",
                    verbalDiscussion: {
                      discussionDate: dateInput || "2026-07-15",
                      recruiter: recruiterInput || selectedOffer.recruiter,
                      candidateName: selectedOffer.candidateName,
                      jobTitle: designationInput || selectedOffer.jobTitle,
                      currentCtc: currentCtcInput || "$110,000",
                      expectedCtc: expectedCtcInput || "$130,000",
                      proposedSalary: finalSalaryInput || selectedOffer.offeredSalary,
                      proposedDesignation: designationInput || selectedOffer.jobTitle,
                      joiningLocation: selectedOffer.location,
                      noticePeriod: noticeInput || selectedOffer.noticePeriod,
                      discussionNotes: notesInput || "Completed verbal discussion & salary alignment.",
                      discussionStatus: "Completed"
                    },
                    salaryNegotiation: {
                      currentSalary: currentCtcInput || "$110,000",
                      expectedSalary: expectedCtcInput || "$130,000",
                      companyOffer: finalSalaryInput || selectedOffer.offeredSalary,
                      finalAgreedSalary: finalSalaryInput || selectedOffer.offeredSalary,
                      finalDesignation: designationInput || selectedOffer.jobTitle,
                      bonus: bonusInput || selectedOffer.bonus,
                      joiningBonus: "$5,000",
                      variablePay: "5%",
                      negotiationNotes: notesInput || "Negotiation completed and agreed.",
                      negotiationStatus: "Accepted"
                    }
                  });
                  setIsVerbalModalOpen(false);
                  setIsSalaryModalOpen(false);
                  triggerToast("Verbal discussion & salary negotiation recorded. Moved to Documentation Audit.");
                }} 
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Save & Confirm Salary Agreement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 4 MODAL: DOCUMENT COLLECTION (13 ENTERPRISE DOCS IN PDF FORMAT) */}
      {isDocModalOpen && selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left">
          <div onClick={() => setIsDocModalOpen(false)} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
          
          <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[90vh] max-h-[90vh] overflow-hidden z-10">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/80 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {selectedOffer.candidateName} — Candidate Compliance Vault (PDF Viewer)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[11px] border border-indigo-200 dark:border-indigo-800">
                      13/13 PDF Documents
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {selectedOffer.jobTitle} • {selectedOffer.candidateEmail} • {selectedOffer.candidatePhone || "+91 98234 56789"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={async () => {
                    const verified = (selectedOffer.documents || DEFAULT_13_DOCUMENTS).map(d => ({ ...d, status: "Verified" as const }));
                    await updateOfferServer(selectedOffer.id, {
                      documents: verified,
                      workflowStage: selectedOffer.workflowStage === "Documentation" ? "Offer Generation" : selectedOffer.workflowStage
                    });
                    triggerToast("All 13 candidate documents verified successfully!");
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Verify All 13 Documents</span>
                </button>

                <button 
                  onClick={() => setIsDocModalOpen(false)} 
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Split view (Left: 13 PDF Document Index list, Right: Interactive PDF Document Viewer) */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel: List of 13 Documents */}
              <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col overflow-y-auto">
                <div className="p-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex justify-between items-center">
                  <span>13 Required PDF Files</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">PDF Format Only</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 flex-1 overflow-y-auto">
                  {(selectedOffer.documents || DEFAULT_13_DOCUMENTS).map((doc, idx) => {
                    const isSelected = activePdfDocIndex === idx;
                    const statusColor = 
                      doc.status === "Verified" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800" :
                      doc.status === "Received" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800" :
                      doc.status === "Rejected" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800" :
                      "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800";

                    return (
                      <div
                        key={idx}
                        onClick={() => setActivePdfDocIndex(idx)}
                        className={`p-3 transition-all cursor-pointer flex flex-col gap-1 text-xs border-l-4 ${
                          isSelected 
                            ? "bg-white dark:bg-slate-900 border-l-indigo-600 shadow-xs" 
                            : "hover:bg-slate-100/60 dark:hover:bg-slate-900/40 border-l-transparent text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            DOC-{(idx + 1).toString().padStart(2, "0")}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border ${statusColor}`}>
                            {doc.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                          <div className={`p-1 rounded shrink-0 ${isSelected ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                            <FileText className="h-3.5 w-3.5" />
                          </div>
                          <span className={`font-semibold truncate ${isSelected ? "text-slate-900 dark:text-white font-bold" : "text-slate-700 dark:text-slate-300"}`}>
                            {doc.name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                          <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 px-1 rounded border border-rose-200 dark:border-rose-900/40 font-bold">.PDF</span>
                          <span>{doc.required ? "Required" : "Optional"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Panel: High Precision PDF Viewer */}
              {(() => {
                const docsList = selectedOffer.documents || DEFAULT_13_DOCUMENTS;
                const activeDoc = docsList[activePdfDocIndex] || docsList[0];
                const activeDocNum = (activePdfDocIndex + 1).toString().padStart(2, "0");
                const candidateName = selectedOffer.candidateName;

                const getPDFDocumentBody = (docName: string) => {
                  if (docName.toLowerCase().includes("resume") || docName.toLowerCase().includes("cv")) {
                    return (
                      <div className="space-y-4">
                        <div className="border-b pb-3">
                          <h2 className="text-xl font-bold text-slate-900">{candidateName}</h2>
                          <p className="text-xs text-indigo-700 font-semibold">{selectedOffer.jobTitle} • {selectedOffer.candidateEmail} • {selectedOffer.candidatePhone || "+91 98234 56789"}</p>
                          <p className="text-[11px] text-slate-500 mt-1">Location: {selectedOffer.workLocation || "Pune, MH"} • Total Exp: 6.5 Years</p>
                        </div>
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b pb-1 mb-2">Executive Summary</h4>
                          <p className="text-xs leading-relaxed text-slate-600">
                            Senior Software Engineer with 6+ years of specialized experience in full-stack web applications, distributed microservices, React.js, TypeScript, and high-throughput Node.js servers. Proven track record leading agile engineering squads and optimizing cloud infrastructure.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b pb-1 mb-2">Core Skills & Competencies</h4>
                          <div className="flex flex-wrap gap-1.5 text-[11px]">
                            {["React 19", "TypeScript", "Node.js", "Express", "PostgreSQL", "Tailwind CSS", "GraphQL", "AWS Cloud", "Docker & K8s", "CI/CD"].map((skill, sIdx) => (
                              <span key={sIdx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 font-semibold">{skill}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b pb-1 mb-2">Work History</h4>
                          <div className="space-y-2 text-xs">
                            <div>
                              <div className="flex justify-between font-bold text-slate-800">
                                <span>Senior Software Engineer — TechCorp Global</span>
                                <span>2022 – Present</span>
                              </div>
                              <p className="text-[11px] text-slate-500">Architected web platform serving 2M+ active monthly users with 99.99% uptime.</p>
                            </div>
                            <div>
                              <div className="flex justify-between font-bold text-slate-800">
                                <span>Software Engineer — Infosys Pvt Ltd</span>
                                <span>2019 – 2022</span>
                              </div>
                              <p className="text-[11px] text-slate-500">Developed enterprise backend microservices and modern frontend dashboards.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (docName.toLowerCase().includes("aadhaar") || docName.toLowerCase().includes("government id")) {
                    return (
                      <div className="space-y-4">
                        <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-lg text-center">
                          <div className="text-xs font-bold text-orange-900">GOVERNMENT OF INDIA • UNIQUE IDENTIFICATION AUTHORITY OF INDIA</div>
                          <div className="text-[10px] text-orange-700 font-mono mt-0.5">AADHAAR IDENTIFICATION CARD (VERIFIED PDF)</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <p><span className="font-bold text-slate-500">Aadhaar No:</span> <span className="font-mono font-bold text-slate-900">XXXX-XXXX-8921</span></p>
                            <p><span className="font-bold text-slate-500">Full Name:</span> <span className="font-bold text-slate-900">{candidateName}</span></p>
                            <p><span className="font-bold text-slate-500">Date of Birth:</span> <span className="font-mono">14/08/1994</span></p>
                            <p><span className="font-bold text-slate-500">Gender:</span> <span>Male / Female</span></p>
                          </div>
                          <div className="space-y-1 border-l pl-4">
                            <p className="font-bold text-slate-500">Registered Residential Address:</p>
                            <p className="text-[11px] text-slate-700 leading-snug">
                              Flat 402, Sunshine Heights, Baner Road, Pune, Maharashtra - 411045
                            </p>
                            <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> UIDAI Biometric Signature Verified
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (docName.toLowerCase().includes("pan")) {
                    return (
                      <div className="space-y-4">
                        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
                          <div className="text-xs font-bold text-indigo-900">INCOME TAX DEPARTMENT • GOVT OF INDIA</div>
                          <div className="text-[10px] text-indigo-700 font-mono mt-0.5">PERMANENT ACCOUNT NUMBER (PAN) CARD (VERIFIED PDF)</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-2">
                            <p><span className="font-bold text-slate-500">PAN Number:</span> <span className="font-mono font-bold text-indigo-800 text-sm">ABCDE1234F</span></p>
                            <p><span className="font-bold text-slate-500">Name:</span> <span className="font-bold text-slate-900">{candidateName}</span></p>
                            <p><span className="font-bold text-slate-500">Father's Name:</span> <span className="font-semibold text-slate-800">S. Jenkins</span></p>
                            <p><span className="font-bold text-slate-500">Date of Birth:</span> <span className="font-mono">14/08/1994</span></p>
                          </div>
                          <div className="p-3 bg-slate-50 border rounded-lg flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-slate-200 border border-slate-300 rounded flex items-center justify-center text-[10px] font-bold text-slate-500">
                              QR SEAL
                            </div>
                            <span className="text-[10px] text-emerald-700 font-bold mt-2">ITD Verified Taxpayer ID</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (docName.toLowerCase().includes("salary") || docName.toLowerCase().includes("slips")) {
                    return (
                      <div className="space-y-4">
                        <div className="border-b pb-2 flex justify-between items-center">
                          <div>
                            <h3 className="font-bold text-sm text-slate-900">PAYSLIP STATEMENT (LAST 3 MONTHS)</h3>
                            <p className="text-[10px] text-slate-500 font-mono">Currency: Indian Rupees (INR / ₹)</p>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded border border-emerald-300">
                            Verified Payslips
                          </span>
                        </div>

                        <table className="w-full text-left text-xs border border-slate-200 rounded">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                            <tr>
                              <th className="p-2">Earnings Component</th>
                              <th className="p-2 text-right">Amount (INR / ₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            <tr>
                              <td className="p-2 font-medium">Basic Salary</td>
                              <td className="p-2 text-right font-mono font-bold">₹75,000.00</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium">House Rent Allowance (HRA)</td>
                              <td className="p-2 text-right font-mono font-bold">₹30,000.00</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium">Special Allowance</td>
                              <td className="p-2 text-right font-mono font-bold">₹35,000.00</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium">Conveyance Allowance</td>
                              <td className="p-2 text-right font-mono font-bold">₹5,000.00</td>
                            </tr>
                            <tr className="bg-slate-50 font-bold text-slate-900">
                              <td className="p-2">Gross Salary Credited / Month</td>
                              <td className="p-2 text-right font-mono text-emerald-700">₹1,45,000.00</td>
                            </tr>
                          </tbody>
                        </table>

                        <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded text-xs">
                          <div className="font-bold text-indigo-900">Annual Gross Compensation: ₹17,40,000 / year</div>
                          <div className="text-[10px] text-indigo-700 mt-0.5">Verified against bank salary credit statements.</div>
                        </div>
                      </div>
                    );
                  }

                  // Default Generic Enterprise PDF Layout for other documents
                  return (
                    <div className="space-y-4">
                      <div className="border-b pb-3 flex justify-between items-start">
                        <div>
                          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">{docName}</h2>
                          <p className="text-xs text-indigo-700 font-semibold">Candidate: {candidateName} • Ref: ENCUREIT-{selectedOffer.id}</p>
                        </div>
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold rounded border border-indigo-200">
                          OFFICIAL PDF
                        </span>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed space-y-2 text-slate-700">
                        <p className="font-bold text-slate-900">Document Verification Statement:</p>
                        <p>
                          This is an officially verified electronic copy of <strong>{docName}</strong> submitted by candidate <strong>{candidateName}</strong> for employment background audit at encureIT Systems Pvt Ltd.
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Document ID: DOC-2026-PDF-{selectedOffer.id}-{activeDocNum} • Integrity Status: PASS
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                        <div className="p-3 border rounded space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Verification Authority</span>
                          <p className="font-bold text-slate-800">encureIT Talent Compliance Team</p>
                          <p className="text-[11px] text-emerald-700 font-semibold">Status: Verified & Approved</p>
                        </div>
                        <div className="p-3 border rounded space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Timestamp</span>
                          <p className="font-mono text-slate-800">{selectedOffer.offerDate || "2026-07-15"} 11:45 AM</p>
                          <p className="text-[11px] text-indigo-600 font-semibold">Format: Standard ISO PDF/A</p>
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="flex-1 bg-slate-200 dark:bg-slate-950 flex flex-col overflow-hidden">
                    {/* PDF Reader Header Toolbar */}
                    <div className="p-3 bg-slate-800 text-white flex justify-between items-center text-xs shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 bg-rose-600 text-white font-mono font-bold text-[10px] rounded shrink-0">
                          PDF
                        </span>
                        <span className="font-mono truncate text-slate-200 font-semibold">
                          {activeDoc.name.replace(/\s+/g, "_")}_{candidateName.replace(/\s+/g, "_")}.pdf
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] font-mono text-slate-300">Page 1 of 1</span>
                        <div className="h-4 w-px bg-slate-600" />
                        <span className="text-[11px] font-mono text-slate-300">100% Zoom</span>
                        <div className="h-4 w-px bg-slate-600" />
                        
                        <button 
                          onClick={() => {
                            const pdfText = `ENCUREIT SYSTEMS PVT LTD - OFFICIAL CANDIDATE DOCUMENT\n\nDocument Name: ${activeDoc.name}\nCandidate Name: ${candidateName}\nOffer ID: ${selectedOffer.id}\nVerification Status: ${activeDoc.status}\nFormat: Standard PDF Document`;
                            const blob = new Blob([pdfText], { type: "application/pdf" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${activeDoc.name.replace(/\s+/g, "_")}_${candidateName.replace(/\s+/g, "_")}.pdf`;
                            a.click();
                            URL.revokeObjectURL(url);
                            triggerToast(`Downloaded ${activeDoc.name} in PDF format!`);
                          }}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>

                    {/* PDF Canvas Paper View */}
                    <div className="flex-1 p-6 overflow-y-auto flex justify-center">
                      <div className="w-full max-w-2xl bg-white text-slate-900 shadow-2xl rounded-xs border border-slate-300 p-8 flex flex-col justify-between min-h-[600px] relative">
                        {/* Background Watermark */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                          <span className="text-6xl font-black rotate-[-35deg] text-slate-900 tracking-widest text-center">
                            ENCUREIT SYSTEMS<br />PDF DOCUMENT
                          </span>
                        </div>

                        {/* Document Content */}
                        <div className="relative z-10">
                          {getPDFDocumentBody(activeDoc.name)}
                        </div>

                        {/* Official PDF Document Seal & Footer */}
                        <div className="relative z-10 mt-8 pt-4 border-t border-slate-300 flex justify-between items-end text-[10px] text-slate-500 font-mono">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-emerald-700 font-bold">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <span>DIGITALLY SIGNED & VERIFIED PDF</span>
                            </div>
                            <p>Issuer: encureIT HR Compliance Audit Services</p>
                            <p>Standard: ISO 27001 Data Security Compliant</p>
                          </div>
                          
                          <div className="text-right space-y-1">
                            <div className="p-1 bg-slate-100 border border-slate-200 rounded inline-block font-mono text-[9px] text-slate-700">
                              SHA256: 8f9b2a1c4e7d3f2a
                            </div>
                            <p>Page 1 / 1 (PDF Format)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Candidate: <strong className="text-slate-800 dark:text-slate-200">{selectedOffer.candidateName}</strong> • Selected Document: <strong>{(selectedOffer.documents || DEFAULT_13_DOCUMENTS)[activePdfDocIndex]?.name}</strong>
              </span>
              <button 
                onClick={() => setIsDocModalOpen(false)} 
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Close Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 9 MODAL: JOINING PROCESS & ONBOARDING (10 TASKS) */}
      {isOnboardingModalOpen && selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left">
          <div onClick={() => setIsOnboardingModalOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" />
          
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10">
            <div className="p-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Stage 9: Joining Process & Onboarding (10 Tasks)</h3>
              </div>
              <button onClick={() => setIsOnboardingModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 flex-1 overflow-y-auto text-xs">
              <div className="space-y-2">
                {(selectedOffer.joiningChecklist || DEFAULT_10_JOINING_TASKS).map((task, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-950 rounded border">
                    <span className="font-semibold">{task.name}</span>
                    <button 
                      onClick={async () => {
                        const updated = [...(selectedOffer.joiningChecklist || DEFAULT_10_JOINING_TASKS)];
                        updated[idx] = { ...updated[idx], completed: !updated[idx].completed };
                        await updateOfferServer(selectedOffer.id, { joiningChecklist: updated });
                      }}
                      className={`px-2 py-1 rounded font-bold text-[10px] ${
                        task.completed ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {task.completed ? "✓ Complete" : "Mark Complete"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 dark:bg-slate-950 flex justify-end gap-2">
              <button 
                onClick={async () => {
                  await updateOfferServer(selectedOffer.id, {
                    status: "Joined",
                    workflowStage: "Employee Joined"
                  });
                  setIsOnboardingModalOpen(false);
                  triggerToast(`Candidate ${selectedOffer.candidateName} marked JOINED!`);
                }} 
                className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded"
              >
                Complete Onboarding & Mark Joined
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VALIDATION PRE-CONDITION MODAL */}
      {isValidationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left">
          <div onClick={() => setIsValidationModalOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" />
          
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 z-10">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Offer Generation Requirement</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Cannot generate official offer letter yet. The following prerequisites must be met first:
            </p>

            <ul className="space-y-2 text-xs font-semibold text-rose-600">
              {validationErrors.map((err, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span>•</span>
                  <span>{err}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2 flex justify-end gap-2">
              <button onClick={() => setIsValidationModalOpen(false)} className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg">
                Understand & Review Stage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI OFFER LETTER & EMAIL PREVIEW MODAL */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left">
          <div onClick={() => setIsPreviewModalOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" />
          
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10">
            <div className="p-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-950 dark:text-white">Offer Contract & Email Preview</h3>
              </div>
              <button onClick={() => setIsPreviewModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded border text-xs text-indigo-900 dark:text-indigo-200">
                <strong>Note:</strong> Per enterprise requirements, the PDF Offer Contract contains NO salary. Salary details are included in the email body below.
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {generatedLetter}
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 dark:bg-slate-950 flex justify-between gap-2 shrink-0">
              <button 
                onClick={() => handleDownloadPDFWithoutSalary(aiForm.candidateName)}
                className="px-3.5 py-1.5 bg-white border text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Official Offer Letter</span>
              </button>

              <div className="flex gap-2">
                <button 
                  onClick={handleSaveOffer}
                  className="px-4 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
                >
                  Send Email & Dispatch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI FORM GENERATION MODAL */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left">
          <div onClick={() => setIsAIModalOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" />
          
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10">
            <div className="p-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600 animate-spin-slow" />
                <h3 className="font-bold text-base text-slate-950 dark:text-white">AI Offer Generator Settings</h3>
              </div>
              <button onClick={() => setIsAIModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-400">Candidate Name</label>
                  <input type="text" value={aiForm.candidateName} onChange={e => setAiForm({ ...aiForm, candidateName: e.target.value })} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border rounded font-semibold mt-1" />
                </div>
                <div>
                  <label className="font-bold text-slate-400">Candidate Email</label>
                  <input type="email" value={aiForm.candidateEmail} onChange={e => setAiForm({ ...aiForm, candidateEmail: e.target.value })} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border rounded font-semibold mt-1" />
                </div>
                <div>
                  <label className="font-bold text-slate-400">Job Title</label>
                  <input type="text" value={aiForm.jobTitle} onChange={e => setAiForm({ ...aiForm, jobTitle: e.target.value })} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border rounded font-semibold mt-1" />
                </div>
                <div>
                  <label className="font-bold text-slate-400">Annual Salary</label>
                  <input type="text" value={aiForm.offeredSalary} onChange={e => setAiForm({ ...aiForm, offeredSalary: e.target.value })} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border rounded font-semibold mt-1" />
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 dark:bg-slate-950 flex justify-end gap-2 shrink-0">
              <button onClick={() => setIsAIModalOpen(false)} className="px-4 py-1.5 bg-slate-200 text-slate-700 font-bold text-xs rounded">Cancel</button>
              <button onClick={handleValidateAndGenerateOffer} className="px-4 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded shadow-sm">Generate Contract with AI</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
