/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalStorageService } from "../services/localStorageService";

export const PreferenceRepository = {
  getTheme(): string {
    return LocalStorageService.get<string>("setting_dashboard_theme", "light");
  },

  setTheme(theme: string): void {
    LocalStorageService.set("setting_dashboard_theme", theme);
  },

  getRefreshRate(): string {
    return LocalStorageService.get<string>("setting_refresh_rate", "realtime");
  },

  setRefreshRate(rate: string): void {
    LocalStorageService.set("setting_refresh_rate", rate);
  },

  getLanguage(): string {
    return LocalStorageService.get<string>("setting_preferred_language", "en");
  },

  setLanguage(lang: string): void {
    LocalStorageService.set("setting_preferred_language", lang);
  },

  getSoundAlerts(): boolean {
    return LocalStorageService.get<string>("setting_sound_alerts", "true") !== "false";
  },

  setSoundAlerts(enabled: boolean): void {
    LocalStorageService.set("setting_sound_alerts", enabled ? "true" : "false");
  },

  getLayoutDensity(): string {
    return LocalStorageService.get<string>("setting_layout_density", "comfortable");
  },

  setLayoutDensity(density: string): void {
    LocalStorageService.set("setting_layout_density", density);
  }
};
