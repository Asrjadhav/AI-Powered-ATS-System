/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalStorageService } from "../services/localStorageService";
import { generateId, assignSequentialCandidateIds } from "./repositoryUtils";

const DEFAULT_TALENT_POOL = [
  {
    id: "CAND-001",
    candidateId: "CAND-001",
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
    aiSummary: "Senior Java Developer with 6+ years of specialized experience in high-throughput microservices architectures.",
    certifications: ["Oracle Certified Professional Java SE 11 Developer"],
    projects: [{ name: "Global Ledger Engine", description: "Led a backend modernization project reducing API latency." }],
    recruitmentHistory: {
      appliedJob: "Lead Backend Architect",
      previousStage: "Director Round / Final Interview",
      interviewFeedback: "Strong architecture skills, very articulate.",
      notSelectedReason: "Budget Constraints",
      recruiterNotes: "Kept on warm candidate standby."
    }
  },
  {
    id: "CAND-002",
    candidateId: "CAND-002",
    name: "Riya Patel",
    email: "riya.patel@webscale.io",
    phone: "+91 87654 32109",
    currentRole: "Frontend Engineer",
    currentCompany: "WebScale Solutions",
    skills: ["React", "TypeScript", "Tailwind CSS", "Redux", "Vite", "Next.js"],
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
    aiSummary: "Product-focused Frontend Developer with 3+ years of experience delivering pixel-perfect React applications.",
    certifications: ["Frontend Specialist Certification"],
    projects: [{ name: "HR Dashboard System", description: "Developed custom modular enterprise dashboard component framework." }],
    recruitmentHistory: {
      appliedJob: "Senior UI Developer",
      previousStage: "Technical Round 2",
      interviewFeedback: "Great code quality and state handling.",
      notSelectedReason: "Position On Hold",
      recruiterNotes: "Eager to join."
    }
  },
  {
    id: "CAND-003",
    candidateId: "CAND-003",
    name: "Ananya Iyer",
    email: "ananya.iyer@fintechpro.com",
    phone: "+91 91234 56789",
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
    aiSummary: "Analytical Data Analyst and Scientist with an exceptional background in financial credit scoring models.",
    certifications: ["Professional Data Engineer"],
    projects: [{ name: "Fraud Detection Engine", description: "Trained XGBoost models to identify suspicious credit profiles." }],
    recruitmentHistory: {
      appliedJob: "Lead AI Scientist",
      previousStage: "Final Presentation",
      interviewFeedback: "Strong analytical thinking.",
      notSelectedReason: "Lacked distributed platform hosting skills",
      recruiterNotes: "Keep on file."
    }
  },
  {
    id: "CAND-004",
    candidateId: "CAND-004",
    name: "Rohan Deshmukh",
    email: "rohan.d@enterprisecore.org",
    phone: "+91 94220 12345",
    currentRole: "QA Automation Lead",
    currentCompany: "EnterpriseCore Software",
    skills: ["Selenium", "Java", "Cypress", "Postman", "CI/CD", "Jira"],
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
      specialization: "Electronics",
      passingYear: "2020",
      university: "COEP Pune"
    },
    tags: ["Immediate Joiner", "Leadership"],
    aiSummary: "Automated testing expert with deep background in regression suites.",
    certifications: ["ISTQB Certified Tester"],
    projects: [{ name: "QA Grid Automation", description: "Decreased CI validation loop timings." }],
    recruitmentHistory: {
      appliedJob: "QA Director",
      previousStage: "Management Round",
      interviewFeedback: "Brilliant engineer.",
      notSelectedReason: "Headcount Frozen",
      recruiterNotes: "Hire immediately when headcount opens."
    }
  },
  {
    id: "CAND-005",
    candidateId: "CAND-005",
    name: "Sneha Reddy",
    email: "sneha.reddy@saasventures.com",
    phone: "+91 76543 21098",
    currentRole: "Product Manager",
    currentCompany: "SaaS Ventures",
    skills: ["Product Strategy", "Agile", "User Research", "Figma", "Mixpanel"],
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
      specialization: "Product Management",
      passingYear: "2022",
      university: "IIM Bangalore"
    },
    tags: ["Leadership", "Referral"],
    aiSummary: "SaaS-oriented Product Manager bridging engineering and customer research.",
    certifications: ["Pragmatic Certified Product Manager"],
    projects: [{ name: "Self-Serve Portal", description: "Designed self-serve billing flow." }],
    recruitmentHistory: {
      appliedJob: "Senior PM",
      previousStage: "Case Review",
      interviewFeedback: "Excellent customer strategy.",
      notSelectedReason: "Role requirements",
      recruiterNotes: "Strong candidate."
    }
  },
  {
    id: "CAND-006",
    candidateId: "CAND-006",
    name: "Pooja Hegde",
    email: "pooja.hegde@dataworks.co",
    phone: "+91 81234 56780",
    currentRole: "Lead Data Engineer",
    currentCompany: "DataWorks Systems",
    skills: ["Apache Spark", "Python", "SQL", "Snowflake", "Kafka"],
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
    tags: ["Leadership", "Data Engineer"],
    aiSummary: "Distinguished data platform architect with 7+ years constructing petabyte-scale pipeline architectures.",
    certifications: ["Databricks Certified Associate"],
    projects: [{ name: "Corporate Data Warehouse", description: "Configured multi-tenant Snowflake server." }],
    recruitmentHistory: {
      appliedJob: "Data Platform Director",
      previousStage: "Executive Panel",
      interviewFeedback: "Incredibly bright, spectacular platform mastery.",
      notSelectedReason: "Long Notice Period",
      recruiterNotes: "Stellar talent."
    }
  }
];

