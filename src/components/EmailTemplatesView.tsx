import React, { useState, useEffect, useRef } from "react";
import { PreferenceRepository, TemplateRepository, EmailRepository } from "../repositories";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Copy, 
  Save, 
  Eye, 
  Send, 
  Check, 
  Loader2, 
  Mail, 
  FileText, 
  CheckCircle, 
  ChevronRight, 
  Search, 
  Settings, 
  User, 
  RefreshCw, 
  AlertCircle, 
  ThumbsUp, 
  CheckCircle2,
  FilePlus,
  Play,
  Languages,
  X,
  PlusCircle,
  Clock,
  History,
  TrendingUp,
  Award
} from "lucide-react";
import axios from "axios";
import { motion, AnimatePresence } from "motion/react";

interface Template {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  isSystem?: boolean;
  lastUsed?: string;
  status: "Active" | "Draft";
  aiGenerated?: boolean;
}

interface SimulatedEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  variables: any;
  templateName: string;
  sentBy: string;
  status: string;
  sentAt: string;
}

const CANDIDATE_PROFILES = [
  {
    id: "cand-1",
    name: "Sarah Jenkins",
    email: "sarah.jenkins@gmail.com",
    jobTitle: "Senior React Developer",
    department: "Engineering",
    experience: "6 years of frontend experience",
    skills: "React 19, TypeScript, Tailwind CSS, System Design",
    atsScore: "94",
    interviewStatus: "Resume Shortlisted",
    offerStatus: "Pending Offer"
  },
  {
    id: "cand-2",
    name: "Marcus Vance",
    email: "marcus.vance@techops.io",
    jobTitle: "Backend Engineer",
    department: "Engineering",
    experience: "4 years of backend development",
    skills: "Node.js, Go, PostgreSQL, Docker, Redis",
    atsScore: "89",
    interviewStatus: "Interview Scheduled",
    offerStatus: "None"
  },
  {
    id: "cand-3",
    name: "Emma Watson",
    email: "emma.watson@prodmgmt.com",
    jobTitle: "Product Manager",
    department: "Product Management",
    experience: "8 years of agile product management",
    skills: "Product Strategy, Scrum, UI/UX Wireframing, Jira, Agile",
    atsScore: "78",
    interviewStatus: "Offer Accepted",
    offerStatus: "Accepted"
  }
];

const CATEGORIES = [
  "Application Received",
  "Resume Shortlisted",
  "Interview Invitation",
  "Interview Reminder",
  "Interview Rescheduled",
  "Interview Rejected",
  "Offer Letter",
  "Offer Reminder",
  "Offer Accepted",
  "Offer Rejected",
  "Joining Instructions",
  "Welcome Email",
  "General Communication"
];

const VARIABLES_LIST = [
  { key: "candidate_name", label: "Candidate Name", desc: "Full name of candidate" },
  { key: "job_title", label: "Job Title", desc: "Role they applied for" },
  { key: "company_name", label: "Company Name", desc: "EncureIT Systems Private Limited" },
  { key: "recruiter_name", label: "Recruiter Name", desc: "Assigned Recruiter" },
  { key: "department", label: "Department", desc: "Team/Department" },
  { key: "experience", label: "Experience Years", desc: "Years/skills level" },
  { key: "ats_score", label: "ATS Score", desc: "AI match score percentage" },
  { key: "skills", label: "Key Skills", desc: "Extracted competencies" },
  { key: "interview_date", label: "Interview Date", desc: "Scheduled date" },
  { key: "interview_time", label: "Interview Time", desc: "Scheduled time" },
  { key: "interview_mode", label: "Interview Mode", desc: "Online / In-Person" },
  { key: "meeting_link", label: "Meeting Link", desc: "Meet/Video URL" },
  { key: "joining_date", label: "Joining Date", desc: "Expected Day 1" },
  { key: "salary", label: "Salary Details", desc: "Annual compensation" },
  { key: "offer_expiry", label: "Offer Expiry", desc: "Decision deadline" },
  { key: "office_location", label: "Office Location", desc: "Workplace address" },
  { key: "custom_message", label: "Custom Message", desc: "General update text" }
];

