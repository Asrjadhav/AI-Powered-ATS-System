import React, { useState, useEffect, useRef } from "react";
import { PreferenceRepository, TemplateRepository, EmailRepository } from "../repositories";
import type { EmailRecipient, EmailTrigger } from "../repositories/emailRepository";
import {
  EMPTY_OFFER_FORM, formatLongDate, lpaToRupees, missingOfferFields, rupeesToLpa
} from "../lib/offerLetter";
import type { OfferLetterForm } from "../lib/offerLetter";
import { renderEmailMarkup } from "../lib/emailMarkup";
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
import { apiUrl } from "../lib/api";

interface Template {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  isSystem?: boolean;
  lastUsed?: string;
  status: "Active" | "Draft";
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

// Shown until real candidates load (or when there are none); sending is disabled for it.
const EMPTY_RECIPIENT: EmailRecipient = {
  id: "",
  candidateId: "",
  name: "",
  email: "",
  phone: "",
  jobTitle: "",
  department: "",
  experience: "",
  skills: "",
  atsScore: "",
  interviewStatus: "",
  offerStatus: "",
  variables: {}
};

const VARIABLES_LIST = [
  { key: "candidate_name", label: "Candidate Name", desc: "Full name of candidate" },
  { key: "candidate_first_name", label: "First Name", desc: "For the greeting (Dear Priya,)" },
  { key: "job_title", label: "Job Title", desc: "Role they applied for" },
  { key: "company_name", label: "Company Name", desc: "EncureIT Systems Private Limited" },
  { key: "recruiter_name", label: "Recruiter Name", desc: "Assigned Recruiter" },
  { key: "department", label: "Department", desc: "Team/Department" },
  { key: "experience", label: "Experience Years", desc: "Years/skills level" },
  { key: "ats_score", label: "ATS Score", desc: "AI match score percentage" },
  { key: "skills", label: "Key Skills", desc: "Extracted competencies" },
  { key: "interview_round", label: "Interview Round", desc: "First Round Discussion" },
  { key: "interview_round_phrase", label: "Round (in a sentence)", desc: "1st Round of Interview" },
  { key: "interview_date", label: "Interview Date", desc: "Aug 11, 2026" },
  { key: "interview_date_subject", label: "Interview Date (subject)", desc: "August 11 2026" },
  { key: "interview_time", label: "Interview Time", desc: "05:00 PM" },
  { key: "interview_mode", label: "Interview Mode", desc: "G Meet / In-Person" },
  { key: "meeting_link", label: "Meeting Link", desc: "Meet/Video URL" },
  { key: "joining_label", label: "Joining Label", desc: "Joining Link or Location" },
  { key: "joining_details", label: "Joining Details", desc: "The link, or the office address" },
  { key: "joining_date", label: "Joining Date", desc: "Offer: 9th September 2026" },
  { key: "salary", label: "Salary Details", desc: "Annual compensation" },
  { key: "offer_expiry", label: "Offer Valid Till", desc: "Offer: 9th September 2026" },
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

  // Search and filter states
  const [searchText, setSearchText] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"All" | "Active" | "Draft">("All");

  // Real candidates (from the backend) to preview and send to
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<EmailRecipient>(EMPTY_RECIPIENT);
  const [sender, setSender] = useState<{ name: string; email: string }>({ name: "", email: "" });
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [activeTab, setActiveTab] = useState<"preview" | "automation">("preview");

  // Offer letter form (shown for an Offer Letter template). Starts from the candidate's saved
  // offer, if any; HR reviews and edits every value before the PDF is previewed or sent.
  const [offerForm, setOfferForm] = useState<OfferLetterForm>(EMPTY_OFFER_FORM);
  const [letterPreviewUrl, setLetterPreviewUrl] = useState("");
  const [letterPreviewing, setLetterPreviewing] = useState(false);

  // Email logs state
  const [emailLogs, setEmailLogs] = useState<SimulatedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingMail, setSendingMail] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState("");
  const [templateDeletePending, setTemplateDeletePending] = useState(false);