export const TalentPoolRepository = {
  async getTotal(): Promise<number> {
    const list = await this.getAll();
    return list.length;
  },

  async getAll(): Promise<any[]> {
    const storedPool = LocalStorageService.get<any[]>("talentPool", []);
    const storedCandidates = LocalStorageService.get<any[]>("candidates", []);

    // Clean and validate stored pool
    let validPool = Array.isArray(storedPool) ? storedPool.filter((t: any) => t && (t.name || t.email || t.currentRole)) : [];
    if (validPool.length === 0) {
      validPool = DEFAULT_TALENT_POOL;
    }

    // Also sync candidates from candidates table so any newly added candidate is also visible in talent pool
    const poolEmails = new Set(validPool.map((p: any) => (p.email || "").toLowerCase().trim()));
    for (const c of storedCandidates) {
      if (!c) continue;
      const cEmail = (c.email || "").toLowerCase().trim();
      const cName = c.name || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Candidate";
      if (cEmail && !poolEmails.has(cEmail)) {
        validPool.push({
          id: c.id || c.candidateId || `CAND-${validPool.length + 1}`,
          candidateId: c.candidateId || c.id || `CAND-${validPool.length + 1}`,
          name: cName,
          email: c.email || "candidate@email.com",
          phone: c.phone || "+91 99999 99999",
          currentRole: c.currentRole || c.role || "Software Engineer",
          currentCompany: c.currentCompany || "Company",
          skills: c.skills || ["React", "TypeScript"],
          experienceYears: Number(c.experienceYears) || 3,
          location: c.location || "Pune, India",
          aiMatchScore: Number(c.aiMatchScore || c.atsScore || c.aiScore || 85),
          availability: c.availability || "Immediate",
          noticePeriod: c.noticePeriod || "Immediate",
          lastContacted: c.lastContacted || new Date().toISOString().split("T")[0],
          status: c.status || "Available",
          department: c.department || "Engineering",
          education: c.education || { degree: "B.Tech", specialization: "Computer Science", passingYear: "2023", university: "University" },
          tags: c.tags || ["Talent Pool"],
          aiSummary: c.aiSummary || "Vetted candidate profile.",
          certifications: c.certifications || [],
          projects: c.projects || [],
          recruitmentHistory: c.recruitmentHistory || { appliedJob: "General Pool", previousStage: "Sourced", interviewFeedback: "Profile added.", notSelectedReason: "None", recruiterNotes: "Auto-synced from candidate database." }
        });
        poolEmails.add(cEmail);
      }
    }

    const sequenced = assignSequentialCandidateIds(validPool);
    LocalStorageService.set("talentPool", sequenced);
    return sequenced;
  },

  async getById(id: string): Promise<any | null> {
    const list = await this.getAll();
    return list.find(c => c.id === id || c.candidateId === id) || null;
  },

  async create(payload: any): Promise<any> {
    const list = await this.getAll();
    const now = new Date().toISOString();
    const nextNum = list.length + 1;
    const newItem = {
      id: payload.id && String(payload.id).startsWith("CAND-") ? payload.id : `CAND-${String(nextNum).padStart(3, '0')}`,
      candidateId: payload.candidateId && String(payload.candidateId).startsWith("CAND-") ? payload.candidateId : `CAND-${String(nextNum).padStart(3, '0')}`,
      createdAt: now,
      updatedAt: now,
      status: "Available",
      ...payload
    };
    list.unshift(newItem);
    const sequenced = assignSequentialCandidateIds(list);
    LocalStorageService.set("talentPool", sequenced);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("talent-pool-updated"));
    }
    return newItem;
  },

  async update(id: string, updates: any): Promise<any> {
    const list = await this.getAll();
    const index = list.findIndex(c => c.id === id || c.candidateId === id);
    if (index === -1) throw new Error("Talent pool candidate not found.");

    const updated = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    LocalStorageService.set("talentPool", list);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("talent-pool-updated"));
    }
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const rawId = String(id || "").trim();
    const cleanId = rawId.replace(/^app-/, "").replace(/^cand-/, "").replace(/^tp-/, "");

    const talentPool = LocalStorageService.get<any[]>("talentPool", []);
    const filtered = talentPool.filter((t: any) => {
      if (!t) return false;
      const tId = String(t.id || t.candidateId || "").trim();
      const tCleanId = tId.replace(/^app-/, "").replace(/^cand-/, "").replace(/^tp-/, "");
      if (tId === rawId || tId === cleanId || tCleanId === cleanId) return false;
      return true;
    });
    LocalStorageService.set("talentPool", filtered);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("talent-pool-updated"));
    }
    return true;
  },

  async deleteMultiple(ids: string[]): Promise<boolean> {
    for (const id of ids) {
      await this.delete(id);
    }
    return true;
  }
};
