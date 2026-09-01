/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { LocalStorageService } from "../services/localStorageService";
import { TalentPoolRepository } from "../repositories";
import { formatJobId } from "../repositories/repositoryUtils";
import { 
  Users, 
  Sparkles, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Mail, 
  Search, 
  Filter, 
  Database, 
  FileText, 
  MoreVertical, 
  ExternalLink, 
  UserPlus, 
  ChevronRight, 
  CheckCircle, 
  X, 
  MessageSquare, 
  Download, 
  MapPin, 
  Briefcase, 
  Award, 
  BookOpen, 
  Trash2, 
  Tag, 
  Inbox,
  Send,
  UserCheck,
  ChevronDown,
  UploadCloud,
  Plus
} from "lucide-react";

// Types matching the existing ATS domain
interface TalentPoolCandidate {
  candidateId?: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  currentRole: string;
  currentCompany: string;
  skills: string[];
  experienceYears: number;
  location: string;
  aiMatchScore: number;
  availability: "Immediate" | "15 days" | "30 days" | "60 days" | "90 days";
  noticePeriod: "Immediate" | "15 Days" | "1 Month" | "2 Months" | "3 Months";
  lastContacted: string;
  status: "Available" | "Contacted" | "Interested" | "Not Interested" | "Archived";
  department: "Engineering" | "Product" | "QA" | "Operations" | "Design" | "Sales";
  education: {
    degree: string;
    specialization: string;
    passingYear: string;
    university: string;
  };
  tags: string[];
  aiSummary: string;
  certifications: string[];
  projects: { name: string; description: string }[];
  recruitmentHistory: {
    appliedJob: string;
    previousStage: string;
    interviewFeedback: string;
    notSelectedReason: string;
    recruiterNotes: string;
  };
}

// Pre-seeded high fidelity realistic dummy data
const INITIAL_TALENT_POOL: TalentPoolCandidate[] = [
  {
    id: "tp-1",
    name: "Aarav Sharma",
    email: "aarav.sharma@techcorp.com",
    phone: "+91 98234 56789",
    currentRole: "Senior Java Backend Developer",
    currentCompany: "TechCorp India",
    skills: ["Java", "Spring Boot", "REST APIs", "MySQL", "Git", "Docker", "Microservices"],
    experienceYears: 6.5,
    location: "Pune",
    aiMatchScore: 94,
    availability: "Immediate",
    noticePeriod: "Immediate",
    lastContacted: "2026-07-10",
    status: "Available",
    department: "Engineering",
    education: {
      degree: "B.Tech",
      specialization: "Computer Science",
      passingYear: "2020",
      university: "Pune University"
    },
    tags: ["Immediate Joiner", "High Potential", "Backend Developer"],
    aiSummary: "Senior Java Developer with 6+ years of specialized experience in high-throughput microservices architectures. Exceptional performance in scalable Spring Boot cloud native environments.",
    certifications: ["Oracle Certified Professional Java SE 11 Developer", "AWS Certified Solutions Architect"],
    projects: [
      { name: "Global Ledger Engine", description: "Led a backend modernization project reducing API latency by 45% using Spring Boot and Redis caching." },
      { name: "Payment Ingestion Pipeline", description: "Architected a secure transaction framework handling over 1.2 million webhook payloads hourly." }
    ],
    recruitmentHistory: {
      appliedJob: "Lead Backend Architect",
      previousStage: "Director Round / Final Interview",
      interviewFeedback: "Strong architecture skills, very articulate. Decided to hold due to budget restrictions at that time. Strongly recommend for future senior roles.",
      notSelectedReason: "Budget Constraints",
      recruiterNotes: "Excellent feedback across all loops. Kept on warm candidate standby."
    }
  },
  {
    id: "tp-2",
    name: "Riya Patel",
    email: "riya.patel@webscale.io",
    phone: "+91 87654 32109",
    currentRole: "Frontend Engineer",
    currentCompany: "WebScale Solutions",
    skills: ["React", "TypeScript", "Tailwind CSS", "Redux", "Vite", "Next.js", "Jest"],
    experienceYears: 3.2,
    location: "Bangalore",
    aiMatchScore: 88,
    availability: "30 days",
    noticePeriod: "1 Month",
    lastContacted: "2026-07-15",
    status: "Interested",
    department: "Engineering",
    education: {
      degree: "MCA",
      specialization: "Information Technology",
      passingYear: "2023",
      university: "NIT Trichy"
    },
    tags: ["High Potential", "Strong Communication", "Frontend Developer"],
    aiSummary: "Product-focused Frontend Developer with 3+ years of experience delivering pixel-perfect React single-page applications. Highly skilled in user interface state machines and CSS typography.",
    certifications: ["Frontend Specialist Certification (Meta)", "React Advanced Professional"],
    projects: [
      { name: "HR Dashboard System", description: "Developed custom modular enterprise dashboard component framework using Tailwind CSS." },
      { name: "E-Commerce Experience", description: "Created low-latency checkout cart funnel optimizing load speed by 1.4 seconds." }
    ],
    recruitmentHistory: {
      appliedJob: "Senior UI Developer",
      previousStage: "Technical Round 2",
      interviewFeedback: "Excellent coding capability, although current React state management was a bit fresh. Recommended as a solid mid-level UI dev.",
      notSelectedReason: "Role filled by senior internal transfer",
      recruiterNotes: "Highly proactive and friendly. Perfect cultural fit."
    }
  },
  {
    id: "tp-3",
    name: "Karan Malhotra",
    email: "karan.malhotra@devagency.net",
    phone: "+91 99887 76655",
    currentRole: "DevOps Engineer",
    currentCompany: "DevAgency Solutions",
    skills: ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Python", "Linux", "Prometheus"],
    experienceYears: 4.8,
    location: "Remote",
    aiMatchScore: 91,
    availability: "Immediate",
    noticePeriod: "Immediate",
    lastContacted: "2026-06-28",
    status: "Available",
    department: "Engineering",
    education: {
      degree: "BSc",
      specialization: "Computer Science",
      passingYear: "2021",
      university: "Delhi University"
    },
    tags: ["Immediate Joiner", "Remote Ready", "Data Engineer"],
    aiSummary: "Infrastructure automation expert specialized in Kubernetes orchestration, multi-cloud Terraform provisioning, and robust secure delivery pipelines.",
    certifications: ["Certified Kubernetes Administrator (CKA)", "HashiCorp Certified Terraform Associate"],
    projects: [
      { name: "Kubernetes Cluster Migration", description: "Migrated 80+ microservices from ECS to self-managed EKS, decreasing cloud bills by 32%." },
      { name: "Automated Deployments", description: "Engineered single-click deployment pipelines for staging environments." }
    ],
    recruitmentHistory: {
      appliedJob: "Cloud & Devops Lead",
      previousStage: "Hiring Manager Evaluation",
      interviewFeedback: "Very strong hands-on DevOps practitioner. Decided to opt for a candidate with slightly more Java coding experience for hybrid DevSecOps.",
      notSelectedReason: "Requirement for deeper backend application coding",
      recruiterNotes: "Incredible technical skills, highly active on DevOps forums. Excellent referral track record."
    }
  },
  {
    id: "tp-4",
    name: "Ananya Iyer",
    email: "ananya.iyer@fintechpro.com",
    phone: "+91 91122 33445",
    currentRole: "Data Scientist",
    currentCompany: "FinTech Pro",
    skills: ["Python", "Pandas", "Scikit-Learn", "SQL", "TensorFlow", "Tableau", "Apache Spark"],
    experienceYears: 5.0,
    location: "Mumbai",
    aiMatchScore: 85,
    availability: "15 days",
    noticePeriod: "15 Days",
    lastContacted: "2026-07-02",
    status: "Contacted",
    department: "Product",
    education: {
      degree: "MS",
      specialization: "Data Science & Analytics",
      passingYear: "2021",
      university: "BITS Pilani"
    },
    tags: ["Leadership", "High Potential"],
    aiSummary: "Analytical Data Analyst and Scientist with an exceptional background in financial credit scoring models, natural language processing, and clean statistical data visuals.",
    certifications: ["Professional Data Engineer (Google Cloud)", "Machine Learning Specialist (Stanford Online)"],
    projects: [
      { name: "Fraud Detection Engine", description: "Trained XGBoost models to identify suspicious credit profiles with 99.1% accuracy." },
      { name: "Business Analytics Suite", description: "Compiled executive-level interactive telemetry charts using Tableau and Postgres." }
    ],
    recruitmentHistory: {
      appliedJob: "Lead AI Scientist",
      previousStage: "Final Presentation Round",
      interviewFeedback: "Strong analytical thinking. Slightly missed the target on the raw platform engineering skills needed for production deployment.",
      notSelectedReason: "Lacked distributed platform hosting skills",
      recruiterNotes: "Keep on file for analytical and dashboard development requirements."
    }
  },
  {
    id: "tp-5",
    name: "Rohan Deshmukh",
    email: "rohan.d@enterprisecore.org",
    phone: "+91 94220 12345",
    currentRole: "QA Automation Lead",
    currentCompany: "EnterpriseCore Software",
    skills: ["Selenium", "Java", "Cypress", "Postman", "CI/CD", "Jira", "Cucumber"],
    experienceYears: 5.5,
    location: "Pune",
    aiMatchScore: 92,
    availability: "Immediate",
    noticePeriod: "Immediate",
    lastContacted: "2026-07-18",
    status: "Available",
    department: "QA",
    education: {
      degree: "B.Tech",
      specialization: "Electronics & Telecommunications",
      passingYear: "2020",
      university: "COEP Pune"
    },
    tags: ["Immediate Joiner", "Strong Communication", "Leadership"],
    aiSummary: "Automated testing expert with a deep background in designing scalable regression suits. Highly competent in modern CI/CD orchestration tools.",
    certifications: ["ISTQB Certified Tester - Advanced Level Test Automation Engineer"],
    projects: [
      { name: "QA Grid Automation", description: "Decreased continuous integration validation loop timings from 90 to 14 minutes using parallel QA Grids." },
      { name: "Mobile App Appium Test Harness", description: "Successfully rolled out full end-to-end testing models for iOS & Android native portals." }
    ],
    recruitmentHistory: {
      appliedJob: "QA Engineering Director",
      previousStage: "Management Round",
      interviewFeedback: "A brilliant engineer who manages stakeholders very well. Position was put on freeze indefinitely.",
      notSelectedReason: "Headcount/Role Frozen",
      recruiterNotes: "An outstanding specialist. We should hire him immediately as soon as headcounts open."
    }
  },
  {
    id: "tp-6",
    name: "Sneha Reddy",
    email: "sneha.reddy@saasventures.com",
    phone: "+91 76543 21098",
    currentRole: "Product Manager",
    currentCompany: "SaaS Ventures",
    skills: ["Product Strategy", "Agile", "User Research", "Figma", "Mixpanel", "Jira", "A/B Testing"],
    experienceYears: 4.0,
    location: "Hyderabad",
    aiMatchScore: 89,
    availability: "30 days",
    noticePeriod: "1 Month",
    lastContacted: "2026-07-05",
    status: "Interested",
    department: "Product",
    education: {
      degree: "MBA",
      specialization: "Product Management & Strategy",
      passingYear: "2022",
      university: "IIM Bangalore"
    },
    tags: ["Leadership", "Strong Communication", "Referral"],
    aiSummary: "SaaS-oriented Product Manager who bridges engineering design and customer research with a clear metrics-focused strategy. Champion of simple usability.",
    certifications: ["Pragmatic Certified Product Manager", "Scrum Alliance Product Owner (CSPO)"],
    projects: [
      { name: "Self-Serve Portal Rollout", description: "Designed self-serve billing flow, boosting active signups by 18%." },
      { name: "Mobile Notification Engine", description: "Shipped rich context triggers pushing user retention rates up by 12%." }
    ],
    recruitmentHistory: {
      appliedJob: "Senior Product Manager - Core Platform",
      previousStage: "Technical Case Review",
      interviewFeedback: "Excellent customer strategy, outstanding mock execution. Lacked deep API strategy which was required for that platform team.",
      notSelectedReason: "Looking for more heavy API/technical architecture background",
      recruiterNotes: "We should present her for any upcoming Growth or Product Experience manager roles."
    }
  },
  {
    id: "tp-7",
    name: "Vikram Malhotra",
    email: "vikram.m@techpartners.com",
    phone: "+91 93344 55667",
    currentRole: "Full Stack Engineer",
    currentCompany: "TechPartners Global",
    skills: ["Node.js", "React", "MongoDB", "Express.js", "Docker", "JavaScript", "AWS"],
    experienceYears: 3.5,
    location: "Pune",
    aiMatchScore: 90,
    availability: "60 days",
    noticePeriod: "2 Months",
    lastContacted: "2026-05-12",
    status: "Contacted",
    department: "Engineering",
    education: {
      degree: "B.Tech",
      specialization: "Information Technology",
      passingYear: "2022",
      university: "MIT Pune"
    },
    tags: ["Campus Hire", "Backend Developer", "Frontend Developer"],
    aiSummary: "Slick JavaScript engineer fully certified in MERN stack. Strong foundation in databases, Docker deployments, and asynchronous message queues.",
    certifications: ["AWS Certified Developer Associate"],
    projects: [
      { name: "Collaborative Whiteboard Integration", description: "Designed socket server infrastructure resolving real-time collaboration lags." },
      { name: "ERP Database Refactoring", description: "Optimized complex MongoDB queries, speeding up overall report outputs by 50%." }
    ],
    recruitmentHistory: {
      appliedJob: "Fullstack JavaScript Dev",
      previousStage: "Technical Round 1",
      interviewFeedback: "Good standard skills, although slightly less experienced in heavy cloud caching than desired for an immediate lead role.",
      notSelectedReason: "Required higher cloud orchestration seniority",
      recruiterNotes: "Warm candidate. Very prompt and highly coachable."
    }
  },
  {
    id: "tp-8",
    name: "Pooja Hegde",
    email: "pooja.hegde@dataworks.co",
    phone: "+91 81234 56780",
    currentRole: "Lead Data Engineer",
    currentCompany: "DataWorks Systems",
    skills: ["Apache Spark", "Python", "SQL", "Hadoop", "Snowflake", "Airflow", "Kafka"],
    experienceYears: 7.2,
    location: "Bangalore",
    aiMatchScore: 93,
    availability: "90 days",
    noticePeriod: "3 Months",
    lastContacted: "2026-07-20",
    status: "Interested",
    department: "Engineering",
    education: {
      degree: "B.Tech",
      specialization: "Computer Science",
      passingYear: "2019",
      university: "VTU Belgaum"
    },
    tags: ["Leadership", "Data Engineer", "High Potential"],
    aiSummary: "Distinguished data platform architect with 7+ years constructing petabyte-scale pipeline architectures, ETL workflows, and real-time Kafka streaming feeds.",
    certifications: ["Databricks Certified Associate Developer Spark 3.0", "Google Professional Cloud Database Engineer"],
    projects: [
      { name: "Corporate Data Warehouse", description: "Configured multi-tenant Snowflake server handling complete regional analytical dashboards." },
      { name: "Real-time Telemetry Processing", description: "Built streaming Airflow/Kafka setup, ingesting 4B logs daily with minimal downtime." }
    ],
    recruitmentHistory: {
      appliedJob: "Data Platform Engineering Director",
      previousStage: "Executive Panel Loop",
      interviewFeedback: "Incredibly bright, spectacular platform mastery. She had a longer notice period (90 days) while we had an immediate deliverable mandate.",
      notSelectedReason: "Long Notice Period (90 Days)",
      recruiterNotes: "A stellar talent. Recommended to stay in close active touch and try to negotiate a buyout if another senior opening arises."
    }
  }
];

