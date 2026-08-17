import React, { useState, useEffect, DragEvent, ChangeEvent, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, CheckCircle2, Upload, AlertCircle, Loader2, Phone, Mail, 
  User, Trash2, Briefcase, MapPin, ExternalLink, FileCheck, Building2,
  ChevronDown, ChevronUp
} from "lucide-react";
import { JobRepository, CandidateRepository } from "../repositories";

interface PublicApplyFormProps {
  jobId: string;
  onClose?: () => void;
}

interface JobDetails {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status?: string;
  description: string;
  requirements: string[] | any;
  responsibilities?: string[] | string;
  workMode?: string;
  experienceRange?: string;
  salaryRange?: string;
  openings?: number;
  deadline?: string;
  targetJoiningDate?: string;
  hiringManager?: string;
  recruiter?: string;
  preferredSkills?: string[] | string;
  benefits?: string[] | string;
}

// Helper to provide nice defaults for jobs to ensure excellent typography and aesthetics
const getEnrichedJobDetails = (job: JobDetails): JobDetails => {
  const workMode = job.workMode || "Hybrid";
  const experienceRange = job.experienceRange || "1-3 Years";
  const salaryRange = job.salaryRange || "Competitive";
  const openings = job.openings || 1;
  const deadline = job.deadline || "";
  const targetJoiningDate = job.targetJoiningDate || "";
  const hiringManager = job.hiringManager || "Not Specified";
  const recruiter = job.recruiter || "Not Specified";

  let responsibilitiesArray: string[] = [];
  if (job.responsibilities) {
    if (Array.isArray(job.responsibilities)) {
      responsibilitiesArray = job.responsibilities.filter(Boolean);
    } else if (typeof job.responsibilities === "string") {
      responsibilitiesArray = (job.responsibilities as string)
        .split("\n")
        .map(r => r.trim())
        .filter(r => r.length > 0);
    }
  }
  if (responsibilitiesArray.length === 0) {
    responsibilitiesArray = [
      "Collaborate with cross-functional project teams to design, develop, and deliver high-quality, scalable applications.",
      "Participate actively in planning, estimating, code reviews, and regular architectural refinement discussions.",
      "Write clean, readable, self-documenting code with comprehensive unit tests and focus on execution efficiency."
    ];
  }

  let requirementsArray: string[] = [];
  if (job.requirements) {
    if (Array.isArray(job.requirements)) {
      requirementsArray = job.requirements.filter(Boolean);
    } else if (typeof job.requirements === "object" && job.requirements !== null) {
      const reqsObj = job.requirements as any;
      if (Array.isArray(reqsObj.mustHave)) {
        requirementsArray = reqsObj.mustHave.filter(Boolean);
      } else if (Array.isArray(reqsObj.must_have)) {
        requirementsArray = reqsObj.must_have.filter(Boolean);
      }
    } else if (typeof job.requirements === "string") {
      requirementsArray = (job.requirements as string)
        .split("\n")
        .map(r => r.trim())
        .filter(r => r.length > 0);
    }
  }
  if (requirementsArray.length === 0) {
    requirementsArray = [
      "Excellent logical reasoning, communication, and systematic problem-solving skills",
      "Demonstrated experience working within agile, sprint-based teams utilizing modern workflows",
      "Detail-oriented mindset focusing on responsive, user-first frontends and secure backends",
      "Willingness to learn and master new tech-stack frameworks, SDK integrations, and deployment environments"
    ];
  }

  let preferredSkillsArray: string[] = [];
  if (job.preferredSkills) {
    if (Array.isArray(job.preferredSkills)) {
      preferredSkillsArray = job.preferredSkills.filter(Boolean);
    } else if (typeof job.preferredSkills === "string") {
      preferredSkillsArray = (job.preferredSkills as string)
        .split("\n")
        .map(r => r.trim())
        .filter(r => r.length > 0);
    }
  } else if (job.requirements && typeof job.requirements === "object" && job.requirements !== null) {
    const reqsObj = job.requirements as any;
    if (Array.isArray(reqsObj.goodToHave)) {
      preferredSkillsArray = reqsObj.goodToHave.filter(Boolean);
    } else if (Array.isArray(reqsObj.good_to_have)) {
      preferredSkillsArray = reqsObj.good_to_have.filter(Boolean);
    }
  }
  if (preferredSkillsArray.length === 0) {
    preferredSkillsArray = [
      "Hands-on familiarity with modern server deployment platforms, Cloud storage, or serverless functions",
      "Sound understanding of CI/CD integration, automation pipelines, and robust security practices",
      "Prior exposure to high-growth development models, open-source work, or product-led engineering teams"
    ];
  }

  let benefitsArray: string[] = [];
  if (job.benefits) {
    if (Array.isArray(job.benefits)) {
      benefitsArray = job.benefits.filter(Boolean);
    } else if (typeof job.benefits === "string") {
      benefitsArray = (job.benefits as string)
        .split("\n")
        .map(b => b.trim())
        .filter(b => b.length > 0);
    }
  }
  if (benefitsArray.length === 0) {
    benefitsArray = [
      "Flexible, goal-driven working arrangements and remote-friendly options",
      "Comprehensive medical coverage, health insurance options, and wellness perks",
      "Sponsored professional development learning paths, certificates, and technical mentorship",
      "A fast-paced collaborative environment offering exponential structural and financial growth"
    ];
  }

  return {
    ...job,
    description: job.description || "We are seeking a motivated team member to join our professional software development and digital consulting workforce at EncureIT Systems.",
    requirements: requirementsArray,
    responsibilities: responsibilitiesArray,
    preferredSkills: preferredSkillsArray,
    benefits: benefitsArray,
    workMode,
    experienceRange,
    salaryRange,
    openings,
    deadline,
    targetJoiningDate,
    hiringManager,
    recruiter
  };
};