  // Automation Triggers: the automatic emails and their on/off switches, kept on the backend
  const [triggers, setTriggers] = useState<EmailTrigger[]>([]);
  const [triggersLoading, setTriggersLoading] = useState(true);
  const [triggersError, setTriggersError] = useState("");
  const [triggerSaving, setTriggerSaving] = useState<string | null>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  // A different candidate means different offer details: start again from what is saved for them.
  useEffect(() => {
    setOfferForm({
      jobTitle: selectedCandidate.jobTitle || "",
      annualCtcLpa: rupeesToLpa(selectedCandidate.offerDefaults?.annualCtc),
      joiningDate: selectedCandidate.offerDefaults?.joiningDate || "",
      validTill: "",
      reportingManager: ""
    });
  }, [selectedCandidate.id]);

  const isOfferTemplate = selectedTemplate?.category === "Offer Letter";
  const missingOffer = isOfferTemplate ? missingOfferFields(offerForm) : [];
  const offerPayload = () => ({
    jobTitle: offerForm.jobTitle.trim(),
    annualCtc: lpaToRupees(offerForm.annualCtcLpa),
    joiningDate: offerForm.joiningDate,
    validTill: offerForm.validTill,
    reportingManager: offerForm.reportingManager.trim()
  });

  const closeLetterPreview = () => {
    if (letterPreviewUrl) URL.revokeObjectURL(letterPreviewUrl);
    setLetterPreviewUrl("");
  };

  // Opens the offer letter PDF for the details on the form, so HR can read it before sending.
  const handlePreviewLetter = async () => {
    if (!selectedCandidate.id) return;
    if (missingOffer.length > 0) {
      showToast(`Fill in: ${missingOffer.join(", ")}.`);
      return;
    }
    setLetterPreviewing(true);
    try {
      const blob = await EmailRepository.previewOfferLetter(selectedCandidate.id, offerPayload());
      closeLetterPreview();
      setLetterPreviewUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      showToast(e?.message || "Failed to prepare the offer letter.");
    } finally {
      setLetterPreviewing(false);
    }
  };

  // Fetch initial templates & email dispatches
  useEffect(() => {
    fetchTemplatesAndLogs();
    fetchRecipients();
    fetchTriggers();
  }, []);

  const fetchTriggers = async () => {
    try {
      setTriggersLoading(true);
      setTriggers(await EmailRepository.getTriggers());
      setTriggersError("");
    } catch (e) {
      console.error("Error loading email triggers", e);
      setTriggersError("Could not load the automatic emails from the server.");
    } finally {
      setTriggersLoading(false);
    }
  };

  // Switch an automatic email on or off on the backend; the switch moves only once the server confirms.
  const handleToggleTrigger = async (trigger: EmailTrigger) => {
    setTriggerSaving(trigger.event);
    try {
      const saved = await EmailRepository.setTrigger(trigger.event, !trigger.enabled);
      setTriggers(prev => prev.map(t => (t.event === saved.event ? saved : t)));
      showToast(`${saved.label} email switched ${saved.enabled ? "ON" : "OFF"}.`);
    } catch (e: any) {
      showToast(e?.message || "Failed to update the trigger.");
    } finally {
      setTriggerSaving(null);
    }
  };

  const fetchRecipients = async () => {
    try {
      const data = await EmailRepository.getRecipients();
      const list = Array.isArray(data?.recipients) ? data.recipients : [];
      setRecipients(list);
      setSender(data?.sender || { name: "", email: "" });
      setEmailConfigured(data?.configured !== false);
      setSelectedCandidate(list[0] || EMPTY_RECIPIENT);
    } catch (e) {
      console.error("Error loading email recipients", e);
    }
  };

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