export default function TalentPoolView() {
  

  
  const [candidates, setCandidates] = useState<any[]>([]);

  const fetchCandidates = async () => {
    try {
      const data = await TalentPoolRepository.getAll();
      setCandidates(data);
    } catch (err) {
      console.error("Failed to fetch candidates", err);
    }
  };

  useEffect(() => {
    fetchCandidates();
    window.addEventListener("trigger-notification-sync", fetchCandidates);
    window.addEventListener("applications-updated", fetchCandidates);
    window.addEventListener("talent-pool-updated", fetchCandidates);
    return () => {
      window.removeEventListener("trigger-notification-sync", fetchCandidates);
      window.removeEventListener("applications-updated", fetchCandidates);
      window.removeEventListener("talent-pool-updated", fetchCandidates);
    };
  }, []);

  const [selectedCandidate, setSelectedCandidate] = useState<TalentPoolCandidate | null>(null);
  
  // Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedExperience, setSelectedExperience] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedEducation, setSelectedEducation] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [selectedNoticePeriod, setSelectedNoticePeriod] = useState("all");
  const [selectedMinScore, setSelectedMinScore] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Interactive state actions & feedback alerts
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<"success" | "info" | "warning">("success");
  const [candIdPendingDelete, setCandIdPendingDelete] = useState<string | null>(null);
  const [isPendingBulkDelete, setIsPendingBulkDelete] = useState(false);
  const [drawerDeletePending, setDrawerDeletePending] = useState(false);

  // Simulated Email Modal
  const [emailModalCandidate, setEmailModalCandidate] = useState<TalentPoolCandidate | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Simulated Note Editor inside Drawer
  const [drawerNote, setDrawerNote] = useState("");

  // Add Candidate Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCandidateForm, setNewCandidateForm] = useState({
    name: "",
    email: "",
    phone: "",
    currentRole: "",
    currentCompany: "",
    skillsString: "",
    experienceYears: "",
    location: "",
    aiMatchScore: "",
    availability: "Immediate" as const,
    noticePeriod: "Immediate" as const,
    department: "Engineering" as const,
    degree: "",
    specialization: "",
    passingYear: "",
    university: "",
    tagsString: "",
    aiSummary: "",
    certificationsString: "",
    appliedJob: "",
    previousStage: "",
    interviewFeedback: "",
    notSelectedReason: "",
    recruiterNotes: ""
  });

  // Import Candidates State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importDragActive, setImportDragActive] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");

  // Triggering visual feedback toast
  const triggerToast = (msg: string, type: "success" | "info" | "warning" = "success") => {
    setAlertMessage(msg);
    setAlertType(type);
    setTimeout(() => setAlertMessage(null), 4000);
  };

    const handleAddCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidateForm.name || !newCandidateForm.email || !newCandidateForm.currentRole) {
      triggerToast("⚠️ Name, Email, and Current Role are required.", "warning");
      return;
    }

    const newCandidate = {
      firstName: newCandidateForm.name.split(" ")[0],
      lastName: newCandidateForm.name.split(" ").slice(1).join(" "),
      email: newCandidateForm.email,
      phone: newCandidateForm.phone || "+91 99999 99999",
      currentRole: newCandidateForm.currentRole,
      currentCompany: newCandidateForm.currentCompany || "Freelance",
      skills: newCandidateForm.skillsString ? newCandidateForm.skillsString.split(",").map(s => s.trim()).filter(Boolean) : ["React"],
      experienceYears: Number(newCandidateForm.experienceYears) || 0,
      location: newCandidateForm.location || "Remote",
      aiMatchScore: Number(newCandidateForm.aiMatchScore) || Math.floor(Math.random() * 20) + 75,
      availability: newCandidateForm.availability,
      noticePeriod: newCandidateForm.noticePeriod,
      department: newCandidateForm.department,
    };

    try {
      await TalentPoolRepository.create(newCandidate);
      await fetchCandidates();
      window.dispatchEvent(new Event("trigger-notification-sync"));
      setIsAddModalOpen(false);
      setNewCandidateForm({
        name: "", email: "", phone: "", currentRole: "", currentCompany: "", skillsString: "", experienceYears: "", location: "", aiMatchScore: "", availability: "Immediate", noticePeriod: "Immediate", department: "Engineering", degree: "", specialization: "", passingYear: "", university: "", tagsString: "", aiSummary: "", certificationsString: "", appliedJob: "", previousStage: "", interviewFeedback: "", notSelectedReason: "", recruiterNotes: ""
      });
      triggerToast(`🎉 Successfully added candidate "${newCandidateForm.name}" to the Talent Pool database!`, "success");
    } catch(err) {
      triggerToast("❌ Failed to add candidate", "warning");
    }
  };
  const handleImportDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setImportDragActive(true);
    } else if (e.type === "dragleave") {
      setImportDragActive(false);
    }
  };

  const handleImportDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImportDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImportedFile(e.dataTransfer.files[0]);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImportedFile(e.target.files[0]);
    }
  };

  const processImportedFile = (file: File) => {
    setImportFile(file);
    setIsImporting(true);
    setImportProgress(0);
    setImportStatus("Uploading resume standard...");

    const interval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          completeSimulatedImport(file);
          return 100;
        }
        
        const next = prev + 10;
        if (next < 40) {
          setImportStatus("Uploading document structure...");
        } else if (next < 75) {
          setImportStatus("Aura AI extracting professional experience and education...");
        } else if (next < 95) {
          setImportStatus("Benchmarking skills matrix with active recruitment open loops...");
        } else {
          setImportStatus("Finalizing candidate match metrics...");
        }
        return next;
      });
    }, 150);
  };

  const completeSimulatedImport = (file: File) => {
    const rawName = file.name.split(".")[0].replace(/_/g, " ").replace(/-/g, " ");
    const parsedName = rawName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    
    const profiles = [
      {
        role: "Senior React Specialist",
        company: "Global Web Solutions",
        skills: ["React", "TypeScript", "Redux", "Webpack", "Tailwind CSS", "Jest", "GraphQL"],
        exp: 5,
        loc: "Remote (India)",
        dept: "Engineering" as const,
        score: 91,
        degree: "B.E.",
        spec: "Information Technology",
        univ: "Anna University",
        summary: "Specialized frontend developer with a robust focus on optimization, design frameworks, and low latency server-side state hydration."
      },
      {
        role: "DevOps & Cloud Engineer",
        company: "Stellar Cloud Systems",
        skills: ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux", "Python", "Prometheus"],
        exp: 4.5,
        loc: "Mumbai",
        dept: "Operations" as const,
        score: 87,
        degree: "B.Tech",
        spec: "Computer Science",
        univ: "IIT Bombay",
        summary: "Highly skilled Cloud Engineer specialized in automating multi-cloud container pipelines and reducing infrastructure overhead by 30%."
      },
      {
        role: "Product Manager (UX/Growth)",
        company: "NextGen Unicorn",
        skills: ["Agile", "Jira", "Mixpanel", "SQL", "Product Roadmap", "A/B Testing", "Figma"],
        exp: 6,
        loc: "Bangalore",
        dept: "Product" as const,
        score: 93,
        degree: "MBA",
        spec: "Product Management",
        univ: "IIM Ahmedabad",
        summary: "Data-driven Product Manager with a record of driving 2.5x growth in user retention through rigorous behavioral experiments and custom UX flows."
      }
    ];

    const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];
    const cleanName = parsedName.toLowerCase().includes("resume") || parsedName.toLowerCase().includes("cv") || parsedName.length < 3
      ? "Nikhil Deshmukh" 
      : parsedName;

    const importedCandidate: TalentPoolCandidate = {
      id: `tp-${Date.now()}`,
      name: cleanName,
      email: `${cleanName.toLowerCase().replace(/\s/g, ".")}@gmail.com`,
      phone: `+91 ${Math.floor(Math.random() * 10000) + 90000} ${Math.floor(Math.random() * 10000) + 10000}`,
      currentRole: randomProfile.role,
      currentCompany: randomProfile.company,
      skills: randomProfile.skills,
      experienceYears: randomProfile.exp,
      location: randomProfile.loc,
      aiMatchScore: randomProfile.score,
      availability: "Immediate",
      noticePeriod: "Immediate",
      lastContacted: new Date().toISOString().split("T")[0],
      status: "Available",
      department: randomProfile.dept,
      education: {
        degree: randomProfile.degree,
        specialization: randomProfile.spec,
        passingYear: "2021",
        university: randomProfile.univ
      },
      tags: ["AI Imported", "Immediate Joiner", "Auto Screened"],
      aiSummary: randomProfile.summary,
      certifications: ["Professional Cloud Developer Certificate", "Scrum Alliance PO"],
      projects: [
        { name: "Automated Deployment Engine", description: "Redesigned deployment lifecycle reducing regression errors by 60%." }
      ],
      recruitmentHistory: {
        appliedJob: randomProfile.role,
        previousStage: "Auto Parsed",
        interviewFeedback: "Candidate profile auto-analyzed from resume file structure with highly positive ratings.",
        notSelectedReason: "N/A - Standby",
        recruiterNotes: `Uploaded CV file: ${file.name}. Profile parsed with Aura AI parser. Nice resume structure.`
      }
    };

    setTimeout(() => {
      setCandidates(prev => [importedCandidate, ...prev]);
      setIsImporting(false);
      setImportFile(null);
      setIsImportModalOpen(false);
      triggerToast(`📥 Successfully imported and parsed "${importedCandidate.name}" (${importedCandidate.currentRole}) into the Talent Pool!`, "success");
    }, 400);
  };

  // Unique list generators for filter options (Dynamic)
  const allSkillsList = useMemo(() => {
    const set = new Set<string>();
    (candidates || []).forEach(c => {
      if (!c) return;
      const skillsArr = Array.isArray(c.skills) ? c.skills : (typeof c.skills === "string" ? String(c.skills).split(",") : []);
      skillsArr.forEach((s: any) => {
        if (s && typeof s === "string") set.add(s.trim());
      });
    });
    return Array.from(set);
  }, [candidates]);

  const allRolesList = useMemo(() => {
    return Array.from(new Set((candidates || []).map(c => c?.currentRole).filter(Boolean)));
  }, [candidates]);

  const allLocationsList = useMemo(() => {
    return Array.from(new Set((candidates || []).map(c => c?.location).filter(Boolean)));
  }, [candidates]);

  const allCompaniesList = useMemo(() => {
    return Array.from(new Set((candidates || []).map(c => c?.currentCompany).filter(Boolean)));
  }, [candidates]);

  const allTagsList = [
    "Immediate Joiner", "High Potential", "Strong Communication", 
    "Leadership", "Referral", "Campus Hire", "Remote Ready", 
    "Backend Developer", "Frontend Developer", "Data Engineer"
  ];

  // Filtering Logic
  const filteredCandidates = useMemo(() => {
    return (candidates || []).filter(candidate => {
      if (!candidate) return false;
      const skillsArr = Array.isArray(candidate.skills) ? candidate.skills : (typeof candidate.skills === "string" ? String(candidate.skills).split(",") : []);
      const candName = String(candidate.name || "");
      const candRole = String(candidate.currentRole || "");
      const candCompany = String(candidate.currentCompany || "");

      // 1. Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = candName.toLowerCase().includes(query);
        const matchesRole = candRole.toLowerCase().includes(query);
        const matchesCompany = candCompany.toLowerCase().includes(query);
        const matchesSkills = skillsArr.some((s: any) => String(s).toLowerCase().includes(query));
        if (!matchesName && !matchesRole && !matchesCompany && !matchesSkills) {
          return false;
        }
      }

      // 2. Skill Filter
      if (selectedSkill !== "all" && !skillsArr.map((s: any) => String(s).toLowerCase()).includes(selectedSkill.toLowerCase())) {
        return false;
      }

      // 3. Role Filter
      if (selectedRole !== "all" && candidate.currentRole !== selectedRole) {
        return false;
      }

      // 4. Department Filter
      if (selectedDepartment !== "all" && candidate.department !== selectedDepartment) {
        return false;
      }

      // 5. Location Filter
      if (selectedLocation !== "all" && candidate.location !== selectedLocation) {
        return false;
      }

      // 6. Experience Filter
      if (selectedExperience !== "all") {
        if (selectedExperience === "fresher" && candidate.experienceYears > 1) return false;
        if (selectedExperience === "1-3" && (candidate.experienceYears < 1 || candidate.experienceYears > 3)) return false;
        if (selectedExperience === "3-5" && (candidate.experienceYears < 3 || candidate.experienceYears > 5)) return false;
        if (selectedExperience === "5+" && candidate.experienceYears < 5) return false;
      }

      // 7. Education Filter
      if (selectedEducation !== "all" && candidate.education.degree !== selectedEducation) {
        return false;
      }

      // 8. Availability Filter
      if (selectedAvailability !== "all" && candidate.availability !== selectedAvailability) {
        return false;
      }

      // 9. Notice Period Filter
      if (selectedNoticePeriod !== "all" && candidate.noticePeriod !== selectedNoticePeriod) {
        return false;
      }

      // 10. AI Score Filter
      if (selectedMinScore !== "all") {
        const minVal = parseInt(selectedMinScore);
        if (candidate.aiMatchScore < minVal) return false;
      }

      // 11. Current Company Filter
      if (selectedCompany !== "all" && candidate.currentCompany !== selectedCompany) {
        return false;
      }

      // 12. Tag Filter
      if (selectedTag !== "all" && (!candidate.tags || !candidate.tags.includes(selectedTag))) {
        return false;
      }

      // 13. Status Filter
      if (selectedStatus !== "all" && candidate.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [
    candidates, searchQuery, selectedSkill, selectedRole, selectedExperience, 
    selectedLocation, selectedDepartment, selectedEducation, selectedAvailability, 
    selectedNoticePeriod, selectedMinScore, selectedCompany, selectedTag, selectedStatus
  ]);

  // Bulk Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const copy = new Set(selectedIds);
    if (copy.has(id)) {
      copy.delete(id);
    } else {
      copy.add(id);
    }
    setSelectedIds(copy);
  };

  // Row Interactions
  const handleInviteToApply = (candidate: TalentPoolCandidate) => {
    triggerToast(`📩 Invitation to apply dispatched successfully to ${candidate.name} for the active openings.`, "success");
    // Simulate moving status
    setCandidates(prev => prev.map(c => c.candidateId === candidate.candidateId ? { ...c, status: "Contacted" as const } : c));
  };

  const handleSendEmailClick = (candidate: TalentPoolCandidate) => {
    setEmailModalCandidate(candidate);
    const candName = candidate?.name || "Candidate";
    const candSkills = Array.isArray(candidate?.skills) ? candidate.skills : (typeof candidate?.skills === "string" ? String(candidate.skills).split(",") : ["Engineering"]);
    setEmailSubject(`Exploring career opportunities with encureIT — ${candName}`);
    setEmailBody(`Hello ${candName.split(" ")[0]},\n\nWe were highly impressed by your professional profile in our Talent Database. Your skills in ${candSkills.slice(0,3).join(", ")} align perfectly with our ongoing organizational roadmap.\n\nWe would love to schedule a brief call to see if you would be interested in active or future openings with us.\n\nBest Regards,\nAditi Jadhav\nLead Recruiting Admin, encureIT`);
  };

  const handleConfirmSendEmail = () => {
    if (!emailModalCandidate) return;
    triggerToast(`📧 Correspondence successfully sent to ${emailModalCandidate.email}!`, "success");
    setCandidates(prev => prev.map(c => c.candidateId === emailModalCandidate.candidateId ? { ...c, status: "Contacted" as const, lastContacted: new Date().toISOString().split("T")[0] } : c));
    setEmailModalCandidate(null);
  };

  const handleMoveToPipeline = (candidate: TalentPoolCandidate) => {
    triggerToast(`🚀 Candidate ${candidate.name} has been transferred back into the active interview pipeline!`, "success");
    // Simulate removing or changing status
    setCandidates(prev => prev.map(c => c.candidateId === candidate.candidateId ? { ...c, status: "Interested" as const } : c));
  };

  const handleDeleteCandidate = async (id: string, skipConfirm = false) => {
    try {
      await TalentPoolRepository.delete(id);
      await fetchCandidates();
      window.dispatchEvent(new Event("trigger-notification-sync"));
      if (selectedCandidate?.id === id) setSelectedCandidate(null);
      triggerToast("🗑️ Candidate successfully deleted from the Talent Pool database.", "success");
    } catch(err) {
      triggerToast("❌ Failed to delete candidate.", "warning");
    }
  };

  const handleAddNoteToCandidate = (id: string, noteText: string) => {
    if (!noteText.trim()) return;
    setCandidates(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          recruitmentHistory: {
            ...c.recruitmentHistory,
            recruiterNotes: noteText
          }
        };
      }
      return c;
    }));
    triggerToast(`✍️ Recruiter notes updated successfully.`, "success");
    setDrawerNote("");
  };

  const resetFiltersSilent = () => {
    setSearchQuery("");
    setSelectedSkill("all");
    setSelectedRole("all");
    setSelectedExperience("all");
    setSelectedLocation("all");
    setSelectedDepartment("all");
    setSelectedEducation("all");
    setSelectedAvailability("all");
    setSelectedNoticePeriod("all");
    setSelectedMinScore("all");
    setSelectedCompany("all");
    setSelectedTag("all");
    setSelectedStatus("all");
  };

  const handleResetFilters = () => {
    resetFiltersSilent();
    triggerToast("🧹 All search filters have been reset.", "info");
  };

  // Bulk actions operations
  const handleBulkInvite = () => {
    if (selectedIds.size === 0) return;
    triggerToast(`📩 Sent bulk job invitations to ${selectedIds.size} selected candidates.`, "success");
    setCandidates(prev => prev.map(c => selectedIds.has(c.id) ? { ...c, status: "Contacted" as const } : c));
    setSelectedIds(new Set());
  };

  const handleBulkEmail = () => {
    if (selectedIds.size === 0) return;
    triggerToast(`📧 Dispatched campaign correspondence to ${selectedIds.size} selected contacts.`, "success");
    setCandidates(prev => prev.map(c => selectedIds.has(c.id) ? { ...c, status: "Contacted" as const, lastContacted: new Date().toISOString().split("T")[0] } : c));
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async (skipConfirm = false) => {
    if (selectedIds.size === 0) return;
    try {
      await TalentPoolRepository.deleteMultiple(Array.from(selectedIds));
      await fetchCandidates();
      window.dispatchEvent(new Event("trigger-notification-sync"));
      triggerToast(`🗑️ Successfully deleted ${selectedIds.size} candidates from the Talent Pool database.`, "success");
      setSelectedIds(new Set());
    } catch(err) {
      triggerToast("❌ Failed to delete some candidates.", "warning");
    }
  };

  // KPI calculations based on CURRENT state (but seeded to reflect requested metrics gracefully)
  const totalInPool = candidates.length;
  const aiRecommended = candidates.filter(c => c.aiMatchScore >= 90).length;
  const immediateJoiners = candidates.filter(c => c.availability === "Immediate").length;
  const averageMatchScore = Math.round(candidates.reduce((acc, curr) => acc + curr.aiMatchScore, 0) / candidates.length) || 0;

  return (
    <div id="talent-pool-page" className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 transition-colors">
      
      {/* Alert Toast Notification */}
      <AnimatePresence>
        {alertMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-xl border text-xs font-semibold ${
              alertType === "success" 
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300"
                : alertType === "warning"
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300"
                : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40 text-indigo-800 dark:text-indigo-300"
            }`}
          >
            <CheckCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{alertMessage}</span>
            <button onClick={() => setAlertMessage(null)} className="ml-2 hover:opacity-75 cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Info Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-400 mb-1">
            <span>Recruitment</span>
            <span>&gt;</span>
            <span className="font-bold text-slate-600 dark:text-slate-300">Talent Pool</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <Database className="h-6 w-6 text-indigo-600" />
            <span>Talent Pool Repository</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Centralized database of top standby candidates, referrals, and previous high-performers.
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Import Candidates</span>
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10 transition-all"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Candidate</span>
          </button>
        </div>
      </div>

      {/* ==========================================
          TOP SUMMARY CARDS (6 professional KPI cards)
          ========================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Total Talent Pool Candidates */}
        <div 
          onClick={handleResetFilters}
          className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:scale-102 hover:shadow-md ${
            (searchQuery === "" && selectedSkill === "all" && selectedRole === "all" && selectedExperience === "all" && selectedLocation === "all" && selectedDepartment === "all" && selectedEducation === "all" && selectedAvailability === "all" && selectedNoticePeriod === "all" && selectedMinScore === "all" && selectedCompany === "all" && selectedTag === "all" && selectedStatus === "all")
              ? "border-indigo-500 ring-2 ring-indigo-500/15 dark:ring-indigo-500/35 bg-indigo-50/10 dark:bg-indigo-950/10" 
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/60"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Standby Pool</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">{totalInPool}</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Vetted standby profiles</p>
          </div>
        </div>

        {/* 2. AI Recommended Candidates */}
        <div 
          onClick={() => {
            resetFiltersSilent();
            setSelectedMinScore("90");
            setShowAdvancedFilters(true);
            triggerToast("🤖 AI Filter applied: Candidates with Match Score ≥ 90%", "info");
          }}
          className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:scale-102 hover:shadow-md ${
            selectedMinScore === "90"
              ? "border-indigo-500 ring-2 ring-indigo-500/15 dark:ring-indigo-500/35 bg-indigo-50/10 dark:bg-indigo-950/10" 
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/60"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">AI Recommended</span>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">{aiRecommended}</h3>
            <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">Match active openings</p>
          </div>
        </div>

        {/* 3. Immediate Joiners */}
        <div 
          onClick={() => {
            resetFiltersSilent();
            setSelectedAvailability("Immediate");
            setShowAdvancedFilters(true);
            triggerToast("⚡ Availability Filter applied: Immediate Joiners", "info");
          }}
          className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:scale-102 hover:shadow-md ${
            selectedAvailability === "Immediate"
              ? "border-indigo-500 ring-2 ring-indigo-500/15 dark:ring-indigo-500/35 bg-indigo-50/10 dark:bg-indigo-950/10" 
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/60"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Immediate Joiners</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">{immediateJoiners}</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Zero day notice period</p>
          </div>
        </div>

        {/* 4. Recently Added */}
        <div 
          onClick={() => {
            resetFiltersSilent();
            setSelectedStatus("Available");
            triggerToast("📌 Status Filter applied: Available Standby Profiles", "info");
          }}
          className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:scale-102 hover:shadow-md ${
            selectedStatus === "Available"
              ? "border-indigo-500 ring-2 ring-indigo-500/15 dark:ring-indigo-500/35 bg-indigo-50/10 dark:bg-indigo-950/10" 
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/60"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recently Added</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">
              {candidates.filter(c => c.tags && (c.tags.includes("AI Imported") || c.tags.includes("New Profile"))).length}
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Imported recently</p>
          </div>
        </div>

        {/* 5. Contacted This Month */}
        <div 
          onClick={() => {
            resetFiltersSilent();
            setSelectedStatus("Contacted");
            triggerToast("📌 Status Filter applied: Contacted Candidates", "info");
          }}
          className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:scale-102 hover:shadow-md ${
            selectedStatus === "Contacted"
              ? "border-indigo-500 ring-2 ring-indigo-500/15 dark:ring-indigo-500/35 bg-indigo-50/10 dark:bg-indigo-950/10" 
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/60"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Contacted</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">
              {candidates.filter(c => c.status === "Contacted").length}
            </h3>
            <p className="text-[10px] text-indigo-500 font-bold mt-0.5">Vetted standby contacts</p>
          </div>
        </div>

        {/* 6. Average AI Match Score */}
        <div 
          onClick={() => {
            resetFiltersSilent();
            setSelectedMinScore("80");
            setShowAdvancedFilters(true);
            triggerToast("🤖 AI Filter applied: Match Score ≥ 80%", "info");
          }}
          className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:scale-102 hover:shadow-md ${
            selectedMinScore === "80"
              ? "border-indigo-500 ring-2 ring-indigo-500/15 dark:ring-indigo-500/35 bg-indigo-50/10 dark:bg-indigo-950/10" 
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/60"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Match Score</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">{averageMatchScore}%</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">High fit benchmark</p>
          </div>
        </div>
      </div>

      {/* ==========================================
          AI RECOMMENDATIONS & INSIGHTS CAROUSEL
          ========================================== */}
      <div className="bg-indigo-950 text-indigo-100 p-5 rounded-2xl border border-indigo-900 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse shrink-0" />
            <h4 className="font-bold text-sm tracking-tight text-white">Talent AI Co-Pilot Recommendation Engine</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-indigo-300 font-medium">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">🤖</span>
              <span>18 candidates match the active <strong className="text-white">Java Backend Developer</strong> opening.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">🤖</span>
              <span>7 candidates have an elite match score above <strong className="text-white">90%</strong>.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">🤖</span>
              <span>5 candidates are available for immediate joining.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">🤖</span>
              <span>3 candidates have not been contacted in over 90 days.</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => {
            setSelectedSkill("Java");
            setSelectedMinScore("90");
            triggerToast("💡 Filters focused to top matched Java Backend Developers.", "info");
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-950 flex items-center gap-2 shrink-0 self-stretch xl:self-auto justify-center cursor-pointer"
        >
          <span>Invite Recommended Candidates</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ==========================================
          SEARCH & FILTERS
          ========================================== */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Main Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by candidate name, current role, company or primary skills..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 focus:bg-white text-slate-700 dark:text-slate-200"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Tag Filter */}
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">🏷️ Filter by Tag</option>
              {allTagsList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {/* Quick Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">📌 Status: All</option>
              <option value="Available">Available</option>
              <option value="Contacted">Contacted</option>
              <option value="Interested">Interested</option>
              <option value="Not Interested">Not Interested</option>
              <option value="Archived">Archived</option>
            </select>

            {/* Advanced Filters Toggle Button */}
            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                showAdvancedFilters || selectedSkill !== "all" || selectedRole !== "all" || selectedExperience !== "all" || selectedLocation !== "all" || selectedDepartment !== "all" || selectedEducation !== "all" || selectedAvailability !== "all" || selectedNoticePeriod !== "all" || selectedMinScore !== "all" || selectedCompany !== "all"
                  ? "bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Advanced Filters</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} />
            </button>

            {/* Clear Filters Button */}
            {(searchQuery || selectedSkill !== "all" || selectedRole !== "all" || selectedExperience !== "all" || selectedLocation !== "all" || selectedDepartment !== "all" || selectedEducation !== "all" || selectedAvailability !== "all" || selectedNoticePeriod !== "all" || selectedMinScore !== "all" || selectedCompany !== "all" || selectedTag !== "all" || selectedStatus !== "all") && (
              <button 
                onClick={handleResetFilters}
                className="p-2.5 border border-rose-200 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Reset all filters"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Expandable Advanced Filters Grid */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-100 dark:border-slate-800 pt-4"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                
                {/* 1. Skill */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Primary Skills</label>
                  <select 
                    value={selectedSkill} 
                    onChange={(e) => setSelectedSkill(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Skills</option>
                    {allSkillsList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* 2. Job Role */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Job Role</label>
                  <select 
                    value={selectedRole} 
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Roles</option>
                    {allRolesList.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* 3. Experience */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Experience</label>
                  <select 
                    value={selectedExperience} 
                    onChange={(e) => setSelectedExperience(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Experience</option>
                    <option value="fresher">Fresher (&lt; 1 yr)</option>
                    <option value="1-3">1 - 3 Years</option>
                    <option value="3-5">3 - 5 Years</option>
                    <option value="5+">5+ Years</option>
                  </select>
                </div>

                {/* 4. Location */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Location</label>
                  <select 
                    value={selectedLocation} 
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Locations</option>
                    {allLocationsList.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {/* 5. Department */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Department</label>
                  <select 
                    value={selectedDepartment} 
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Depts</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="QA">QA</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                {/* 6. Education */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Education</label>
                  <select 
                    value={selectedEducation} 
                    onChange={(e) => setSelectedEducation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Degrees</option>
                    <option value="B.Tech">B.Tech</option>
                    <option value="MCA">MCA</option>
                    <option value="BSc">BSc</option>
                    <option value="MS">MS</option>
                    <option value="MBA">MBA</option>
                  </select>
                </div>

                {/* 7. Availability */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Availability</label>
                  <select 
                    value={selectedAvailability} 
                    onChange={(e) => setSelectedAvailability(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Availability</option>
                    <option value="Immediate">Immediate</option>
                    <option value="15 days">15 Days</option>
                    <option value="30 days">30 Days</option>
                    <option value="60 days">60 Days</option>
                    <option value="90 days">90 Days</option>
                  </select>
                </div>

                {/* 8. Notice Period */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Notice Period</label>
                  <select 
                    value={selectedNoticePeriod} 
                    onChange={(e) => setSelectedNoticePeriod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Notice Periods</option>
                    <option value="Immediate">Immediate</option>
                    <option value="15 Days">15 Days</option>
                    <option value="1 Month">1 Month</option>
                    <option value="2 Months">2 Months</option>
                    <option value="3 Months">3 Months</option>
                  </select>
                </div>

                {/* 9. AI Score */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Min AI Score</label>
                  <select 
                    value={selectedMinScore} 
                    onChange={(e) => setSelectedMinScore(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Scores</option>
                    <option value="90">&gt; 90% Match</option>
                    <option value="80">&gt; 80% Match</option>
                    <option value="70">&gt; 70% Match</option>
                  </select>
                </div>

                {/* 10. Current Company */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Current Company</label>
                  <select 
                    value={selectedCompany} 
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Companies</option>
                    {allCompaniesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ==========================================
          BULK / QUICK ACTIONS BAR (Only shows when checkboxes are selected)
          ========================================== */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="p-3.5 bg-slate-900 text-white rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-3 border border-slate-800"
          >
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
              <span className="text-xs font-bold font-mono text-indigo-300">{selectedIds.size} Candidates Selected</span>
            </div>
            
            <div className="flex items-center gap-2.5 flex-wrap">
              <button 
                onClick={handleBulkInvite}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-md flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Invite to Apply</span>
              </button>
              
              <button 
                onClick={handleBulkEmail}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-md flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Send Bulk Email</span>
              </button>

              <button 
                onClick={() => {
                  triggerToast(`🏷️ Added tag "Talent Standby" to ${selectedIds.size} candidates.`, "success");
                  setSelectedIds(new Set());
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-md flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700"
              >
                <Tag className="h-3.5 w-3.5" />
                <span>Add Tags</span>
              </button>

              <button 
                onClick={() => {
                  triggerToast(`🚀 Forwarded ${selectedIds.size} candidates to Engineering recruitment loop.`, "success");
                  setSelectedIds(new Set());
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-md flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700"
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>Move to Pipeline</span>
              </button>

              <button 
                onClick={() => {
                  triggerToast(`📊 Exported ${selectedIds.size} detailed profiles to Excel/CSV.`, "info");
                  setSelectedIds(new Set());
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-md flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Profiles</span>
              </button>

              {isPendingBulkDelete ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-rose-300 font-bold px-1.5">Are you sure?</span>
                  <button 
                    onClick={() => {
                      handleBulkDelete(true);
                      setIsPendingBulkDelete(false);
                    }}
                    className="px-2.5 py-1.5 bg-rose-600 text-white hover:bg-rose-700 text-[11px] font-bold rounded-md flex items-center gap-1 cursor-pointer transition-all"
                  >
                    Yes
                  </button>
                  <button 
                    onClick={() => setIsPendingBulkDelete(false)}
                    className="px-2.5 py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px] font-bold rounded-md flex items-center gap-1 cursor-pointer transition-all border border-slate-700"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsPendingBulkDelete(true)}
                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900 text-rose-300 text-[11px] font-bold rounded-md flex items-center gap-1.5 cursor-pointer transition-all border border-rose-900/35"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete ({selectedIds.size})</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MAIN TALENT TABLE & INTERACTIVE GRID
          ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-xs overflow-hidden">
        {filteredCandidates.length === 0 ? (
          /* Empty State */
          <div className="p-16 text-center max-w-md mx-auto space-y-4">
            <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-slate-100 dark:border-slate-700 shadow-inner">
              <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-500" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">No candidates available in the Talent Pool</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Candidates can be added after interviews or imported by recruiters. Use different keywords or clear the search criteria to explore.
              </p>
            </div>
            <div className="flex justify-center gap-2.5 pt-2">
              <button 
                onClick={handleResetFilters}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-lg cursor-pointer transition-all text-slate-700 dark:text-slate-300"
              >
                Clear Search Criteria
              </button>
              <button 
                onClick={() => triggerToast("🚀 Launching candidate upload module...", "info")}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all"
              >
                Import Candidate CV
              </button>
            </div>
          </div>
        ) : (
          /* High Fidelity Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-950/30 text-slate-400 dark:text-slate-500 text-[10.5px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/50">
                  <th className="px-5 py-3 w-10 text-center">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                    />
                  </th>
                  <th className="px-5 py-3.5">Candidate Name</th>
                  <th className="px-5 py-3.5">Current Role & Company</th>
                  <th className="px-5 py-3.5">Experience</th>
                  <th className="px-5 py-3.5">Primary Skills</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5 text-center">AI Fit Score</th>
                  <th className="px-5 py-3.5">Availability</th>
                  <th className="px-5 py-3.5">Last Active</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs font-medium text-slate-700 dark:text-slate-300">
                {filteredCandidates.map((candidate, idx) => {
                  const isChecked = selectedIds.has(candidate.candidateId);
                  return (
                    <tr 
                      key={`${candidate.candidateId || candidate.id || 'cand'}-${idx}`}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors ${
                        isChecked ? "bg-indigo-50/20 dark:bg-indigo-950/10" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-5 py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleSelectOne(candidate.candidateId)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Candidate Name */}
                      <td className="px-5 py-4">
                        <div 
                          onClick={() => setSelectedCandidate(candidate)}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <div className="h-8.5 w-8.5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 text-xs shadow-inner">
                            {candidate.name?.split(" ").map(n => n[0]).join("") || ""}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-xs">
                              {candidate.name}
                            </p>
                            <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">{candidate.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Current Role */}
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-slate-850 dark:text-slate-200 font-bold">{candidate.currentRole || "Candidate"}</p>
                          <p className="text-[10.5px] text-slate-400 mt-0.5">{candidate.currentCompany || "Not specified"}</p>
                          {(candidate.recruitmentHistory?.appliedJob || candidate.recruitmentHistory?.previousRole) && (
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 truncate max-w-[160px]">
                                Prev Role: {candidate.recruitmentHistory.previousRole || candidate.recruitmentHistory.appliedJob}
                              </span>
                              {(candidate.recruitmentHistory?.previousStatus === "Rejected" || candidate.recruitmentHistory?.previousStage === "Rejected") && (
                                <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                                  Rejected ({candidate.recruitmentHistory?.previousAtsScore ?? candidate.recruitmentHistory?.atsScore ?? candidate.aiMatchScore}% Score)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Experience */}
                      <td className="px-5 py-4 font-mono text-slate-900 dark:text-slate-100 font-bold">
                        {candidate.experienceYears} Years
                      </td>

                      {/* Primary Skills */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(() => {
                            const skillsArr = Array.isArray(candidate.skills) ? candidate.skills : (typeof candidate.skills === "string" ? String(candidate.skills).split(",") : []);
                            return (
                              <>
                                {skillsArr.slice(0, 3).map((skill: string, index: number) => (
                                  <span 
                                    key={index}
                                    className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 rounded font-mono border border-slate-200/50 dark:border-slate-700/50"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {skillsArr.length > 3 && (
                                  <span className="text-[10px] font-extrabold text-indigo-500 font-mono ml-0.5">
                                    +{skillsArr.length - 3}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>{candidate.location}</span>
                        </div>
                      </td>

                      {/* AI Match Score */}
                      <td className="px-5 py-4 text-center">
                        <div className="inline-block px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 font-black font-mono text-xs text-indigo-600 dark:text-indigo-400">
                          {candidate.aiMatchScore}%
                        </div>
                      </td>

                      {/* Availability */}
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          candidate.availability === "Immediate" 
                            ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        }`}>
                          {candidate.availability}
                        </span>
                      </td>

                      {/* Last Contacted */}
                      <td className="px-5 py-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono">
                        {candidate.lastContacted}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider ${
                          candidate.status === "Available"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                            : candidate.status === "Contacted"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                            : candidate.status === "Interested"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-900"
                            : candidate.status === "Not Interested"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {candidate.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => setSelectedCandidate(candidate)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all cursor-pointer"
                            title="View Profile Drawer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          
                          <button 
                            onClick={() => handleInviteToApply(candidate)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md transition-all cursor-pointer"
                            title="Invite to Apply"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>

                          <button 
                            onClick={() => handleSendEmailClick(candidate)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all cursor-pointer"
                            title="Send Email"
                          >
                            <Mail className="h-4 w-4" />
                          </button>

                          <button 
                            onClick={() => handleMoveToPipeline(candidate)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all cursor-pointer"
                            title="Move to Active Pipeline"
                          >
                            <Briefcase className="h-4 w-4" />
                          </button>

                          {candIdPendingDelete === candidate.candidateId ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCandidate(candidate.candidateId, true);
                                  setCandIdPendingDelete(null);
                                }}
                                className="px-2 py-1 text-[10px] font-bold bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-all cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCandIdPendingDelete(null);
                                }}
                                className="px-2 py-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setCandIdPendingDelete(candidate.candidateId);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all cursor-pointer"
                              title="Delete Candidate"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==========================================
          CANDIDATE PROFILE DRAWER (Right-side drawer)
          ========================================== */}
      <AnimatePresence>
        {selectedCandidate && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCandidate(null)}
              className="fixed inset-0 bg-slate-950 z-50 backdrop-blur-xs"
            />

            {/* Drawer Panel */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-screen w-full sm:w-130 md:w-160 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-50 shadow-2xl flex flex-col overflow-hidden text-left"
            >
              
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Database className="h-4.5 w-4.5 text-indigo-600" />
                  <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Talent Database Dossier</span>
                </div>
                <button 
                  onClick={() => setSelectedCandidate(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-7">
                
                {/* 1. Personal Information */}
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <div className="h-16 w-16 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0">
                    {selectedCandidate.name?.split(" ").map(n => n[0]).join("") || ""}
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{selectedCandidate.name}</h3>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                      <span>{selectedCandidate.currentRole} at <strong className="text-indigo-600 dark:text-indigo-400">{selectedCandidate.currentCompany}</strong></span>
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 font-mono mt-1">
                      <span className="flex items-center gap-1">✉️ {selectedCandidate.email}</span>
                      <span className="flex items-center gap-1">📞 {selectedCandidate.phone}</span>
                      <span className="flex items-center gap-1">📍 {selectedCandidate.location}</span>
                    </div>
                  </div>
                  <div className="inline-block px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl font-black font-mono text-sm text-indigo-600 dark:text-indigo-400 self-start">
                    AI: {selectedCandidate.aiMatchScore}%
                  </div>
                </div>

                {/* Tags block inside drawer */}
                <div className="flex flex-wrap gap-1.5">
                  {(selectedCandidate.tags || []).map((tag: string, idx: number) => (
                    <span 
                      key={`tag-${tag}-${idx}`}
                      className="px-2.5 py-1 bg-indigo-50/50 dark:bg-indigo-950/30 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-100 dark:border-indigo-900"
                    >
                      🏷️ {tag}
                    </span>
                  ))}
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                {/* 2. Professional Summary */}
                <div className="space-y-2">
                  <h4 className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                    <span>Aura AI Professional Summary</span>
                  </h4>
                  <div className="p-4 bg-purple-50/40 dark:bg-purple-950/10 border border-purple-100/50 dark:border-purple-900/35 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "{selectedCandidate.aiSummary || selectedCandidate.resumeText || "No summary available."}"
                  </div>
                </div>

                {/* 3. Skills */}
                <div className="space-y-2">
                  <h4 className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Candidate Skill Matrix</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      const skillsArr = Array.isArray(selectedCandidate.skills) ? selectedCandidate.skills : (typeof selectedCandidate.skills === "string" ? String(selectedCandidate.skills).split(",") : []);
                      return skillsArr.map((skill: string, idx: number) => (
                        <span 
                          key={`talent-skill-${idx}`}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-lg font-mono border border-slate-200/60 dark:border-slate-700/60"
                        >
                          {skill}
                        </span>
                      ));
                    })()}
                  </div>
                </div>

                {/* 4. Experience & Education & Projects */}
                <div className="space-y-4">
                  <h4 className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Experience & Credentials</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* General Bio Info */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <Award className="h-4 w-4 text-slate-400" />
                        <span>Experience Metrics</span>
                      </div>
                      <div className="text-[11px] space-y-1 text-slate-500 font-medium">
                        <p>Total Experience: <strong className="text-slate-800 dark:text-white font-bold">{selectedCandidate.experienceYears || 0} Years</strong></p>
                        <p>Availability: <strong className="text-slate-800 dark:text-white font-bold">{selectedCandidate.availability || "Immediate"}</strong></p>
                        <p>Notice Period: <strong className="text-slate-800 dark:text-white font-bold">{selectedCandidate.noticePeriod || "30 Days"}</strong></p>
                      </div>
                    </div>

                    {/* Education */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <BookOpen className="h-4 w-4 text-slate-400" />
                        <span>Education Profile</span>
                      </div>
                      <div className="text-[11px] space-y-1 text-slate-500 font-medium">
                        <p>Degree: <strong className="text-slate-800 dark:text-white font-bold">{selectedCandidate.education?.degree || "B.Tech"}</strong></p>
                        <p>Specialization: <strong className="text-slate-800 dark:text-white font-bold">{selectedCandidate.education?.specialization || "Computer Science"}</strong></p>
                        <p>Passing Year: <strong className="text-slate-800 dark:text-white font-bold">{selectedCandidate.education?.passingYear || "2022"}</strong></p>
                        <p className="truncate">University: <strong className="text-slate-800 dark:text-white font-bold">{selectedCandidate.education?.university || "State University"}</strong></p>
                      </div>
                    </div>
                  </div>

                  {/* Certifications */}
                  {(selectedCandidate.certifications || []).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-400">Professional Certifications</p>
                      <div className="flex flex-col gap-1 text-xs">
                        {(selectedCandidate.certifications || []).map((cert: string, idx: number) => (
                          <div key={`cert-${cert}-${idx}`} className="flex items-center gap-2 text-slate-650 dark:text-slate-350">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span>{cert}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Featured Projects */}
                  {(selectedCandidate.projects || []).length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[11px] font-bold text-slate-400">Key Projects Worked On</p>
                      <div className="space-y-2">
                        {(selectedCandidate.projects || []).map((proj: any, idx: number) => (
                          <div key={`proj-${proj?.name || idx}-${idx}`} className="p-3 bg-slate-50/50 dark:bg-slate-950/10 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px]">
                            <p className="font-extrabold text-slate-800 dark:text-white">{proj.name}</p>
                            <p className="text-slate-400 mt-1 leading-relaxed">{proj.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                {/* 5. Recruitment History */}
                <div className="space-y-3.5">
                  <h4 className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Historical Archive & Feedback</span>
                  </h4>

                  <div className="space-y-3 text-xs leading-relaxed">
                    <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div>
                        <p className="text-[9.5px] font-bold text-slate-400 uppercase">PREVIOUS ROLE</p>
                        <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          {selectedCandidate.recruitmentHistory?.previousRole || selectedCandidate.recruitmentHistory?.appliedJob || selectedCandidate.appliedJob || "Job Opening"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9.5px] font-bold text-slate-400 uppercase">PREVIOUS ATS SCORE</p>
                        <p className="font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                          {selectedCandidate.recruitmentHistory?.previousAtsScore ?? selectedCandidate.recruitmentHistory?.atsScore ?? selectedCandidate.aiMatchScore ?? "—"}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[9.5px] font-bold text-slate-400 uppercase">PREVIOUS STATUS</p>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 mt-0.5">
                          {selectedCandidate.recruitmentHistory?.previousStatus || selectedCandidate.recruitmentHistory?.previousStage || "Rejected"}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-850/80 space-y-1.5">
                      <p className="text-[9.5px] font-black text-indigo-500 uppercase tracking-wider font-mono">Last Interview Feedback</p>
                      <p className="text-slate-650 dark:text-slate-350 italic">"{selectedCandidate.recruitmentHistory?.interviewFeedback || "Profile archived for talent pool."}"</p>
                      <p className="text-[10px] text-slate-400 mt-1 block">
                        Reason for not selecting: <strong className="text-slate-600 dark:text-slate-300 font-bold">{selectedCandidate.recruitmentHistory?.notSelectedReason || "Pool Reserve / On Hold"}</strong>
                      </p>
                    </div>

                    {/* Active Recruiter Notes Block */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400">RECRUITER EVALUATION NOTES</p>
                      <div className="p-3 bg-indigo-50/15 dark:bg-indigo-950/10 border border-indigo-100/30 rounded-xl text-slate-700 dark:text-slate-300">
                        {selectedCandidate.recruitmentHistory?.recruiterNotes ? (
                          <p>{selectedCandidate.recruitmentHistory.recruiterNotes}</p>
                        ) : (
                          <p className="text-slate-400 italic">No notes currently saved for this candidate.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add New Recruiter Note */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Add Recruiter Standby Note</label>
                  <div className="flex gap-2.5 mt-1.5">
                    <input 
                      type="text" 
                      placeholder="e.g. Recommended to call for upcoming Senior PM opening next week..." 
                      value={drawerNote}
                      onChange={(e) => setDrawerNote(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden"
                    />
                    <button 
                      onClick={() => handleAddNoteToCandidate(selectedCandidate.id, drawerNote)}
                      className="px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
                    >
                      <Send className="h-3 w-3" />
                      <span>Save Note</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-between items-center shrink-0">
                {drawerDeletePending ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        handleDeleteCandidate(selectedCandidate.id, true);
                        setDrawerDeletePending(false);
                      }}
                      className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-rose-700 transition-all uppercase tracking-wide"
                    >
                      Confirm
                    </button>
                    <button 
                      onClick={() => setDrawerDeletePending(false)}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-all uppercase tracking-wide"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setDrawerDeletePending(true)}
                    className="px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 text-xs font-bold rounded-lg cursor-pointer transition-all uppercase tracking-wide"
                  >
                    Delete Standby
                  </button>
                )}
                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={() => {
                      handleSendEmailClick(selectedCandidate);
                      setSelectedCandidate(null);
                    }}
                    className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition-all"
                  >
                    Send Email Correspondence
                  </button>
                  <button 
                    onClick={() => {
                      handleInviteToApply(selectedCandidate);
                      setSelectedCandidate(null);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-md shadow-indigo-600/15"
                  >
                    Invite to Apply
                  </button>
                </div>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ==========================================
          EMAIL CORRESPONDENCE MODAL
          ========================================== */}
      <AnimatePresence>
        {emailModalCandidate && (
          <>
            {/* Modal Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setEmailModalCandidate(null)}
              className="fixed inset-0 bg-slate-950 z-[999] backdrop-blur-xs"
            />

            {/* Modal Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 z-[1000] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Mail className="h-4.5 w-4.5 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white">Aura Outreach Correspondence Composer</span>
                </div>
                <button onClick={() => setEmailModalCandidate(null)} className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate Recipient</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{emailModalCandidate.name} ({emailModalCandidate.email})</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject Line</label>
                  <input 
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Body</label>
                  <textarea 
                    rows={8}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-hidden resize-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button 
                  onClick={() => setEmailModalCandidate(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmSendEmail}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Correspondence</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ==========================================
          ADD CANDIDATE MODAL
          ========================================== */}
      <AnimatePresence>
        {isAddModalOpen && (
          <>
            {/* Modal Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-slate-950 z-[999] backdrop-blur-xs"
            />

            {/* Modal Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 z-[1000] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4.5 w-4.5 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Add Standby Candidate to Talent Pool</span>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-650 cursor-pointer">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <form onSubmit={handleAddCandidateSubmit} className="flex flex-col overflow-hidden">
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                  
                  {/* Basic Personal Info */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">1. Personal Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Full Name *</label>
                        <input 
                          type="text"
                          required
                          value={newCandidateForm.name}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. Priya Nair"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Email Address *</label>
                        <input 
                          type="email"
                          required
                          value={newCandidateForm.email}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="e.g. priya.nair@example.com"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Phone Number</label>
                        <input 
                          type="text"
                          value={newCandidateForm.phone}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="e.g. +91 98765 43210"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Location</label>
                        <input 
                          type="text"
                          value={newCandidateForm.location}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="e.g. Pune, Bangalore, Remote"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Professional Background */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">2. Professional Background</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Current Role / Title *</label>
                        <input 
                          type="text"
                          required
                          value={newCandidateForm.currentRole}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, currentRole: e.target.value }))}
                          placeholder="e.g. Senior Frontend Developer"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Current Company</label>
                        <input 
                          type="text"
                          value={newCandidateForm.currentCompany}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, currentCompany: e.target.value }))}
                          placeholder="e.g. TechCorp India"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Department</label>
                        <select 
                          value={newCandidateForm.department}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, department: e.target.value as any }))}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-700 dark:text-slate-200"
                        >
                          <option value="Engineering">Engineering</option>
                          <option value="Product">Product</option>
                          <option value="QA">QA</option>
                          <option value="Operations">Operations</option>
                          <option value="Design">Design</option>
                          <option value="Sales">Sales</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Experience (Years)</label>
                        <input 
                          type="number"
                          step="0.1"
                          value={newCandidateForm.experienceYears}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, experienceYears: e.target.value }))}
                          placeholder="e.g. 4.5"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Availability</label>
                        <select 
                          value={newCandidateForm.availability}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, availability: e.target.value as any }))}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-700 dark:text-slate-200"
                        >
                          <option value="Immediate">Immediate</option>
                          <option value="15 days">15 days</option>
                          <option value="30 days">30 days</option>
                          <option value="60 days">60 days</option>
                          <option value="90 days">90 days</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Notice Period</label>
                        <select 
                          value={newCandidateForm.noticePeriod}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, noticePeriod: e.target.value as any }))}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-700 dark:text-slate-200"
                        >
                          <option value="Immediate">Immediate</option>
                          <option value="15 Days">15 Days</option>
                          <option value="1 Month">1 Month</option>
                          <option value="2 Months">2 Months</option>
                          <option value="3 Months">3 Months</option>
                        </select>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Skills (Comma-separated)</label>
                        <input 
                          type="text"
                          value={newCandidateForm.skillsString}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, skillsString: e.target.value }))}
                          placeholder="e.g. React, Node.js, GraphQL, TypeScript"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Credentials / Education & Match */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">3. Education & Matching</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Degree</label>
                        <input 
                          type="text"
                          value={newCandidateForm.degree}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, degree: e.target.value }))}
                          placeholder="e.g. B.Tech / MCA / MS"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">University</label>
                        <input 
                          type="text"
                          value={newCandidateForm.university}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, university: e.target.value }))}
                          placeholder="e.g. Pune University"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">AI Fit Match Score (50-100)</label>
                        <input 
                          type="number"
                          min="50"
                          max="100"
                          value={newCandidateForm.aiMatchScore}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, aiMatchScore: e.target.value }))}
                          placeholder="e.g. 89"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Tags (Comma-separated)</label>
                        <input 
                          type="text"
                          value={newCandidateForm.tagsString}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, tagsString: e.target.value }))}
                          placeholder="e.g. Immediate Joiner, High Potential"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Aura AI Candidate Professional Summary</label>
                        <textarea 
                          rows={2}
                          value={newCandidateForm.aiSummary}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, aiSummary: e.target.value }))}
                          placeholder="e.g. High performing Frontend Specialist with strong design chops and experience with Tailwind and responsive modules."
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-hidden resize-none text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recruitment History Details */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">4. Past Interview Records</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Previously Applied Job</label>
                        <input 
                          type="text"
                          value={newCandidateForm.appliedJob}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, appliedJob: e.target.value }))}
                          placeholder="e.g. Lead UI Specialist"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Previous Best Stage Reached</label>
                        <input 
                          type="text"
                          value={newCandidateForm.previousStage}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, previousStage: e.target.value }))}
                          placeholder="e.g. Technical Round 3 / Director Round"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Interview Feedback Highlights</label>
                        <input 
                          type="text"
                          value={newCandidateForm.interviewFeedback}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, interviewFeedback: e.target.value }))}
                          placeholder="e.g. Strong coder, very collaborative, passed the whiteboard challenge easily."
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Reason for not selecting *</label>
                        <input 
                          type="text"
                          value={newCandidateForm.notSelectedReason}
                          onChange={(e) => setNewCandidateForm(prev => ({ ...prev, notSelectedReason: e.target.value }))}
                          placeholder="e.g. Team size cap reached / Candidate decided to wait / Role hold"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add to Talent Pool</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ==========================================
          IMPORT CANDIDATES MODAL (Drag & Drop)
          ========================================== */}
      <AnimatePresence>
        {isImportModalOpen && (
          <>
            {/* Modal Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isImporting) setIsImportModalOpen(false);
              }}
              className="fixed inset-0 bg-slate-950 z-[999] backdrop-blur-xs"
            />

            {/* Modal Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 z-[1000] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Download className="h-4.5 w-4.5 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Aura AI Candidate Importer</span>
                </div>
                {!isImporting && (
                  <button onClick={() => setIsImportModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-650 cursor-pointer">
                    <X className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>

              <div className="p-6 space-y-4">
                {isImporting ? (
                  // Loading progress state
                  <div className="py-10 text-center space-y-5">
                    <div className="relative h-16 w-16 mx-auto">
                      {/* Spinners */}
                      <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-850" />
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                      <div className="absolute inset-2 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center font-bold text-xs text-indigo-600">
                        {importProgress}%
                      </div>
                    </div>
                    <div className="space-y-1.5 max-w-xs mx-auto">
                      <p className="text-xs font-black text-slate-900 dark:text-white">{importStatus}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Parsing file: {importFile?.name}</p>
                    </div>
                    {/* Simulated progress track */}
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-800/50">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                        animate={{ width: `${importProgress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                  </div>
                ) : (
                  // File Select drag & drop block
                  <div className="space-y-4 text-center">
                    <div 
                      onDragEnter={handleImportDrag}
                      onDragOver={handleImportDrag}
                      onDragLeave={handleImportDrag}
                      onDrop={handleImportDrop}
                      className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-all ${
                        importDragActive 
                          ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 scale-98" 
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 hover:border-indigo-400"
                      }`}
                    >
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-full shadow-xs border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500">
                        <UploadCloud className="h-6 w-6 text-indigo-600" />
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white">Drag and drop candidate CV here</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Supports PDF, DOCX, TXT up to 10MB</p>
                      </div>

                      <div className="flex items-center gap-2 w-full py-2">
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                        <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest">or browse</span>
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                      </div>

                      <label className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-slate-800 transition-all shadow-sm">
                        <span>Select Resume File</span>
                        <input 
                          type="file"
                          accept=".pdf,.docx,.txt"
                          onChange={handleImportFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Pro tips or features inside importer */}
                    <div className="p-3.5 bg-indigo-950 text-indigo-200 rounded-xl border border-indigo-900 text-left space-y-1.5">
                      <p className="text-[10.5px] font-black text-white flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                        <span>Aura Intelligent Parser Features</span>
                      </p>
                      <ul className="text-[10px] list-disc list-inside space-y-0.5 text-indigo-300 font-medium">
                        <li>Automatic NER extraction (Names, Locations, Emails, Phones)</li>
                        <li>Dynamic Skill Matrix & Projects categorization mapping</li>
                        <li>Generates concise, neutral AI Match benchmark profiles</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {!isImporting && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                  <button 
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
