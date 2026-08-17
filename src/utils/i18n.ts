/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";

export const translations = {
  en: {
    dashboard: "Dashboard",
    candidates: "Candidates",
    jobs: "Jobs",
    interviews: "Interviews",
    reports: "Reports",
    insights: "Insights",
    offers: "Offers",
    notifications: "Notifications",
    profile: "Profile & Settings",
    talent_pool: "Talent Pool",
    
    // Stats
    active_vacancies: "Active Vacancies",
    total_applications: "Total Applications",
    interviews_scheduled: "Interviews Scheduled",
    offers_released: "Offers Released",
    
    // Screening thresholds and info
    talent_intelligence: "Talent Acquisition Intelligence",
    ai_match_score: "AI Match Score",
    high_match: "High Fit Recommendation",
    moderate_match: "Moderate Fit Recommendation",
    low_match: "Under Match / Low Fit",
    evaluation_threshold: "Screening Evaluation Cut-Off",
    recruiter_notes: "Recruiter HR Notes & Evaluations",
    add_candidate: "Add New Candidate",
    import_resume: "Import Candidate Resume",
    
    // Statuses
    pending: "Pending Evaluation",
    screening: "AI Screening",
    interviewing: "Interviewing",
    offered: "Offer Extended",
    rejected: "Archived / Rejected",
    approved: "HR Approved",
    disapproved: "HR Disapproved",
    
    // UI Helpers
    search_placeholder: "Search candidates by name, email, role or skills...",
    layout_comfortable: "Comfortable View Enabled",
    layout_compact: "Compact Data View Enabled",
    realtime_active: "Real-time updates active",
    save_changes: "Save Changes",
    saving: "Saving Details..."
  },
  mr: {
    dashboard: "डॅशबोर्ड",
    candidates: "उमेदवार",
    jobs: "नोकर्‍या",
    interviews: "मुलाखती",
    reports: "अहवाल",
    insights: "अंतर्दृष्टी",
    offers: "ऑफर",
    notifications: "सूचना",
    profile: "प्रोफाइल आणि सेटिंग्ज",
    talent_pool: "टॅलेंट पूल",
    
    // Stats
    active_vacancies: "सक्रिय जागा",
    total_applications: "एकूण अर्ज",
    interviews_scheduled: "नियोजित मुलाखती",
    offers_released: "दिलेले प्रस्ताव",
    
    // Screening thresholds and info
    talent_intelligence: "टॅलेंट एक्विजिशन इंटेलिजन्स",
    ai_match_score: "AI मॅच स्कोर",
    high_match: "उत्कृष्ट उमेदवार शिफारस",
    moderate_match: "मध्यम उमेदवार शिफारस",
    low_match: "कमी पात्रता उमेदवार",
    evaluation_threshold: "मूल्यांकन मर्यादा",
    recruiter_notes: "भरती अधिकारी नोट्स आणि मूल्यांकन",
    add_candidate: "नवीन उमेदवार जोडा",
    import_resume: "उमेदवाराचा बायोडाटा आयात करा",
    
    // Statuses
    pending: "मूल्यांकन प्रलंबित",
    screening: "AI स्क्रीनिंग",
    interviewing: "मुलाखत सुरू",
    offered: "प्रस्ताव पाठवला",
    rejected: "नाकारले / संग्रहित",
    approved: "HR मंजूर",
    disapproved: "HR नामंजूर",
    
    // UI Helpers
    search_placeholder: "नाव, ईमेल, भूमिका किंवा कौशल्यांद्वारे उमेदवार शोधा...",
    layout_comfortable: "कंफर्टेबल मांडणी सुरू",
    layout_compact: "कॉम्पॅक्ट डेटा मांडणी सुरू",
    realtime_active: "रिअल-टाइम अपडेट्स सक्रिय",
    save_changes: "बदल जतन करा",
    saving: "माहिती जतन होत आहे..."
  },
  hi: {
    dashboard: "डैशबोर्ड",
    candidates: "उम्मीदवार",
    jobs: "नौकरियाँ",
    interviews: "साक्षात्कार",
    reports: "रिपोर्ट्स",
    insights: "अंतर्दृष्टि",
    offers: "ऑफर",
    notifications: "सूचनाएँ",
    profile: "प्रोफ़ाइल और सेटिंग्स",
    talent_pool: "टैलेंट पूल",
    
    // Stats
    active_vacancies: "सक्रिय रिक्तियां",
    total_applications: "कुल आवेदन",
    interviews_scheduled: "अनुसूचित साक्षात्कार",
    offers_released: "जारी किए गए प्रस्ताव",
    
    // Screening thresholds and info
    talent_intelligence: "टैलेंट एक्विजिशन इंटेलिजेंस",
    ai_match_score: "AI मैच स्कोर",
    high_match: "सर्वश्रेष्ठ उम्मीदवार सिफारिश",
    moderate_match: "मध्यम उम्मीदवार सिफारिश",
    low_match: "कम पात्रता उम्मीदवार",
    evaluation_threshold: "स्क्रीनिंग मूल्यांकन सीमा",
    recruiter_notes: "भर्ती अधिकारी नोट्स और मूल्यांकन",
    add_candidate: "नया उम्मीदवार जोड़ें",
    import_resume: "उम्मीदवार का बायोडाटा आयात करें",
    
    // Statuses
    pending: "मूल्यांकन लंबित",
    screening: "AI स्क्रीनिंग",
    interviewing: "साक्षात्कार जारी",
    offered: "प्रस्ताव भेजा गया",
    rejected: "अस्वीकृत / संग्रहीत",
    approved: "HR स्वीकृत",
    disapproved: "HR अस्वीकृत",
    
    // UI Helpers
    search_placeholder: "नाम, ईमेल, भूमिका या कौशल से उम्मीदवार खोजें...",
    layout_comfortable: "कंफर्टेबल व्यू सक्षम",
    layout_compact: "कॉम्पैक्ट डेटा व्यू सक्षम",
    realtime_active: "रियल-टाइम अपडेट सक्रिय",
    save_changes: "बदलाव सहेजें",
    saving: "जानकारी सहेजी जा रही है..."
  },
  es: {
    dashboard: "Tablero",
    candidates: "Candidatos",
    jobs: "Empleos",
    interviews: "Entrevistas",
    reports: "Informes",
    insights: "Estadísticas",
    offers: "Ofertas",
    notifications: "Notificaciones",
    profile: "Perfil y Configuración",
    talent_pool: "Reserva de Talento",
    
    // Stats
    active_vacancies: "Vacantes Activas",
    total_applications: "Solicitudes Totales",
    interviews_scheduled: "Entrevistas Programadas",
    offers_released: "Ofertas Emitidas",
    
    // Screening thresholds and info
    talent_intelligence: "Inteligencia de Adquisición de Talento",
    ai_match_score: "Puntaje de Coincidencia AI",
    high_match: "Recomendación de Alto Ajuste",
    moderate_match: "Recomendación de Ajuste Moderado",
    low_match: "Ajuste Bajo / No Coincide",
    evaluation_threshold: "Límite de Evaluación de Cribado",
    recruiter_notes: "Notas y Evaluaciones de RRHH",
    add_candidate: "Agregar Nuevo Candidato",
    import_resume: "Importar Currículum",
    
    // Statuses
    pending: "Evaluación Pendiente",
    screening: "Cribado de IA",
    interviewing: "En Entrevista",
    offered: "Oferta Extendida",
    rejected: "Archivado / Rechazado",
    approved: "Aprobado por RRHH",
    disapproved: "Desaprobado por RRHH",
    
    // UI Helpers
    search_placeholder: "Buscar candidatos por nombre, correo, rol o habilidades...",
    layout_comfortable: "Vista Cómoda Habilitada",
    layout_compact: "Vista de Datos Compacta Habilitada",
    realtime_active: "Actualizaciones en tiempo real activas",
    save_changes: "Guardar Cambios",
    saving: "Guardando Detalles..."
  }
};

import { PreferenceRepository } from "../repositories";

export type LanguageCode = "en" | "mr" | "hi" | "es";

export function getTranslation(key: keyof typeof translations["en"]) {
  const lang = (PreferenceRepository.getLanguage() || "en") as LanguageCode;
  const dict = translations[lang] || translations["en"];
  return dict[key] || translations["en"][key] || key;
}

export function useTranslation() {
  const [lang, setLang] = useState<LanguageCode>(() => {
    return (PreferenceRepository.getLanguage() || "en") as LanguageCode;
  });

  useEffect(() => {
    const handleSettingsChanged = () => {
      setLang((PreferenceRepository.getLanguage() || "en") as LanguageCode);
    };
    window.addEventListener("settings-changed", handleSettingsChanged);
    return () => {
      window.removeEventListener("settings-changed", handleSettingsChanged);
    };
  }, []);

  const t = (key: keyof typeof translations["en"]): string => {
    const dict = translations[lang] || translations["en"];
    return dict[key] || translations["en"][key] || String(key);
  };

  return { t, currentLang: lang };
}