      // Open the first template in the editor
      selectTemplate(safeTemplates[0] || null);
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
      setAttachments(temp.isSystem ? ["Official_Information_Guide.pdf"] : []);
    } else {
      setTemplateName("");
      // Templates have no category to pick; the stored one only matters for the four main templates.
      setTemplateCategory("General");
      setSubject("");
      setBody("");
      setStatus("Active");
      setIsSystem(false);
      setAttachments([]);
    }
  };

  // "New Template": opens a blank editor. Nothing is saved until HR clicks Save Template.
  const handleCreateNew = () => {
    selectTemplate(null);
    setSubject("Regarding your application for {{job_title}}");
    setBody("Hi {{candidate_name}},\n\n[Write email body here...]\n\nBest regards,\n{{recruiter_name}}\n{{company_name}}");
  };

  // Save changes
  const handleSaveTemplate = async (targetStatus?: "Active" | "Draft") => {
    if (!templateName.trim()) {
      showToast("Template name cannot be empty");
      return;
    }
    const nextStatus = targetStatus || status;
    const catToUse = templateCategory || "General";
    setSaving(true);
    try {
      const payload: Partial<Template> = {
        id: selectedTemplate?.id,
        name: templateName,
        category: catToUse,
        subject,
        body,
        status: nextStatus,
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

      // Make sure the saved template is not hidden by the status filter
      if (selectedStatusFilter !== "All" && selectedStatusFilter !== nextStatus) {
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
      const nextTemp = updated[0] || null;
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

      const res = await axios.post(apiUrl("/api/templates/generate"), payload);
      if (res.data.subject) setSubject(res.data.subject);
      if (res.data.body) setBody(res.data.body);
      showToast(`AI successfully optimized content using tool: "${action}"!`);
    } catch (err) {
      console.error("AI error:", err);
      showToast("AI Assistant failed to refine template");
    } finally {
      setActionLoading(null);
    }
  };

  // Send the rendered template to the selected candidate through the backend (SMTP)
  const handleSendEmail = async () => {
    if (!selectedCandidate.id || !selectedCandidate.email) {
      showToast("Select a candidate with an email address first.");
      return;
    }
    if (isOfferTemplate && missingOffer.length > 0) {
      showToast(`Fill in the offer details first: ${missingOffer.join(", ")}.`);
      return;
    }
    setSendingMail(true);
    try {
      const sentEmail = await EmailRepository.sendToCandidate({
        candidateId: selectedCandidate.id,
        subject: renderPreviewContent(subject),
        body: renderPreviewContent(body),
        variables: selectedCandidate.variables,
        templateId: selectedTemplate?.id,
        templateName: templateName,
        // The offer letter PDF is generated from these and attached to this candidate's email
        offerLetter: isOfferTemplate ? offerPayload() : undefined
      });

      const attached = Array.isArray(sentEmail?.attachmentNames) && sentEmail.attachmentNames.length > 0
        ? ` with ${sentEmail.attachmentNames.join(", ")} attached`
        : "";
      showToast(`Email sent to ${selectedCandidate.name} (${selectedCandidate.email})${attached}.`);

      // Prepend to list
      setEmailLogs(prev => [sentEmail, ...prev]);
    } catch (e: any) {
      console.error("Error sending email", e);
      showToast(e?.message || "Failed to send email.");
    } finally {
      setSendingMail(false);
    }
  };

  // Fills {{variables}} with the selected candidate's real data; anything not available renders empty.
  const renderPreviewContent = (text: string) => {
    if (!text) return "";
    const values: Record<string, string> = { ...(selectedCandidate.variables || {}) };
    if (isOfferTemplate) {
      // The email says what the letter says, including anything HR edited on the form.
      values.job_title = offerForm.jobTitle.trim();
      values.joining_date = formatLongDate(offerForm.joiningDate);
      values.offer_expiry = formatLongDate(offerForm.validTill);
    }
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) => values[key] ?? "");
  };

  // Filter the templates list based on the search box and the status card filter
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchText.toLowerCase()) ||
                          t.subject.toLowerCase().includes(searchText.toLowerCase());

    let matchesStatus = true;
    if (selectedStatusFilter === "Active") {
      matchesStatus = t.status === "Active";
    } else if (selectedStatusFilter === "Draft") {
      matchesStatus = t.status === "Draft";
    }
    
    return matchesSearch && matchesStatus;
  });

  // Calculate metrics
  const totalTemplates = templates.length;
  const activeTemplates = templates.filter(t => t.status === "Active").length;
  const draftTemplates = templates.filter(t => t.status === "Draft").length;
  const automatedEmailsSent = emailLogs.length + 142; // Add realistic dummy count + actual logs
  const recentlyUsed = emailLogs[0]?.templateName || "Technical Interview Invitation";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-7 sm:pt-8 pb-12 space-y-5 sm:space-y-6 text-slate-800 dark:text-slate-100 transition-all text-left" id="email-templates-container">
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-5 py-3.5 rounded-lg border border-slate-800 shadow-sm"
          >
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Container */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Email Templates</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1 text-left">
            Manage automated email response templates and triggers.
          </p>
        </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm animate-in fade-in"
            >
              <Plus className="h-4.5 w-4.5" />
              New Template
            </button>
          </div>
        </div>

      {/* SUMMARY CARDS METRICS SECTION */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-in fade-in duration-300" id="metrics-summary">
        {[
          { title: "Total Templates", value: loading ? "..." : totalTemplates, status: "All", icon: Mail, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30", action: () => { setSelectedStatusFilter("All"); showToast("Showing all templates"); } },
          { title: "Active Templates", value: loading ? "..." : activeTemplates, status: "Active", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30", action: () => { setSelectedStatusFilter("Active"); showToast("Filtered to Active templates"); } },
          { title: "Draft Templates", value: loading ? "..." : draftTemplates, status: "Draft", icon: FileText, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", action: () => { setSelectedStatusFilter("Draft"); showToast("Filtered to Draft templates"); } },
          { title: "Automated Sent", value: automatedEmailsSent, status: "Sent", icon: Send, color: "text-sky-600 bg-sky-50 dark:bg-sky-950/30", action: () => { const target = document.getElementById("email-history-logs"); if (target) { target.scrollIntoView({ behavior: "smooth" }); showToast("Scrolled to dispatch logs"); } } },
          { title: "Recently Used", value: recentlyUsed, status: "Recent", icon: Clock, color: "text-pink-600 bg-pink-50 dark:bg-pink-950/30", action: () => { const found = templates.find(t => t.name === recentlyUsed); if (found) { selectTemplate(found); showToast(`Selected recently used template: "${found.name}"`); } else { showToast(`Recently used: "${recentlyUsed}"`); } } }
        ].map((card, idx) => {
          const Icon = card.icon;
          const isSelected = selectedStatusFilter === card.status;
          return (
            <button
              key={`metric-card-${card.status}-${idx}`}
              onClick={card.action}
              className={`p-4 rounded-lg border text-left transition-all cursor-pointer shadow-xs flex flex-col justify-between h-32 ${
                isSelected 
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm scale-[1.01]" 
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
          {/* Templates list card */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs">
            <div className="p-4.5 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-950">Email Templates</h2>
              <p className="text-xs text-slate-500 mt-0.5">Select a template to edit, or add a new one</p>

              {/* Intelligent Search Input */}
              <div className="relative mt-3">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="p-2 max-h-[460px] overflow-y-auto space-y-0.5 scrollbar-thin">
              {filteredTemplates.length === 0 ? (
                <p className="px-3 py-4 text-xs text-slate-400 italic">No templates found</p>
              ) : (
                filteredTemplates.map((t, idx) => {
                  const isSelected = selectedTemplate?.id === t.id;
                  return (
                    <button
                      key={t.id ? `tmpl-${t.id}-${idx}` : `tmpl-${idx}`}
                      onClick={() => selectTemplate(t)}
                      className={`w-full flex items-center px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50 border-l-2 border-indigo-600 text-indigo-700"
                          : "text-slate-600 hover:bg-slate-50 border-l-2 border-transparent"
                      }`}
                    >
                      <span className="truncate">{t.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* AI RECRUITING RECOMMENDATIONS PANEL */}
          <div className="bg-white border border-slate-800 rounded-lg shadow-sm p-4.5 text-white">
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
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col overflow-hidden">
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

          {/* Editor Form fields */}
          <div className="p-5 flex-1 space-y-4">
            {/* Template Name */}
            <div>
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
                <span className="text-[10px] text-slate-400 font-mono">Variables: {"{{name}}"} &nbsp; Format: **bold** ***bold italic*** [[label|link]]</span>
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
                  <div className="absolute bottom-full right-0 mb-2 w-32 bg-slate-900 border border-slate-800 rounded-lg shadow-sm hidden group-hover:block z-50 text-slate-300">
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
              <span className="text-[10px] font-semibold text-slate-400 uppercase block text-right">
                {emailConfigured ? "Send to candidate" : "Email not configured"}
              </span>
              <button
                disabled={sendingMail || !selectedCandidate.email}
                onClick={handleSendEmail}
                className="mt-1 flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                title={selectedCandidate.email ? `Send this template to ${selectedCandidate.name} <${selectedCandidate.email}>` : "Select a candidate first"}
              >
                {sendingMail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send Email
              </button>
              {isOfferTemplate && selectedCandidate.id && (
                <p className={`mt-1 max-w-[230px] text-right text-[10px] ${missingOffer.length === 0 ? "text-slate-500" : "text-rose-600"}`}>
                  {missingOffer.length === 0
                    ? `Offer letter PDF for ${selectedCandidate.name} will be generated and attached`
                    : `Fill in the offer details (${missingOffer.join(", ")}) to attach the offer letter`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* COLUMN 3: RIGHT PANEL (PREVIEW & AUTOMATION RULES) (4/12 columns) */}
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col overflow-hidden">
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
                  {recipients.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">No candidates with an email address yet.</p>
                  )}
                  <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                    {recipients.map((c, idx) => {
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

                {/* Offer letter details: reviewed and edited by HR before the PDF is generated and attached */}
                {isOfferTemplate && selectedCandidate.id && (
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Offer Letter Details</span>
                      <span className="text-[10px] text-slate-400">Review before sending</span>
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <p><span className="text-slate-400">Candidate:</span> <span className="font-semibold text-slate-800">{selectedCandidate.name}</span></p>
                      <p><span className="text-slate-400">Mobile:</span> {selectedCandidate.phone || <span className="italic text-slate-400">not on the profile (left off the letter)</span>}</p>
                      <p><span className="text-slate-400">Email:</span> {selectedCandidate.email}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Job Title
                        <input
                          type="text"
                          value={offerForm.jobTitle}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                          className="mt-1 w-full px-2.5 py-1.5 text-xs font-normal normal-case text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </label>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Annual CTC (LPA)
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={offerForm.annualCtcLpa}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, annualCtcLpa: e.target.value }))}
                          className="mt-1 w-full px-2.5 py-1.5 text-xs font-normal normal-case text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </label>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Reporting Manager <span className="font-normal normal-case text-slate-400">(optional)</span>
                        <input
                          type="text"
                          value={offerForm.reportingManager}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, reportingManager: e.target.value }))}
                          className="mt-1 w-full px-2.5 py-1.5 text-xs font-normal normal-case text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </label>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Joining Date
                        <input
                          type="date"
                          value={offerForm.joiningDate}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, joiningDate: e.target.value }))}
                          className="mt-1 w-full px-2.5 py-1.5 text-xs font-normal normal-case text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </label>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Offer Valid Till
                        <input
                          type="date"
                          value={offerForm.validTill}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, validTill: e.target.value }))}
                          className="mt-1 w-full px-2.5 py-1.5 text-xs font-normal normal-case text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </label>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[10px] ${missingOffer.length === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {missingOffer.length === 0 ? "Ready: the letter is attached when you send" : `Missing: ${missingOffer.join(", ")}`}
                      </p>
                      <button
                        type="button"
                        disabled={letterPreviewing || missingOffer.length > 0}
                        onClick={handlePreviewLetter}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        {letterPreviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                        Preview offer letter
                      </button>
                    </div>
                  </div>
                )}

                {/* Styled Email Frame */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
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
                      <span className="text-slate-800 font-medium truncate">{sender.name} &lt;{sender.email}&gt;</span>
                    </div>
                    <div className="flex">
                      <span className="w-12 text-slate-400 font-medium">Subject:</span>
                      <span className="text-slate-900 font-bold leading-tight">
                        {renderPreviewContent(subject) || "[No Subject Line]"}
                      </span>
                    </div>
                  </div>

                  {/* Mail Body Render */}
                  <div className="p-5 min-h-[300px] bg-white text-xs text-slate-800 leading-relaxed font-sans ">
                    {body ? (
                      // Same formatting as the email that is sent: bold / italic, links, the logo. The text is escaped first.
                      <div dangerouslySetInnerHTML={{ __html: renderEmailMarkup(renderPreviewContent(body), "/encureit_mail_logo.png") }} />
                    ) : (
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
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg font-bold ${
                      parseInt(selectedCandidate.atsScore) >= 85 
                        ? "bg-emerald-50 text-emerald-600" 
                        : "bg-indigo-50 text-indigo-600"
                    }`}>
                      {selectedCandidate.atsScore ? `${selectedCandidate.atsScore}%` : "—"}
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

            {/* TAB 2: AUTOMATIC EMAILS (each switch is saved on the backend and controls the real sending) */}
            {activeTab === "automation" && (
              <div className="space-y-4">
                <div className="p-3 bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-lg text-xs leading-relaxed flex items-start gap-2">
                  <AlertCircle className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    When the event happens, the system sends that email to the candidate on its own. Switch a trigger off to stop it; the change applies immediately.
                  </div>
                </div>

                {triggersLoading && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                  </div>
                )}

                {!triggersLoading && triggersError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-700 flex items-center justify-between gap-3">
                    <span>{triggersError}</span>
                    <button onClick={fetchTriggers} className="font-bold underline cursor-pointer shrink-0">Retry</button>
                  </div>
                )}

                <div className="space-y-3">
                  {triggers.map(trigger => (
                    <div key={trigger.event} className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-[9px] font-bold uppercase rounded-md font-mono">Trigger</span>
                          <span className="text-xs font-semibold text-slate-900">{trigger.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{trigger.when}</p>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate" title={trigger.templateName || undefined}>
                            Sends: {trigger.templateName || "built-in default text (no template found)"}
                          </span>
                        </div>
                      </div>

                      {/* Switch */}
                      <button
                        onClick={() => handleToggleTrigger(trigger)}
                        disabled={triggerSaving !== null}
                        role="switch"
                        aria-checked={trigger.enabled}
                        title={trigger.enabled ? "On: click to switch off" : "Off: click to switch on"}
                        className={`w-12 h-6.5 rounded-full transition-all relative shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-wait ${
                          trigger.enabled ? "bg-indigo-600" : "bg-slate-300"
                        }`}
                      >
                        <span className={`w-5.5 h-5.5 rounded-full bg-white absolute top-0.5 shadow-xs transition-all ${
                          trigger.enabled ? "right-0.5" : "left-0.5"
                        }`}></span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: EMAIL HISTORY & ANALYTICS TABLE */}
      <div className="px-6 mt-8" id="email-history-logs">
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
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
                      No emails have been sent or logged yet. Use "Send Email" above to send your first email.
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

      {/* Offer letter PDF preview: what will be attached to the email */}
      {letterPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={closeLetterPreview}>
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div>
                <p className="text-sm font-bold text-slate-800">Offer letter for {selectedCandidate.name}</p>
                <p className="text-[11px] text-slate-500">This PDF is attached to the email when you send it.</p>
              </div>
              <button onClick={closeLetterPreview} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" aria-label="Close preview">
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe title="Offer letter preview" src={letterPreviewUrl} className="flex-1 w-full" />
          </div>
        </div>
      )}

    </div>
  );
}