export default function EmailTemplatesView() {
  const [density, setDensity] = useState(() => PreferenceRepository.getLayoutDensity());
  
  useEffect(() => {
    const handleSettings = () => {
      setDensity(PreferenceRepository.getLayoutDensity());
    };
    window.addEventListener("settings-changed", handleSettings);
    return () => window.removeEventListener("settings-changed", handleSettings);
  }, []);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Application Received");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // Editor form states
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"Active" | "Draft">("Active");
  const [isSystem, setIsSystem] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [newAttachmentName, setNewAttachmentName] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);

  // Search and filter states
  const [searchText, setSearchText] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"All" | "Active" | "Draft" | "AI">("All");

  // Simulated Candidates Preview
  const [selectedCandidate, setSelectedCandidate] = useState(CANDIDATE_PROFILES[0]);
  const [activeTab, setActiveTab] = useState<"preview" | "automation">("preview");

  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiModal, setShowAiModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState("");

  // Email logs state
  const [emailLogs, setEmailLogs] = useState<SimulatedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingMail, setSendingMail] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState("");
  const [templateDeletePending, setTemplateDeletePending] = useState(false);

  // Automation Triggers setup
  const [automationRules, setAutomationRules] = useState([
    { id: "auto-1", trigger: "Application Submitted", template: "Application Received Confirmation", active: true },
    { id: "auto-2", trigger: "ATS Score > 80%", template: "Resume Shortlisted Announcement", active: false },
    { id: "auto-3", trigger: "Interview Scheduled", template: "Technical Interview Invitation", active: true },
    { id: "auto-4", trigger: "Interview 24h Reminder", template: "Upcoming Interview Reminder", active: true },
    { id: "auto-5", trigger: "Candidate Selected", template: "Official Job Offer Letter", active: false },
    { id: "auto-6", trigger: "Offer Accepted", template: "New Hire Day 1 Joining Instructions", active: true }
  ]);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Fetch initial templates & email dispatches
  useEffect(() => {
    fetchTemplatesAndLogs();
  }, []);

  const fetchTemplatesAndLogs = async () => {
    try {
      setLoading(true);
      const [loadedTemplates, loadedLogs] = await Promise.all([
        TemplateRepository.getAll(),
        EmailRepository.getAll()
      ]);
      
      const safeTemplates = Array.isArray(loadedTemplates) ? loadedTemplates : [];
      setTemplates(safeTemplates);

      const safeLogs = Array.isArray(loadedLogs) ? loadedLogs : [];
      setEmailLogs(safeLogs);

      // Select default template from current category
      const defaultForCategory = safeTemplates.find(
        (t: Template) => t.category === selectedCategory
      ) || safeTemplates[0] || null;
      
      selectTemplate(defaultForCategory);
    } catch (e) {
      console.error("Error loading templates/logs", e);
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (temp: Template | null) => {
    setSelectedTemplate(temp);
    if (temp) {
      setTemplateName(temp.name);
      setTemplateCategory(temp.category);
      setSubject(temp.subject);
      setBody(temp.body);
      setStatus(temp.status);
      setIsSystem(!!temp.isSystem);
      setAiGenerated(!!temp.aiGenerated);
      setAttachments(temp.isSystem ? ["Official_Information_Guide.pdf"] : []);
    } else {
      setTemplateName("");
      setTemplateCategory(selectedCategory);
      setSubject("");
      setBody("");
      setStatus("Active");
      setIsSystem(false);
      setAiGenerated(false);
      setAttachments([]);
    }
  };

  const handleCreateNew = async () => {
    try {
      setSaving(true);
      const newTempPayload = {
        name: `New Custom ${selectedCategory} Template`,
        category: selectedCategory,
        subject: "Regarding your application for {{job_title}}",
        body: "Hi {{candidate_name}},\n\n[Write email body here...]\n\nBest regards,\n{{recruiter_name}}\n{{company_name}}",
        status: "Draft",
        isSystem: false,
        aiGenerated: false
      };
      
      const createdTemplate = await TemplateRepository.createOrUpdate(newTempPayload);
      
      setTemplates(prev => [...prev, createdTemplate]);
      selectTemplate(createdTemplate);
      showToast(`Created new template: "${createdTemplate.name}"!`);
    } catch (err) {
      console.error("Error creating new template:", err);
      showToast("Failed to create new template");
    } finally {
      setSaving(false);
    }
  };

  // Save changes
  const handleSaveTemplate = async (targetStatus?: "Active" | "Draft") => {
    if (!templateName.trim()) {
      showToast("Template name cannot be empty");
      return;
    }
    const nextStatus = targetStatus || status;
    const catToUse = templateCategory || selectedCategory;
    setSaving(true);
    try {
      const payload: Partial<Template> = {
        id: selectedTemplate?.id,
        name: templateName,
        category: catToUse,
        subject,
        body,
        status: nextStatus,
        aiGenerated,
        isSystem
      };
      
      const savedTemplate = await TemplateRepository.createOrUpdate(payload);
      showToast(`Template "${savedTemplate.name}" saved successfully as ${nextStatus}!`);
      
      // Update template state
      setTemplates(prev => {
        const index = prev.findIndex(t => t.id === savedTemplate.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = savedTemplate;
          return updated;
        } else {
          return [...prev, savedTemplate];
        }
      });
      setSelectedTemplate(savedTemplate);
      setTemplateName(savedTemplate.name);
      setTemplateCategory(savedTemplate.category);
      setSubject(savedTemplate.subject);
      setBody(savedTemplate.body);
      setStatus(savedTemplate.status || nextStatus);

      // Ensure active category and status filter reflect saved template
      if (savedTemplate.category && savedTemplate.category !== selectedCategory) {
        setSelectedCategory(savedTemplate.category);
      }
      if (selectedStatusFilter !== "All" && selectedStatusFilter !== nextStatus && selectedStatusFilter !== "AI") {
        setSelectedStatusFilter("All");
      }
    } catch (e) {
      console.error("Error saving template", e);
      showToast("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  // Delete current template
  const handleDeleteTemplate = async (skipConfirm = false) => {
    if (!selectedTemplate) return;
    if (selectedTemplate.isSystem) {
      showToast("System standard templates cannot be deleted");
      return;
    }
    if (!skipConfirm) {
      setTemplateDeletePending(true);
      return;
    }
    
    try {
      await TemplateRepository.delete(selectedTemplate.id);
      showToast("Template deleted successfully");
      
      const updated = templates.filter(t => t.id !== selectedTemplate.id);
      setTemplates(updated);
      
      // Select another template
      const nextTemp = updated.find(t => t.category === selectedCategory) || updated[0] || null;
      selectTemplate(nextTemp);
    } catch (e) {
      console.error("Error deleting template", e);
      showToast("Error deleting template");
    } finally {
      setTemplateDeletePending(false);
    }
  };

  // Duplicate current template
  const handleDuplicateTemplate = () => {
    if (!selectedTemplate) return;
    setSelectedTemplate(null);
    setTemplateName(`${templateName} (Copy)`);
    setSubject(subject);
    setBody(body);
    setStatus("Draft");
    setIsSystem(false);
    setAiGenerated(false);
    showToast("Template duplicated to edit tray");
  };

  // Helper to append a variable at the current selection
  const handleInsertVariable = (variable: string) => {
    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    const currentText = body;
    const newText = currentText.substring(0, start) + `{{${variable}}}` + currentText.substring(end);
    setBody(newText);
    
    // Focus back on editor and place cursor right after inserted placeholder
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        editorRef.current.selectionStart = editorRef.current.selectionEnd = start + variable.length + 4;
      }
    }, 0);
  };

  const handleAddAttachment = () => {
    if (!newAttachmentName.trim()) return;
    setAttachments(prev => [...prev, newAttachmentName.trim()]);
    setNewAttachmentName("");
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(""), 4500);
  };

  // AI trigger and edit helpers
  const handleAITransform = async (action: string, langName?: string) => {
    setActionLoading(action);
    try {
      const payload = {
        action,
        subject,
        body,
        targetLanguage: langName,
        context: {
          candidateName: selectedCandidate.name,
          experience: selectedCandidate.experience,
          skills: selectedCandidate.skills,
          jobRole: selectedCandidate.jobTitle,
          department: selectedCandidate.department,
          interviewStatus: selectedCandidate.interviewStatus,
          atsScore: selectedCandidate.atsScore,
          offerStatus: selectedCandidate.offerStatus,
          recruiterName: "Sophia Patel",
          companyName: "EncureIT Systems Private Limited"
        }
      };

      const res = await axios.post("/api/templates/generate", payload);
      if (res.data.subject) setSubject(res.data.subject);
      if (res.data.body) setBody(res.data.body);
      setAiGenerated(true);
      showToast(`AI successfully optimized content using tool: "${action}"!`);
    } catch (err) {
      console.error("AI error:", err);
      showToast("AI Assistant failed to refine template");
    } finally {
      setActionLoading(null);
    }
  };

  // AI generation modal submit
  const handleAIGenerateFull = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setAiError("");
    try {
      const payload = {
        action: "generate",
        prompt: aiPrompt,
        context: {
          candidateName: selectedCandidate.name,
          experience: selectedCandidate.experience,
          skills: selectedCandidate.skills,
          jobRole: selectedCandidate.jobTitle,
          department: selectedCandidate.department,
          interviewStatus: selectedCategory, // Generate for current category
          atsScore: selectedCandidate.atsScore,
          offerStatus: selectedCandidate.offerStatus,
          recruiterName: "Sophia Patel",
          companyName: "EncureIT Systems Private Limited"
        }
      };

      const res = await axios.post("/api/templates/generate", payload);
      
      const newName = `AI ${selectedCategory} Template`;
      const savePayload = {
        name: newName,
        category: selectedCategory,
        subject: res.data.subject || `Application regarding ${selectedCandidate.jobTitle}`,
        body: res.data.body || "",
        status: "Active",
        isSystem: false,
        aiGenerated: true
      };

      const generatedTemplate = await TemplateRepository.createOrUpdate(savePayload);

      setTemplates(prev => [...prev, generatedTemplate]);
      selectTemplate(generatedTemplate);

      setShowAiModal(false);
      setAiPrompt("");
      showToast("Gemini AI has built and saved a brilliant personalized template!");
    } catch (err) {
      console.error("Gemini AI error:", err);
      setAiError("Failed to communicate with AI. Falling back to local template.");
    } finally {
      setGenerating(false);
    }
  };

  // Dispatch mock email
  const handleSendSimulatedMail = async () => {
    setSendingMail(true);
    try {
      // Form variables payload
      const variablesMap = {
        candidate_name: selectedCandidate.name,
        job_title: selectedCandidate.jobTitle,
        company_name: "EncureIT Systems Private Limited",
        recruiter_name: "Sophia Patel",
        department: selectedCandidate.department,
        experience: selectedCandidate.experience,
        skills: selectedCandidate.skills,
        interview_date: "July 24, 2026 at 2:00 PM EST",
        meeting_link: "https://meet.google.com/abc-defg-hij",
        joining_date: "August 10, 2026",
        salary: "₹18,50,000 / year",
        offer_expiry: "July 30, 2026"
      };

      const sentEmail = await EmailRepository.send({
        to: selectedCandidate.email,
        subject: renderPreviewContent(subject),
        body: renderPreviewContent(body),
        variables: variablesMap,
        templateName: templateName
      });

      showToast(`Email dispatched successfully to ${selectedCandidate.name} (${selectedCandidate.email})!`);
      
      // Prepend to list
      setEmailLogs(prev => [sentEmail, ...prev]);
    } catch (e) {
      console.error("Error dispatching email", e);
      showToast("Failed to dispatch email");
    } finally {
      setSendingMail(false);
    }
  };

  // Variable replacement helper for preview render
  const renderPreviewContent = (text: string) => {
    if (!text) return "";
    let rendered = text;
    const replacements: { [key: string]: string } = {
      candidate_name: selectedCandidate.name,
      job_title: selectedCandidate.jobTitle,
      company_name: "EncureIT Systems Private Limited",
      recruiter_name: "Sophia Patel",
      department: selectedCandidate.department,
      experience: selectedCandidate.experience,
      skills: selectedCandidate.skills,
      ats_score: selectedCandidate.atsScore ? `${selectedCandidate.atsScore}%` : "92%",
      interview_date: "July 24, 2026",
      interview_time: "02:30 PM IST",
      interview_mode: "Google Meet (Video Conference)",
      meeting_link: "https://meet.google.com/abc-defg-hij",
      joining_date: "August 10, 2026",
      salary: "₹18,50,000 / year",
      offer_expiry: "July 30, 2026",
      office_location: "EncureIT Tech Park, Building 4, Suite 302, Pune",
      custom_message: "We appreciate your interest in EncureIT Systems Private Limited and wanted to share a quick update regarding your profile."
    };

    Object.keys(replacements).forEach(key => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      rendered = rendered.replace(regex, replacements[key]);
    });
    return rendered;
  };

  // Categories count tracker
  const getCategoryCount = (category: string) => {
    return templates.filter(t => t.category === category).length;
  };

  // Filter templates list based on search, selected category, and active status filter
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchText.toLowerCase()) || 
                          t.subject.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = t.category === selectedCategory;
    
    let matchesStatus = true;
    if (selectedStatusFilter === "Active") {
      matchesStatus = t.status === "Active";
    } else if (selectedStatusFilter === "Draft") {
      matchesStatus = t.status === "Draft";
    } else if (selectedStatusFilter === "AI") {
      matchesStatus = !!t.aiGenerated;
    }
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate metrics
  const totalTemplates = templates.length;
  const activeTemplates = templates.filter(t => t.status === "Active").length;
  const draftTemplates = templates.filter(t => t.status === "Draft").length;
  const aiGeneratedTemplates = templates.filter(t => t.aiGenerated).length;
  const automatedEmailsSent = emailLogs.length + 142; // Add realistic dummy count + actual logs
  const recentlyUsed = emailLogs[0]?.templateName || "Technical Interview Invitation";

  const handleToggleRule = (id: string) => {
    setAutomationRules(prev => prev.map(rule => {
      if (rule.id === id) {
        return { ...rule, active: !rule.active };
      }
      return rule;
    }));
    showToast("Automation trigger updated!");
  };

  return (
    <div className={`${density === "compact" ? "p-4 space-y-4" : "p-8 space-y-8"} max-w-7xl mx-auto text-slate-800 dark:text-slate-100 pb-12 transition-all text-left`} id="email-templates-container">
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-5 py-3.5 rounded-xl border border-slate-800 shadow-xl"
          >
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Container grouping Breadcrumbs and Page Header to control exact spacing */}
      <div className="space-y-1.5 text-left">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-left">
          <span>Recruitment</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600 dark:text-slate-300 font-extrabold">Email Templates</span>
        </div>

        {/* View Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Mail className="h-7 w-7 text-indigo-600" />
              <span>Email Templates Library</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-left">
              Create, edit, preview, and automate your communication with candidates using customized, Gemini-enhanced templates.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow-indigo-500/10 transition-all border border-indigo-500/10 cursor-pointer"
            >
              <Sparkles className="h-4.5 w-4.5 text-indigo-200 animate-pulse" />
              Generate with AI
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm animate-in fade-in"
            >
              <Plus className="h-4.5 w-4.5" />
              New Template
            </button>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS METRICS SECTION */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-in fade-in duration-300" id="metrics-summary">
        {[
          { title: "Total Templates", value: loading ? "..." : totalTemplates, status: "All", icon: Mail, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30", action: () => { setSelectedStatusFilter("All"); showToast("Showing all templates in this category"); } },
          { title: "Active Templates", value: loading ? "..." : activeTemplates, status: "Active", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30", action: () => { setSelectedStatusFilter("Active"); showToast("Filtered to Active templates"); } },
          { title: "Draft Templates", value: loading ? "..." : draftTemplates, status: "Draft", icon: FileText, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", action: () => { setSelectedStatusFilter("Draft"); showToast("Filtered to Draft templates"); } },
          { title: "AI Generated", value: loading ? "..." : aiGeneratedTemplates, status: "AI", icon: Sparkles, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30", action: () => { setSelectedStatusFilter("AI"); showToast("Filtered to AI Generated templates"); } },
          { title: "Automated Sent", value: automatedEmailsSent, status: "Sent", icon: Send, color: "text-sky-600 bg-sky-50 dark:bg-sky-950/30", action: () => { const target = document.getElementById("email-history-logs"); if (target) { target.scrollIntoView({ behavior: "smooth" }); showToast("Scrolled to dispatch logs"); } } },
          { title: "Recently Used", value: recentlyUsed, status: "Recent", icon: Clock, color: "text-pink-600 bg-pink-50 dark:bg-pink-950/30", action: () => { const found = templates.find(t => t.name === recentlyUsed); if (found) { setSelectedCategory(found.category); selectTemplate(found); showToast(`Selected recently used template: "${found.name}"`); } else { showToast(`Recently used: "${recentlyUsed}"`); } } }
        ].map((card, idx) => {
          const Icon = card.icon;
          const isSelected = selectedStatusFilter === card.status;
          return (
            <button
              key={`metric-card-${card.status}-${idx}`}
              onClick={card.action}
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

              <div className="mt-2.5 w-full overflow-hidden text-ellipsis">
                <span className={`text-xl font-extrabold font-mono leading-none block truncate ${isSelected ? "text-white" : "text-slate-900 dark:text-white"}`}>{card.value}</span>
                <span className={`text-[10px] font-medium block mt-1 truncate ${isSelected ? "text-indigo-200" : "text-slate-400 dark:text-slate-500"}`}>
                  {card.status === "Recent" ? "Click to edit" : card.status === "Sent" ? "View history logs" : "Click to filter"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* MAIN CONTENT SPLIT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* COLUMN 1: LEFT SIDEBAR PANEL (4/12 columns) */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          {/* Categories card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="p-4.5 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-950">Template Categories</h2>
              <p className="text-xs text-slate-500 mt-0.5">Select a group to manage templates</p>
              
              {/* Intelligent Search Input */}
              <div className="relative mt-3">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search templates in category..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>
            
            <div className="p-2 max-h-[460px] overflow-y-auto space-y-0.5 scrollbar-thin">
              {CATEGORIES.map((cat, idx) => {
                const isSelected = selectedCategory === cat;
                const count = getCategoryCount(cat);
                return (
                  <button
                    key={`cat-${cat}-${idx}`}
                    onClick={() => {
                      setSelectedCategory(cat);
                      // Select the first template of the new category or empty
                      const firstTemp = templates.find(t => t.category === cat) || null;
                      selectTemplate(firstTemp);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected 
                        ? "bg-indigo-50 border-l-2 border-indigo-600 text-indigo-700" 
                        : "text-slate-600 hover:bg-slate-50 border-l-2 border-transparent"
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      isSelected ? "bg-indigo-200 text-indigo-800" : "bg-slate-100 text-slate-500"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI RECRUITING RECOMMENDATIONS PANEL */}
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-slate-800 rounded-xl shadow-md p-4.5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-200">AI Recruiter Insights</h3>
            </div>
            
            <div className="space-y-4 text-xs">
              <div className="border-l-2 border-indigo-500 pl-3.5">
                <p className="font-semibold text-slate-100">Tailor for Campus Hires</p>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  AI recommends using a friendlier, highly enthusiastic tone for junior or campus candidates to boost reply rates by 22%.
                </p>
              </div>

              <div className="border-l-2 border-emerald-500 pl-3.5">
                <p className="font-semibold text-slate-100">Optimal Invitation Timing</p>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  Interview templates sent on Tuesday mornings have the highest calendar booking rate (74%).
                </p>
              </div>

              <div className="border-l-2 border-violet-500 pl-3.5">
                <p className="font-semibold text-slate-100">Speed Up Offers</p>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  Offer letters dispatched within 24 hours of final evaluation see 15% higher acceptance rates.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: CENTER PANEL (PROFESSIONAL EDITOR) (5/12 columns) */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col overflow-hidden">
          {/* Editor Header */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-slate-500" />
              <span className="text-sm font-semibold text-slate-900 truncate">
                {selectedTemplate ? `Editing: ${selectedTemplate.name}` : "Create Custom Template"}
              </span>
              {isSystem && (
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-md font-mono">
                  System Standard
                </span>
              )}
              {aiGenerated && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-semibold rounded-md font-mono flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              {selectedTemplate && !selectedTemplate.isSystem && (
                templateDeletePending ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-lg border border-rose-100">
                    <span className="text-[10px] text-rose-600 font-bold px-1">Sure?</span>
                    <button
                      onClick={() => handleDeleteTemplate(true)}
                      className="px-2 py-1 bg-red-600 text-white font-bold text-[10px] rounded hover:bg-red-700 cursor-pointer transition-all"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setTemplateDeletePending(false)}
                      className="px-2 py-1 bg-slate-100 text-slate-600 font-bold text-[10px] rounded hover:bg-slate-200 cursor-pointer transition-all"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDeleteTemplate(false)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete Template"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                )
              )}
              {selectedTemplate && (
                <button
                  onClick={handleDuplicateTemplate}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  title="Duplicate Template"
                >
                  <Copy className="h-4.5 w-4.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sub-navigation of available templates in current category */}
          <div className="px-4 py-2 border-b border-slate-150 bg-slate-50/50 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Templates:</span>
            {filteredTemplates.length === 0 ? (
              <span className="text-xs text-slate-400 italic">No custom templates in this stage yet</span>
            ) : (
              filteredTemplates.map((t, idx) => {
                const isActive = selectedTemplate?.id === t.id;
                return (
                  <button
                    key={t.id ? `tmpl-${t.id}-${idx}` : `tmpl-${idx}`}
                    onClick={() => selectTemplate(t)}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-all shrink-0 cursor-pointer ${
                      isActive 
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" 
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })
            )}
          </div>

          {/* Editor Form fields */}
          <div className="p-5 flex-1 space-y-4">
            {/* Template Name & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  disabled={isSystem}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="e.g. Technical Session Invite"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Recruitment Stage Category</label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  disabled={isSystem}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                >
                  {CATEGORIES.map((c, idx) => (
                    <option key={`opt-${c}-${idx}`} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Email Subject */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                placeholder="e.g. Action Required: Interview Scheduled for {{job_title}}"
              />
            </div>

            {/* Email Body */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Body Content</label>
                <span className="text-[10px] text-slate-400 font-mono">Accepts double-curly-bracket variables</span>
              </div>
              <textarea
                ref={editorRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="w-full p-3.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800 leading-relaxed bg-slate-50/20"
                placeholder="Hi {{candidate_name}}, ..."
              />
            </div>

            {/* Variables helper Grid */}
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Insert Variables (Click to Add at Cursor)</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {VARIABLES_LIST.map((v, idx) => (
                  <button
                    key={`var-${v.key}-${idx}`}
                    onClick={() => handleInsertVariable(v.key)}
                    className="px-2 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded border border-slate-200 hover:border-indigo-200 text-[10px] font-semibold text-slate-600 transition-all text-left truncate flex flex-col"
                    title={v.desc}
                  >
                    <span>{`{{${v.key}}}`}</span>
                    <span className="text-[9px] text-slate-400 font-normal truncate mt-0.5">{v.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Attachments panel */}
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Attached Documents</span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attachments.map((file, i) => (
                  <div key={`att-${file}-${i}`} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-lg border border-slate-200">
                    <FileText className="h-3 w-3 text-slate-500" />
                    <span>{file}</span>
                    <button onClick={() => handleRemoveAttachment(i)} className="text-slate-400 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <span className="text-xs text-slate-400 italic">No documents attached</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Interview_Preparation_Guide.pdf"
                  value={newAttachmentName}
                  onChange={(e) => setNewAttachmentName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
                />
                <button
                  onClick={handleAddAttachment}
                  className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Dedicated AI Assistant Bar */}
          <div className="px-5 py-3.5 bg-indigo-950 text-white border-t border-indigo-900">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 shrink-0 text-indigo-200 text-[10px] uppercase font-bold tracking-wider">
                <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
                <span>AI Template Copilot:</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-1">
                {/* Tone changers */}
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleAITransform("improve")}
                  className="px-2.5 py-1 bg-white/10 hover:bg-indigo-600 disabled:opacity-50 text-[10px] font-semibold rounded-md border border-indigo-700 hover:border-indigo-500 transition-all cursor-pointer"
                >
                  {actionLoading === "improve" ? "Improving..." : "Improve Tone"}
                </button>
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleAITransform("friendly")}
                  className="px-2.5 py-1 bg-white/10 hover:bg-indigo-600 disabled:opacity-50 text-[10px] font-semibold rounded-md border border-indigo-700 hover:border-indigo-500 transition-all cursor-pointer"
                >
                  {actionLoading === "friendly" ? "Friendly..." : "Friendly"}
                </button>
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleAITransform("professional")}
                  className="px-2.5 py-1 bg-white/10 hover:bg-indigo-600 disabled:opacity-50 text-[10px] font-semibold rounded-md border border-indigo-700 hover:border-indigo-500 transition-all cursor-pointer"
                >
                  {actionLoading === "professional" ? "Formal..." : "Professional"}
                </button>
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleAITransform("shorten")}
                  className="px-2.5 py-1 bg-white/10 hover:bg-indigo-600 disabled:opacity-50 text-[10px] font-semibold rounded-md border border-indigo-700 hover:border-indigo-500 transition-all cursor-pointer"
                >
                  {actionLoading === "shorten" ? "Shortening..." : "Shorten"}
                </button>
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleAITransform("expand")}
                  className="px-2.5 py-1 bg-white/10 hover:bg-indigo-600 disabled:opacity-50 text-[10px] font-semibold rounded-md border border-indigo-700 hover:border-indigo-500 transition-all cursor-pointer"
                >
                  {actionLoading === "expand" ? "Expanding..." : "Expand"}
                </button>
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleAITransform("grammar")}
                  className="px-2.5 py-1 bg-white/10 hover:bg-indigo-600 disabled:opacity-50 text-[10px] font-semibold rounded-md border border-indigo-700 hover:border-indigo-500 transition-all cursor-pointer"
                >
                  {actionLoading === "grammar" ? "Fixing..." : "Grammar Check"}
                </button>
                
                {/* Translator dropdown simulation */}
                <div className="relative group">
                  <button
                    disabled={!!actionLoading}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-indigo-600 disabled:opacity-50 text-[10px] font-semibold rounded-md border border-indigo-700 transition-all cursor-pointer"
                  >
                    <Languages className="h-3.5 w-3.5" />
                    Translate
                  </button>
                  <div className="absolute bottom-full right-0 mb-2 w-32 bg-slate-900 border border-slate-800 rounded-lg shadow-xl hidden group-hover:block z-50 text-slate-300">
                    <button onClick={() => handleAITransform("translate", "Spanish")} className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-indigo-600 hover:text-white transition-all">Spanish 🇪🇸</button>
                    <button onClick={() => handleAITransform("translate", "French")} className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-indigo-600 hover:text-white transition-all">French 🇫🇷</button>
                    <button onClick={() => handleAITransform("translate", "German")} className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-indigo-600 hover:text-white transition-all">German 🇩🇪</button>
                    <button onClick={() => handleAITransform("translate", "Japanese")} className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-indigo-600 hover:text-white transition-all">Japanese 🇯🇵</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Save options</span>
              <div className="flex gap-1 mt-1">
                <button
                  disabled={saving}
                  onClick={() => handleSaveTemplate("Active")}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Template
                </button>
                <button
                  disabled={saving}
                  onClick={() => handleSaveTemplate("Draft")}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Save Draft
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase block text-right">Send simulation</span>
              <button
                disabled={sendingMail}
                onClick={handleSendSimulatedMail}
                className="mt-1 flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                title={`Simulate sending of this template to selected Candidate ${selectedCandidate.name}`}
              >
                {sendingMail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send Mock Email
              </button>
            </div>
          </div>
        </div>

        {/* COLUMN 3: RIGHT PANEL (PREVIEW & AUTOMATION RULES) (4/12 columns) */}
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col overflow-hidden">
          {/* Tab Selection */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                activeTab === "preview" 
                  ? "border-indigo-600 text-indigo-700 bg-white" 
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Eye className="h-4 w-4" />
                Live Preview
              </div>
            </button>
            <button
              onClick={() => setActiveTab("automation")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                activeTab === "automation" 
                  ? "border-indigo-600 text-indigo-700 bg-white" 
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Settings className="h-4 w-4" />
                Automation triggers
              </div>
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto">
            {/* TAB 1: LIVE PREVIEW PANEL */}
            {activeTab === "preview" && (
              <div className="space-y-4">
                {/* Candidate Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Render Content For Candidate:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CANDIDATE_PROFILES.map((c, idx) => {
                      const isSelected = selectedCandidate.id === c.id;
                      return (
                        <button
                          key={c.id ? `cand-${c.id}-${idx}` : `cand-${idx}`}
                          onClick={() => setSelectedCandidate(c)}
                          className={`px-2 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-slate-900 border-slate-900 text-white shadow-xs" 
                              : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <p className="text-[10px] font-bold truncate">{c.name}</p>
                          <p className="text-[9px] opacity-80 mt-0.5 truncate">{c.jobTitle}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Styled Email Frame */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-md">
                  {/* Window Controls bar */}
                  <div className="bg-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-200 text-slate-400">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                    </div>
                    <span className="text-[10px] font-mono select-none">EncureIT Systems Mail Server</span>
                    <div className="w-9"></div>
                  </div>

                  {/* Mail header fields */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 text-[11px] space-y-1.5 font-sans">
                    <div className="flex">
                      <span className="w-12 text-slate-400 font-medium">To:</span>
                      <span className="text-slate-800 font-semibold truncate">
                        {selectedCandidate.name} &lt;{selectedCandidate.email}&gt;
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-12 text-slate-400 font-medium">From:</span>
                      <span className="text-slate-800 font-medium truncate">Sophia Patel &lt;recruiting@encureit.com&gt;</span>
                    </div>
                    <div className="flex">
                      <span className="w-12 text-slate-400 font-medium">Subject:</span>
                      <span className="text-slate-900 font-bold leading-tight">
                        {renderPreviewContent(subject) || "[No Subject Line]"}
                      </span>
                    </div>
                  </div>

                  {/* Mail Body Render */}
                  <div className="p-5 min-h-[300px] bg-white text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                    {renderPreviewContent(body) || (
                      <span className="text-slate-400 italic font-mono">[No Body Content Provided]</span>
                    )}
                  </div>

                  {/* Mail Footer Info */}
                  <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Generated: Just now</span>
                    <span>Status: Ready to Send</span>
                  </div>
                </div>

                {/* Candidate ATS Score Quick Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg font-bold ${
                      parseInt(selectedCandidate.atsScore) >= 85 
                        ? "bg-emerald-50 text-emerald-600" 
                        : "bg-indigo-50 text-indigo-600"
                    }`}>
                      {selectedCandidate.atsScore}%
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">ATS Evaluation Match</p>
                      <p className="text-[10px] text-slate-400">Match score for {selectedCandidate.jobTitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">{selectedCandidate.interviewStatus}</p>
                    <p className="text-[10px] text-slate-400">Current candidate stage</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: AUTOMATION TRIGGER RULES */}
            {activeTab === "automation" && (
              <div className="space-y-4">
                <div className="p-3 bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-xl text-xs leading-relaxed flex items-start gap-2">
                  <AlertCircle className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Automation Engine Active:</span> When a candidate advances to the trigger stage, the respective active email template will be queued and sent automatically without manual input.
                  </div>
                </div>

                <div className="space-y-3">
                  {automationRules.map((rule, idx) => (
                    <div key={rule.id ? `rule-${rule.id}-${idx}` : `rule-${idx}`} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-[9px] font-bold uppercase rounded-md font-mono">Trigger</span>
                          <span className="text-xs font-semibold text-slate-900">{rule.trigger}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <ChevronRight className="h-3 w-3 text-slate-400" />
                          <span className="truncate max-w-[180px]" title={rule.template}>Sends template: {rule.template}</span>
                        </div>
                      </div>

                      {/* Toggle button */}
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={`w-12 h-6.5 rounded-full transition-all relative shrink-0 cursor-pointer ${
                          rule.active ? "bg-indigo-600" : "bg-slate-300"
                        }`}
                      >
                        <span className={`w-5.5 h-5.5 rounded-full bg-white absolute top-0.5 shadow-xs transition-all ${
                          rule.active ? "right-0.5" : "left-0.5"
                        }`}></span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Custom automation logic builder teaser */}
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center">
                  <p className="text-xs font-bold text-slate-700">Add Custom Automation Workflow</p>
                  <p className="text-[10px] text-slate-400 mt-1">Configure multi-stage triggers or conditional routing parameters.</p>
                  <button className="mt-3.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200 transition-all cursor-pointer">
                    Setup New Trigger Rule
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: EMAIL HISTORY & ANALYTICS TABLE */}
      <div className="px-6 mt-8" id="email-history-logs">
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-950 flex items-center gap-1.5">
                <History className="h-4.5 w-4.5 text-slate-500" />
                Email Dispatch History Logs
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Logs of all mock and automated emails dispatched to candidates from this ATS instance</p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Live telemetry:</span>
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                ACTIVE MONITOR
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  <th className="p-4">Candidate Recipient</th>
                  <th className="p-4">Template Used</th>
                  <th className="p-4">Email Subject Line</th>
                  <th className="p-4">Dispatched By</th>
                  <th className="p-4">Sent Timestamp</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700 font-sans">
                {emailLogs.map((log, idx) => {
                  let badgeColor = "bg-slate-100 text-slate-700";
                  if (log.status === "Opened") badgeColor = "bg-indigo-50 text-indigo-700 border border-indigo-100";
                  if (log.status === "Clicked") badgeColor = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                  if (log.status === "Failed") badgeColor = "bg-red-50 text-red-700 border border-red-100";

                  return (
                    <tr key={log.id ? `log-${log.id}-${idx}` : `log-${idx}`} className="hover:bg-slate-50 transition-all font-sans">
                      <td className="p-4 font-semibold text-slate-900">
                        <div>
                          <span>{log.to}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {log.templateName}
                      </td>
                      <td className="p-4 max-w-[280px] truncate text-slate-500" title={log.subject}>
                        {log.subject}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-500">
                        {log.sentBy}
                      </td>
                      <td className="p-4 text-slate-400 font-mono text-[10px]">
                        {new Date(log.sentAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${badgeColor}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {emailLogs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      No emails have been simulated or logged yet. Use "Send Mock Email" above to dispatch your first email!
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-600" />
                      <p className="text-xs text-slate-500 mt-2">Loading logs from server...</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FULL-STAGE AI GENERATE MODAL */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-800"
            >
              <div className="p-4.5 bg-gradient-to-r from-indigo-950 to-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
                  <h3 className="font-semibold text-sm">Gemini AI Email Architect</h3>
                </div>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <form onSubmit={handleAIGenerateFull} className="p-5 space-y-4">
                <div className="p-3 bg-indigo-50 text-indigo-800 rounded-xl text-xs leading-relaxed flex gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    This will automatically draft a brilliant, highly tailored recruitment template for the active stage category (<strong>{selectedCategory}</strong>) based on the candidate's custom skills, background, score, and your customized instructions.
                  </div>
                </div>

                {/* Candidate context recap */}
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Selected Persona Context</span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">{selectedCandidate.name}</p>
                      <p className="text-slate-500 text-[10px] mt-0.5">{selectedCandidate.jobTitle} • {selectedCandidate.department}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-md font-mono">
                        ATS {selectedCandidate.atsScore}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Special prompts input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Custom Instructions / Prompt (Optional)</label>
                  <textarea
                    rows={4}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans text-slate-800"
                    placeholder="e.g. Highlight our hybrid flexibility and specify they need to review the technical brief attached. Keep the tone extremely exciting."
                  />
                </div>

                {aiError && (
                  <div className="text-red-600 text-xs font-medium flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    <span>{aiError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Generating Draft...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate Template
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