export default function PublicApplyForm({ jobId, onClose }: PublicApplyFormProps) {
  const [activeJobs, setActiveJobs] = useState<JobDetails[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobDetails | null>(null);
  const [showJD, setShowJD] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [jobNotFound, setJobNotFound] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  // Candidate Apply Fields (Google Form Questions)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [relocateToPune, setRelocateToPune] = useState("");
  const [experienceLevel, setExperienceLevel] = useState(""); // Experienced or Fresher
  const [noticePeriod, setNoticePeriod] = useState("");
  const [linkedinProfile, setLinkedinProfile] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");

  // Conditional field: Fresher
  const [highestEducation, setHighestEducation] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [yearOfPassing, setYearOfPassing] = useState("");
  const [projectsDescription, setProjectsDescription] = useState("");

  // Conditional field: Experienced
  const [currentCompany, setCurrentCompany] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [totalExperience, setTotalExperience] = useState("");
  const [currentCTC, setCurrentCTC] = useState("");
  const [expectedCTC, setExpectedCTC] = useState("");
  const [inHandSalary, setInHandSalary] = useState("");

  const [keySkills, setKeySkills] = useState("");

  // Resume attachment
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvBase64, setCvBase64] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmConsent, setConfirmConsent] = useState(false);
  const [isPendingClear, setIsPendingClear] = useState(false);

  // Fetch Jobs list on mount
  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);
        setErrorMsg(null);
        setJobNotFound(false);
        setIsClosed(false);

        // Fetch active jobs for the dropdown
        const activeJobsList = await JobRepository.getAll();
        const activeList = (activeJobsList || []).map((j: JobDetails) => getEnrichedJobDetails(j));
        setActiveJobs(activeList);

        if (jobId) {
          try {
            const fetchedJob = await JobRepository.getById(jobId);
            if (!fetchedJob) throw new Error("Job not found");
            const job = getEnrichedJobDetails(fetchedJob);
            setSelectedJob(job);
            if (job.status === "closed" || job.status === "Closed") {
              setIsClosed(true);
            }
          } catch (err: any) {
            console.error("Error loading specific job:", err);
            setJobNotFound(true);
          }
        } else {
          if (activeList.length > 0) {
            setSelectedJob(activeList[0]);
          }
        }
      } catch (err) {
        console.error("Error loading jobs:", err);
        setErrorMsg("Failed to retrieve current active job listings.");
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, [jobId]);

  // Handle Dropdown Change
  const handleJobChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const matched = activeJobs.find(j => j.id === e.target.value);
    if (matched) {
      setSelectedJob(matched);
      setShowJD(true); // Always expand JD when they change roles to let them review
    } else {
      setSelectedJob(null);
    }
  };

  // Drag & Drop
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processResume = (file: File) => {
    if (file.type !== "application/pdf") {
      setErrorMsg("We only support PDF formats for resumes. Please upload a standard PDF CV.");
      setCvFile(null);
      setCvBase64("");
      return;
    }
    setErrorMsg(null);
    setCvFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setCvBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processResume(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processResume(e.target.files[0]);
    }
  };

  // Submit form payload
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validations
    if (!selectedJob) {
      setErrorMsg("Please select a job role from the dropdown.");
      return;
    }
    if (!fullName.trim()) {
      setErrorMsg("Please enter your Full Name.");
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg("Please enter a valid Email Address.");
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      setErrorMsg("Please provide a valid 10-digit Phone Number.");
      return;
    }
    if (!currentLocation.trim()) {
      setErrorMsg("Please enter your current location city.");
      return;
    }
    if (!relocateToPune) {
      setErrorMsg("Please select whether you are willing to relocate to Pune.");
      return;
    }
    if (!experienceLevel) {
      setErrorMsg("Please select your Experience Level.");
      return;
    }
    if (!keySkills.trim()) {
      setErrorMsg("Key Skills are required so we can match your profile.");
      return;
    }

    if (experienceLevel === "Experienced") {
      if (!currentCompany.trim()) {
        setErrorMsg("Please fill in your current organization/company name.");
        return;
      }
      if (!currentRole.trim()) {
        setErrorMsg("Please fill in your current designation.");
        return;
      }
      if (!totalExperience) {
        setErrorMsg("Please select your Total Work Experience.");
        return;
      }
      if (!noticePeriod) {
        setErrorMsg("Please select your Notice Period.");
        return;
      }
      if (!currentCTC.trim() || !expectedCTC.trim()) {
        setErrorMsg("CTC information is mandatory for experienced professionals.");
        return;
      }
    } else {
      if (!highestEducation) {
        setErrorMsg("Please select your highest educational degree.");
        return;
      }
      if (!specialization.trim()) {
        setErrorMsg("Please state your field of specialization.");
        return;
      }
      if (!yearOfPassing) {
        setErrorMsg("Please select your graduation year of passing.");
        return;
      }
      if (!projectsDescription.trim()) {
        setErrorMsg("Please describe key projects you worked on in college/training.");
        return;
      }
    }

    if (!cvFile || !cvBase64) {
      setErrorMsg("Uploading a PDF Resume/CV is required.");
      return;
    }

    if (!confirmConsent) {
      setErrorMsg("Please certify that the provided information is true to submit.");
      return;
    }

    const isExperienced = experienceLevel === "Experienced";

    try {
      setSubmitting(true);
      
      const payload = {
        jobId: selectedJob.id,
        fullName,
        email,
        phone: `${phoneCode} ${phone}`,
        currentLocation,
        relocateToPune,
        cvBase64,
        cvFileName: cvFile.name,
        
        experienceLevel,
        noticePeriod: isExperienced ? noticePeriod : "Immediate",
        linkedinProfile,
        portfolioLink,
        highestEducation: isExperienced ? "" : highestEducation,
        specialization: isExperienced ? "" : specialization,
        yearOfPassing: isExperienced ? "" : yearOfPassing,
        currentCompany: isExperienced ? currentCompany : "",
        currentRole: isExperienced ? currentRole : "",
        totalExperience: isExperienced ? totalExperience : "Fresher",
        keySkills,
        candidateType: isExperienced ? "experienced" : "fresher",
        
        currentCTC: isExperienced ? currentCTC : "",
        expectedCTC: isExperienced ? expectedCTC : "",
        inHandSalary: isExperienced ? inHandSalary : "",
        projectsDescription: isExperienced ? "" : projectsDescription,
        
        // Backwards compatibility keys
        experienceYears: isExperienced ? totalExperience.replace(/\D/g, "") : "0",
        educationCollege: isExperienced ? "" : `${highestEducation} in ${specialization}`,
        projectsLink: portfolioLink || linkedinProfile || "",
        recentCompany: isExperienced ? currentCompany : "",
        recentDesignation: isExperienced ? currentRole : "",
        recentDescription: isExperienced 
          ? `Notice Period: ${noticePeriod}. Current CTC: ${currentCTC}. Expected CTC: ${expectedCTC}.`
          : `Fresher. Projects: ${projectsDescription}`
      };

      await CandidateRepository.createApplication(payload);
      
      // Dispatch event to instantly sync and trigger the professional notification popup for recruiters
      window.dispatchEvent(new Event("trigger-notification-sync"));
      
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Submit application error:", err);
      setErrorMsg(err.response?.data?.error || "We couldn't submit your application. Please check your inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden"
        style={{
          backgroundColor: "#f3f0f9",
          backgroundImage: `
            radial-gradient(#673ab70d 1px, transparent 1px), 
            radial-gradient(at 0% 0%, hsla(253,16%,7%,0) 0, hsla(266,45%,93%,1) 50%), 
            radial-gradient(at 50% 0%, hsla(225,39%,30%,0.08) 0, hsla(0,0%,100%,0) 50%), 
            radial-gradient(at 100% 0%, hsla(339,49%,30%,0.05) 0, hsla(0,0%,100%,0) 50%),
            radial-gradient(at 100% 100%, hsla(256,40%,90%,1) 0, hsla(0,0%,100%,0) 100%),
            radial-gradient(at 0% 100%, hsla(263,40%,88%,1) 0, hsla(0,0%,100%,0) 100%),
            radial-gradient(at 80% 50%, hsla(260,40%,92%,1) 0, hsla(0,0%,100%,0) 100%)
          `,
          backgroundSize: "24px 24px, auto, auto, auto, auto, auto, auto",
        }}
      >
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-purple-100/50 z-10">
          <Loader2 className="h-8 w-8 text-[#673ab7] animate-spin mx-auto" />
          <p className="text-[#202124] font-semibold text-sm">Loading Application Form...</p>
        </div>
      </div>
    );
  }

  if (jobNotFound) {
    return (
      <div 
        className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden"
        style={{
          backgroundColor: "#f3f0f9",
          backgroundImage: `
            radial-gradient(#673ab70d 1px, transparent 1px), 
            radial-gradient(at 0% 0%, hsla(253,16%,7%,0) 0, hsla(266,45%,93%,1) 50%), 
            radial-gradient(at 50% 0%, hsla(225,39%,30%,0.08) 0, hsla(0,0%,100%,0) 50%), 
            radial-gradient(at 100% 0%, hsla(339,49%,30%,0.05) 0, hsla(0,0%,100%,0) 50%),
            radial-gradient(at 100% 100%, hsla(256,40%,90%,1) 0, hsla(0,0%,100%,0) 100%),
            radial-gradient(at 0% 100%, hsla(263,40%,88%,1) 0, hsla(0,0%,100%,0) 100%),
            radial-gradient(at 80% 50%, hsla(260,40%,92%,1) 0, hsla(0,0%,100%,0) 100%)
          `,
          backgroundSize: "24px 24px, auto, auto, auto, auto, auto, auto",
        }}
      >
        <div className="max-w-md w-full bg-white rounded-lg border border-gray-200 shadow-xl overflow-hidden text-center p-8 space-y-6 z-10">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600">
            <AlertCircle className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-800 font-sans">Job Not Found</h2>
            <p className="text-xs text-gray-600 leading-relaxed font-sans">
              The job opportunity you are looking for does not exist, is in draft mode, or has been removed from our careers database.
            </p>
          </div>
          <div className="pt-4">
            <a
              href="?apply=true"
              className="inline-block px-6 py-2.5 bg-[#673ab7] hover:bg-[#5e35a6] text-white text-xs font-bold rounded-md shadow-sm transition font-sans"
            >
              View Other Opportunities
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen w-full text-[#202124] font-sans flex flex-col items-center justify-start py-8 px-4 relative overflow-hidden"
      style={{
        backgroundColor: "#f3f0f9",
        backgroundImage: `
          radial-gradient(#673ab70d 1px, transparent 1px), 
          radial-gradient(at 0% 0%, hsla(253,16%,7%,0) 0, hsla(266,45%,93%,1) 50%), 
          radial-gradient(at 50% 0%, hsla(225,39%,30%,0.08) 0, hsla(0,0%,100%,0) 50%), 
          radial-gradient(at 100% 0%, hsla(339,49%,30%,0.05) 0, hsla(0,0%,100%,0) 50%),
          radial-gradient(at 100% 100%, hsla(256,40%,90%,1) 0, hsla(0,0%,100%,0) 100%),
          radial-gradient(at 0% 100%, hsla(263,40%,88%,1) 0, hsla(0,0%,100%,0) 100%),
          radial-gradient(at 80% 50%, hsla(260,40%,92%,1) 0, hsla(0,0%,100%,0) 100%)
        `,
        backgroundSize: "24px 24px, auto, auto, auto, auto, auto, auto",
      }}
    >
      {/* Dynamic ambient blur spots for ultra-premium depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-300/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-300/20 blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full space-y-4 relative z-10">
        
        {/* SUCCESS STATE CARD */}
        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden relative"
          >
            {/* Top Google Forms Purple Strip */}
            <div className="h-2.5 bg-[#673ab7] w-full" />
            
            <div className="p-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-[#673ab7]">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-normal text-[#202124]">Application Form</h2>
                <p className="text-sm text-gray-600">Your application has been recorded.</p>
              </div>

              <div className="bg-[#f8f9fa] p-5 rounded-lg border border-gray-150 text-left space-y-3 max-w-md mx-auto">
                <div className="text-xs font-bold text-[#673ab7] uppercase tracking-wider border-b pb-2 font-mono">
                  Receipt Summary
                </div>
                <div className="space-y-1 text-xs">
                  <p><span className="text-gray-500">Applicant:</span> <strong className="text-gray-800">{fullName}</strong></p>
                  <p><span className="text-gray-500">Job Position:</span> <strong className="text-gray-800">{selectedJob?.title}</strong></p>
                  <p><span className="text-gray-500">Department:</span> <strong className="text-gray-800">{selectedJob?.department}</strong></p>
                  <p><span className="text-gray-500">Email ID:</span> <strong className="text-gray-800 font-mono">{email}</strong></p>
                  <p><span className="text-gray-500">Applicant Type:</span> <strong className="text-gray-800">{experienceLevel}</strong></p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setCvFile(null);
                    setCvBase64("");
                    setFullName("");
                    setEmail("");
                    setPhone("");
                    setCurrentLocation("");
                    setKeySkills("");
                    setCurrentCompany("");
                    setCurrentRole("");
                    setProjectsDescription("");
                    setConfirmConsent(false);
                  }}
                  className="px-6 py-2 bg-[#673ab7] hover:bg-[#5e35a6] text-white text-xs font-bold rounded-md shadow-xs transition cursor-pointer"
                >
                  Submit another application
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* FORM BODY WRAPPER */
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 1. MAIN HEADER CARD WITH BRAND LOGO */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden relative">
              {/* Top Google Forms Purple Strip */}
              <div className="h-2.5 bg-[#673ab7] w-full" />
              
              <div className="p-6 sm:p-8 space-y-5">
                {/* Logo and Company Name Header */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex items-center justify-center shrink-0">
                      <div className="h-14 w-14 rounded-xl bg-slate-50 flex items-center justify-center shadow-sm border border-purple-100 overflow-hidden">
                        <img 
                          src="https://logo.clearbit.com/encureit.com" 
                          alt="EncureIT Logo" 
                          className="h-11 w-11 object-contain rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://www.google.com/s2/favicons?sz=128&domain=encureit.com";
                          }}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-sans font-semibold text-sm text-slate-700 tracking-tight">
                          Encure<span className="text-[#673ab7]">IT</span>
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-50/70 text-[#673ab7] rounded-md uppercase tracking-wider font-mono">
                          Systems
                        </span>
                      </div>
                      <h1 className="text-base sm:text-lg font-sans font-bold text-[#202124] tracking-tight mt-1">
                        Job Application Form
                      </h1>
                    </div>
                  </div>

                  {onClose ? (
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                      title="Close Application Form"
                    >
                      <Trash2 className="hidden" />
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md">Close Form</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = window.location.origin;
                      }}
                      className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md transition-all cursor-pointer shrink-0"
                      title="Return to Portal"
                    >
                      Back to Dashboard
                    </button>
                  )}
                </div>

                <div className="text-xs sm:text-sm text-gray-650 leading-relaxed space-y-2 border-t border-gray-100 pt-4">
                  <p>
                    Please fill out this simple and professional application form to submit your details to EncureIT Systems. 
                  </p>
                  <p className="text-[#d93025] font-semibold text-xs">* Indicates required question</p>
                </div>
              </div>
            </div>

            {/* 2. ERROR DISPLAY TOAST */}
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-4 rounded-lg border-l-4 border-[#d93025] shadow-xs text-xs flex items-start gap-3 text-[#d93025]"
              >
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Error:</span> {errorMsg}
                </div>
              </motion.div>
            )}

            {/* 3. JOB SELECTION CARD */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#202124] mb-1">
                  Select the position you are applying for <span className="text-[#d93025]">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">Choose an active job role from our careers database</p>
              </div>

              <select
                value={selectedJob?.id || ""}
                onChange={handleJobChange}
                required
                className="w-full px-3.5 py-2.5 bg-[#f8f9fa] hover:bg-gray-100 border border-gray-200 rounded-md focus:outline-hidden focus:border-[#673ab7] focus:ring-1 focus:ring-[#673ab7] text-xs font-medium transition cursor-pointer"
              >
                <option value="" disabled>-- Choose a Position --</option>
                {activeJobs.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.title} ({job.department} / {job.location})
                  </option>
                ))}
              </select>

              {/* DYNAMIC JOB DESCRIPTION VIEW */}
              <AnimatePresence>
                {selectedJob && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border border-gray-150 rounded-lg bg-[#f8f9fa] mt-3"
                  >
                    <button
                      type="button"
                      onClick={() => setShowJD(!showJD)}
                      className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 text-[#673ab7]">
                        <Briefcase className="h-3.5 w-3.5" />
                        View Job Description (JD) & Requirements
                      </span>
                      {showJD ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                     {showJD && (
                      <div className="p-4 space-y-4 text-xs text-gray-700 border-t border-gray-150 text-left">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-b pb-3 font-semibold text-gray-500">
                          <p><span className="text-gray-400">Department:</span> <span className="text-gray-700 font-medium">{selectedJob.department}</span></p>
                          <p><span className="text-gray-400">Location:</span> <span className="text-gray-700 font-medium">{selectedJob.location}</span></p>
                          <p><span className="text-gray-400">Work Mode:</span> <span className="text-gray-700 font-medium">{selectedJob.workMode}</span></p>
                          <p><span className="text-gray-400">Employment Type:</span> <span className="text-gray-700 font-medium">{selectedJob.type}</span></p>
                          <p><span className="text-gray-400">Experience Range:</span> <span className="text-gray-700 font-medium">{selectedJob.experienceRange}</span></p>
                          <p><span className="text-gray-400">Salary Range:</span> <span className="text-gray-700 font-medium">{selectedJob.salaryRange}</span></p>
                          <p><span className="text-gray-400">Openings:</span> <span className="text-gray-700 font-medium">{selectedJob.openings}</span></p>
                          <p><span className="text-gray-400">Application Deadline:</span> <span className="text-gray-700 font-medium">{selectedJob.deadline ? new Date(selectedJob.deadline).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : "Flexible"}</span></p>
                          <p><span className="text-gray-400">Target Joining Date:</span> <span className="text-gray-700 font-medium">{selectedJob.targetJoiningDate ? new Date(selectedJob.targetJoiningDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : "Immediate"}</span></p>
                          <p><span className="text-gray-400">Hiring Manager:</span> <span className="text-gray-700 font-medium">{selectedJob.hiringManager}</span></p>
                          <p><span className="text-gray-400">Recruiter:</span> <span className="text-gray-700 font-medium">{selectedJob.recruiter}</span></p>
                        </div>
                        
                        {/* Section 1: About the Job */}
                        <div className="space-y-1.5">
                          <h4 className="font-bold text-[#673ab7]">About the job:</h4>
                          <p className="leading-relaxed text-gray-600 whitespace-pre-line">{selectedJob.description || "No description provided."}</p>
                        </div>

                        {/* Section 2: Responsibilities */}
                        <div className="space-y-1.5">
                          <h4 className="font-bold text-[#673ab7]">Responsibilities:</h4>
                          {(() => {
                            const responsibilitiesArray = (() => {
                              if (!selectedJob.responsibilities) return [];
                              if (Array.isArray(selectedJob.responsibilities)) return selectedJob.responsibilities;
                              if (typeof selectedJob.responsibilities === "string") {
                                return (selectedJob.responsibilities as string).split("\n").filter(Boolean);
                              }
                              return [];
                            })();
                            return responsibilitiesArray.length > 0 ? (
                              <ul className="list-disc pl-4 space-y-1 text-gray-600">
                                {responsibilitiesArray.map((resp, idx) => (
                                  <li key={idx} className="leading-relaxed">{resp}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-400 italic">No responsibilities defined for this role.</p>
                            );
                          })()}
                        </div>

                        {/* Section 3: Requirements */}
                        <div className="space-y-1.5">
                          <h4 className="font-bold text-[#673ab7]">Requirements:</h4>
                          {(() => {
                            const reqsArray = (() => {
                              if (!selectedJob.requirements) return [];
                              if (Array.isArray(selectedJob.requirements)) return selectedJob.requirements;
                              if (typeof selectedJob.requirements === "object") {
                                return (selectedJob.requirements as any).mustHave || [];
                              }
                              if (typeof selectedJob.requirements === "string") {
                                return (selectedJob.requirements as string).split("\n").filter(Boolean);
                              }
                              return [];
                            })();
                            return reqsArray.length > 0 ? (
                              <ul className="list-disc pl-4 space-y-1 text-gray-600">
                                {reqsArray.map((req, idx) => (
                                  <li key={idx} className="leading-relaxed">{req}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-400 italic">No requirements defined for this role.</p>
                            );
                          })()}
                        </div>

                        {/* Section 4: Preferred Skills */}
                        <div className="space-y-1.5 font-sans">
                          <h4 className="font-bold text-[#673ab7]">Preferred Skills:</h4>
                          {(() => {
                            const prefArray = Array.isArray(selectedJob.preferredSkills)
                              ? selectedJob.preferredSkills
                              : typeof selectedJob.preferredSkills === "string"
                                ? (selectedJob.preferredSkills as string).split("\n").filter(Boolean)
                                : [];
                            return prefArray.length > 0 ? (
                              <ul className="list-disc pl-4 space-y-1 text-gray-600">
                                {prefArray.map((pref, idx) => (
                                  <li key={idx} className="leading-relaxed">{pref}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-400 italic">No preferred skills defined.</p>
                            );
                          })()}
                        </div>

                        {/* Section 5: Benefits */}
                        <div className="space-y-1.5 font-sans">
                          <h4 className="font-bold text-[#673ab7]">Benefits:</h4>
                          {(() => {
                            const benefitsArray = Array.isArray(selectedJob.benefits)
                              ? selectedJob.benefits
                              : typeof selectedJob.benefits === "string"
                                ? (selectedJob.benefits as string).split("\n").filter(Boolean)
                                : [];
                            return benefitsArray.length > 0 ? (
                              <ul className="list-disc pl-4 space-y-1 text-gray-600">
                                {benefitsArray.map((benefit, idx) => (
                                  <li key={idx} className="leading-relaxed">{benefit}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-400 italic">No benefits defined for this role.</p>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!isClosed ? (
              <>
                {/* 4. PERSONAL DETAILS SECTION */}
                <div className="space-y-4">
              
              {/* Full Name */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                <label className="block text-sm font-semibold text-[#202124]">
                  Full Name <span className="text-[#d93025]">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-1">Enter your first, middle (if any), and last name</p>
                <input
                  type="text"
                  required
                  placeholder="Your answer"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full sm:w-2/3 border-b border-gray-300 py-1.5 focus:outline-hidden focus:border-[#673ab7] focus:border-b-2 text-sm transition"
                />
              </div>

              {/* Email Address */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                <label className="block text-sm font-semibold text-[#202124]">
                  Email Address <span className="text-[#d93025]">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-1">We will reach out to you at this email</p>
                <input
                  type="email"
                  required
                  placeholder="Your answer"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full sm:w-2/3 border-b border-gray-300 py-1.5 focus:outline-hidden focus:border-[#673ab7] focus:border-b-2 text-sm transition"
                />
              </div>

              {/* Phone Number */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                <label className="block text-sm font-semibold text-[#202124]">
                  Phone Number <span className="text-[#d93025]">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-1">Provide a mobile number where you can receive calls/WhatsApp updates</p>
                <div className="flex gap-2 items-center w-full sm:w-2/3 pt-1">
                  <select
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    className="border-b border-gray-300 py-1.5 focus:outline-hidden text-sm font-semibold text-gray-650"
                  >
                    <option value="+91">+91 (IN)</option>
                    <option value="+1">+1 (US)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+61">+61 (AU)</option>
                  </select>
                  <input
                    type="tel"
                    required
                    placeholder="Your answer (10 digit mobile)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 border-b border-gray-300 py-1.5 focus:outline-hidden focus:border-[#673ab7] focus:border-b-2 text-sm transition"
                  />
                </div>
              </div>

              {/* Current Location */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                <label className="block text-sm font-semibold text-[#202124]">
                  Current Location (City, State) <span className="text-[#d93025]">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-1">Let us know where you are currently located</p>
                <input
                  type="text"
                  required
                  placeholder="Your answer"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  className="w-full sm:w-2/3 border-b border-gray-300 py-1.5 focus:outline-hidden focus:border-[#673ab7] focus:border-b-2 text-sm transition"
                />
              </div>

              {/* Pune Relocation */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-3">
                <label className="block text-sm font-semibold text-[#202124]">
                  Are you willing to relocate or work in Pune, Maharashtra? <span className="text-[#d93025]">*</span>
                </label>
                <div className="space-y-2.5 pt-1 text-sm text-gray-750">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="relocate"
                      value="Yes"
                      checked={relocateToPune === "Yes"}
                      onChange={() => setRelocateToPune("Yes")}
                      className="h-4.5 w-4.5 text-[#673ab7] focus:ring-[#673ab7] border-gray-300 cursor-pointer"
                    />
                    <span>Yes, I am willing to work at the Pune office</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="relocate"
                      value="No"
                      checked={relocateToPune === "No"}
                      onChange={() => setRelocateToPune("No")}
                      className="h-4.5 w-4.5 text-[#673ab7] focus:ring-[#673ab7] border-gray-300 cursor-pointer"
                    />
                    <span>No, I prefer remote work or a different location</span>
                  </label>
                </div>
              </div>

              {/* Experience Level */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-3">
                <label className="block text-sm font-semibold text-[#202124]">
                  What is your Experience Level? <span className="text-[#d93025]">*</span>
                </label>
                <p className="text-xs text-gray-400">Select Fresher if you are a student or recent graduate</p>
                
                <div className="space-y-2.5 pt-1 text-sm text-gray-750">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="expLevel"
                      value="Experienced"
                      checked={experienceLevel === "Experienced"}
                      onChange={() => setExperienceLevel("Experienced")}
                      className="h-4.5 w-4.5 text-[#673ab7] focus:ring-[#673ab7] border-gray-300 cursor-pointer"
                    />
                    <span>Experienced Professional</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="expLevel"
                      value="Fresher"
                      checked={experienceLevel === "Fresher"}
                      onChange={() => setExperienceLevel("Fresher")}
                      className="h-4.5 w-4.5 text-[#673ab7] focus:ring-[#673ab7] border-gray-300 cursor-pointer"
                    />
                    <span>Fresher (No professional experience yet)</span>
                  </label>
                </div>
              </div>

            </div>

            {/* 5. CONDITIONAL PATH CARDS */}
            <AnimatePresence mode="wait">
              {experienceLevel === "Experienced" && (
                /* EXPERIENCED PROFILE CARD */
                <motion.div
                  key="experienced-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Current Organization */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                    <label className="block text-sm font-semibold text-[#202124]">
                      Current Company Name <span className="text-[#d93025]">*</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-1">The organization you are currently employed with</p>
                    <input
                      type="text"
                      required
                      placeholder="Your answer"
                      value={currentCompany}
                      onChange={(e) => setCurrentCompany(e.target.value)}
                      className="w-full sm:w-2/3 border-b border-gray-300 py-1.5 focus:outline-hidden focus:border-[#673ab7] focus:border-b-2 text-sm transition"
                    />
                  </div>

                  {/* Current Role */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                    <label className="block text-sm font-semibold text-[#202124]">
                      Current Designation / Role <span className="text-[#d93025]">*</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-1">Your current job title (e.g. Software Engineer, QA Analyst)</p>
                    <input
                      type="text"
                      required
                      placeholder="Your answer"
                      value={currentRole}
                      onChange={(e) => setCurrentRole(e.target.value)}
                      className="w-full sm:w-2/3 border-b border-gray-300 py-1.5 focus:outline-hidden focus:border-[#673ab7] focus:border-b-2 text-sm transition"
                    />
                  </div>

                  {/* Experience Years */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                    <label className="block text-sm font-semibold text-[#202124]">
                      Total Work Experience <span className="text-[#d93025]">*</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-2">Select your total years of professional industry experience</p>
                    <select
                      value={totalExperience}
                      onChange={(e) => setTotalExperience(e.target.value)}
                      required
                      className="w-full sm:w-1/2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-hidden focus:border-[#673ab7] text-xs font-semibold text-gray-700"
                    >
                      <option value="" disabled>-- Select Total Experience --</option>
                      <option value="Fresher">Fresher (0 Years)</option>
                      <option value="1 Year">1 Year</option>
                      <option value="2 Years">2 Years</option>
                      <option value="3 Years">3 Years</option>
                      <option value="4 Years">4 Years</option>
                      <option value="5+ Years">5+ Years</option>
                    </select>
                  </div>

                  {/* Notice Period */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                    <label className="block text-sm font-semibold text-[#202124]">
                      Notice Period <span className="text-[#d93025]">*</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-2">How soon can you join if selected?</p>
                    <select
                      value={noticePeriod}
                      onChange={(e) => setNoticePeriod(e.target.value)}
                      required
                      className="w-full sm:w-1/2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-hidden focus:border-[#673ab7] text-xs font-semibold text-gray-700"
                    >
                      <option value="" disabled>-- Select Notice Period --</option>
                      <option value="Immediate">Immediate / Serving Notice</option>
                      <option value="15 Days">15 Days</option>
                      <option value="30 Days">30 Days</option>
                      <option value="60 Days">60 Days</option>
                      <option value="90 Days">90 Days</option>
                    </select>
                  </div>

                  {/* Current CTC */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                    <label className="block text-sm font-semibold text-[#202124]">
                      Current CTC (Annual LPA) <span className="text-[#d93025]">*</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-1">State your total annual package (Lakhs Per Annum)</p>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 6.5 LPA"
                      value={currentCTC}
                      onChange={(e) => setCurrentCTC(e.target.value)}
                      className="w-full sm:w-2/3 border-b border-gray-300 py-1.5 focus:outline-hidden focus:border-[#673ab7] focus:border-b-2 text-sm transition"
                    />
                  </div>

                  {/* Expected CTC */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                    <label className="block text-sm font-semibold text-[#202124]">
                      Expected CTC (Annual LPA) <span className="text-[#d93025]">*</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-1">Your salary expectations</p>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9.5 LPA"
                      value={expectedCTC}
                      onChange={(e) => setExpectedCTC(e.target.value)}
                      className="w-full sm:w-2/3 border-b border-gray-300 py-1.5 focus:outline-hidden focus:border-[#673ab7] focus:border-b-2 text-sm transition"
                    />
                  </div>

                  {/* In-Hand Monthly Salary */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                    <label className="block text-sm font-semibold text-[#202124]">
                      Average Monthly In-Hand Salary
                    </label>
                    <p className="text-xs text-gray-400 mb-1">Your approximate current net monthly credit (Optional)</p>
                    <input
                      type="text"
                      placeholder="e.g. Rs. 54,000"
                      value={inHandSalary}
                      onChange={(e) => setInHandSalary(e.target.value)}
                      className="w-full sm:w-2/3 border-b border-gray-300 py-1.5 focus:outline-hidden focus:border-[#673ab7] focus:border-b-2 text-sm transition"
                    />
                  </div>
                </motion.div>
              )}
              {experienceLevel === "Fresher" && (
                /* FRESHER PROFILE CARD */
                <motion.div
                  key="fresher-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Education Degree */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                    <label className="block text-sm font-semibold text-[#202124]">
                      Highest Educational Degree <span className="text-[#d93025]">*</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-2">Select your highest academic qualification</p>
                    <select
                      value={highestEducation}
                      onChange={(e) => setHighestEducation(e.target.value)}
                      required
                      className="w-full sm:w-1/2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-hidden focus:border-[#673ab7] text-xs font-semibold text-gray-700"
                    >
                      <option value="" disabled>-- Select Highest Education --</option>
                      <option value="B.E. / B.Tech">B.E. / B.Tech</option>
                      <option value="M.E. / M.Tech">M.E. / M.Tech</option>
                      <option value="MCA / MSc IT">MCA / MSc IT</option>
                      <option value="BCA / BSc CS">BCA / BSc CS</option>
                      <option value="MBA / PGDM">MBA / PGDM</option>
                      <option value="Other Graduate">Other Graduate</option>
                    </select>
                  </div>

                  {/* Specialization */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                    <label className="block text-sm font-semibold text-[#202124]">
                      Specialization / Stream <span className="text-[#d93025]">*</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-1">State your branch of study (e.g. Computer Engineering, Information Technology)</p>
                    <input
                      type="text"
                      required
                      placeholder="Your answer"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full sm:w-2/3 border-b border-gray-300 py-1.5 focus:outline-hidden focus:border-[#673ab7] focus:border-b-2 text-sm transition"
                    />
                  </div>

                  {/* Year of Passing */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                    <label className="block text-sm font-semibold text-[#202124]">
                      Year of Passing <span className="text-[#d93025]">*</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-2">When did you complete / will you complete your degree?</p>
                    <select
                      value={yearOfPassing}
                      onChange={(e) => setYearOfPassing(e.target.value)}
                      required
                      className="w-full sm:w-1/2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-hidden focus:border-[#673ab7] text-xs font-semibold text-gray-700"
                    >
                      <option value="" disabled>-- Select Year of Passing --</option>
                      <option value="2027">2027 (Pursuing)</option>
                      <option value="2026">2026 (Final Year)</option>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                    </select>
                  </div>

                  {/* Projects Worked On */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                    <label className="block text-sm font-semibold text-[#202124]">
                      Projects Worked On <span className="text-[#d93025]">*</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-1">Briefly outline major projects you completed during your studies, including tech stacks used.</p>
                    <textarea
                      required
                      rows={3}
                      placeholder="Your answer"
                      value={projectsDescription}
                      onChange={(e) => setProjectsDescription(e.target.value)}
                      className="w-full border border-gray-200 rounded-md p-2.5 focus:outline-hidden focus:border-[#673ab7] focus:ring-1 focus:ring-[#673ab7] text-xs font-normal resize-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 6. PROFILE LINKS & SKILLS CARD */}
            <div className="space-y-4">
              
              {/* Key Skills */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                <label className="block text-sm font-semibold text-[#202124]">
                  Key Skills <span className="text-[#d93025]">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-1">Comma-separated list of skills (e.g. React, JavaScript, SQL, Excel, Figma)</p>
                <input
                  type="text"
                  required
                  placeholder="Your answer"
                  value={keySkills}
                  onChange={(e) => setKeySkills(e.target.value)}
                  className="w-full border-b border-gray-300 py-1.5 focus:outline-hidden focus:border-[#673ab7] focus:border-b-2 text-sm transition"
                />
              </div>

              <AnimatePresence mode="wait">
                {experienceLevel === "Fresher" && (
                  <motion.div
                    key="fresher-socials"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-4"
                  >
                    {/* LinkedIn Profile */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                      <label className="block text-sm font-semibold text-[#202124]">
                        LinkedIn Profile URL
                      </label>
                      <p className="text-xs text-gray-400 mb-1">Your professional profile link (Optional)</p>
                      <input
                        type="url"
                        placeholder="Your answer (https://linkedin.com/in/...)"
                        value={linkedinProfile}
                        onChange={(e) => setLinkedinProfile(e.target.value)}
                        className="w-full sm:w-2/3 border-b border-gray-300 py-1.5 focus:outline-hidden focus:border-[#673ab7] focus:border-b-2 text-sm transition"
                      />
                    </div>

                    {/* Portfolio Link */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-2">
                      <label className="block text-sm font-semibold text-[#202124]">
                        Github Link
                      </label>
                      <p className="text-xs text-gray-400 mb-1">Link to your work, code repositories or certifications (Optional)</p>
                      <input
                        type="url"
                        placeholder="Your answer"
                        value={portfolioLink}
                        onChange={(e) => setPortfolioLink(e.target.value)}
                        className="w-full sm:w-2/3 border-b border-gray-300 py-1.5 focus:outline-hidden focus:border-[#673ab7] focus:border-b-2 text-sm transition"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* 7. PDF CV / RESUME UPLOAD CARD */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-3">
              <label className="block text-sm font-semibold text-[#202124]">
                Upload your Resume / CV <span className="text-[#d93025]">*</span>
              </label>
              <p className="text-xs text-gray-400">Please upload your latest professional resume in PDF format only.</p>

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-2.5 ${
                  dragActive 
                    ? "border-[#673ab7] bg-[#f0ebf8]" 
                    : "border-gray-300 hover:border-[#673ab7] bg-[#f8f9fa]"
                }`}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="resume-upload-input"
                />
                
                <AnimatePresence mode="wait">
                  {cvFile ? (
                    <motion.div 
                      key="file-info"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center space-y-2"
                    >
                      <FileCheck className="h-10 w-10 text-[#673ab7]" />
                      <div className="text-xs font-semibold text-gray-800">
                        {cvFile.name}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {(cvFile.size / (1024 * 1024)).toFixed(2)} MB • PDF CV Ready
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCvFile(null);
                          setCvBase64("");
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 pt-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove file
                      </button>
                    </motion.div>
                  ) : (
                    <motion.label 
                      key="upload-prompt"
                      htmlFor="resume-upload-input"
                      className="flex flex-col items-center space-y-2 cursor-pointer w-full"
                    >
                      <Upload className="h-10 w-10 text-gray-400" />
                      <div className="text-xs font-bold text-[#673ab7] hover:underline">
                        Add PDF file
                      </div>
                      <div className="text-[10px] text-gray-450">
                        or drag and drop your file here (Max 10 MB)
                      </div>
                    </motion.label>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 8. CONFIRMATION & CONSENT CARD */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-3">
              <label className="block text-sm font-semibold text-[#202124]">
                Declaration & Consent <span className="text-[#d93025]">*</span>
              </label>
              
              <label className="flex items-start gap-3 cursor-pointer pt-1 text-xs text-gray-600 leading-relaxed">
                <input
                  type="checkbox"
                  required
                  checked={confirmConsent}
                  onChange={(e) => setConfirmConsent(e.target.checked)}
                  className="h-4.5 w-4.5 mt-0.5 text-[#673ab7] focus:ring-[#673ab7] border-gray-300 rounded-xs cursor-pointer"
                />
                <span>
                  I certify that all details, career experience records, educational documents, and files uploaded in this application form are authentic and correct. I consent to EncureIT Systems reviewing my profile for recruitment.
                </span>
              </label>
            </div>

            {/* 9. SUBMIT ACTIONS AREA */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#673ab7] hover:bg-[#5e35a6] active:bg-[#512da8] disabled:bg-gray-400 text-white font-bold py-2.5 px-6 rounded-md shadow-xs text-xs font-medium tracking-wide transition cursor-pointer flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </button>

              {isPendingClear ? (
                <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-[10px] text-gray-500 font-bold px-1.5">Reset form?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFullName("");
                      setEmail("");
                      setPhone("");
                      setCurrentLocation("");
                      setLinkedinProfile("");
                      setPortfolioLink("");
                      setCurrentCompany("");
                      setCurrentRole("");
                      setProjectsDescription("");
                      setCvFile(null);
                      setCvBase64("");
                      setConfirmConsent(false);
                      setIsPendingClear(false);
                    }}
                    className="px-2 py-1 bg-rose-600 text-white font-bold text-[10px] rounded hover:bg-rose-700 cursor-pointer transition-all"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPendingClear(false)}
                    className="px-2 py-1 bg-gray-200 text-gray-700 font-bold text-[10px] rounded hover:bg-gray-300 cursor-pointer transition-all"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPendingClear(true)}
                  className="text-gray-500 hover:text-gray-700 text-xs font-bold px-3 py-1.5 hover:bg-gray-200/50 rounded-md transition cursor-pointer"
                >
                  Clear form
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-xs text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
              <AlertCircle className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-gray-800 text-base font-sans">Applications Closed</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed font-sans">
                This position is no longer accepting applications. Please review the vacancy details above or explore other current career openings.
              </p>
            </div>
          </div>
        )}

            {/* Sub-footer showing signature info */}
            <footer className="text-center text-[10px] text-gray-400 pt-6 space-y-1">
              <p>This content is created by EncureIT Systems talent loop.</p>
              <p>Google Forms Style Layout • Privacy & Terms compliant</p>
            </footer>

          </form>
        )}

      </div>
    </div>
  );
}
