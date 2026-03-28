import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { listYearsOptions } from "../services/studentService";

const STORAGE_SCHOOL = "sms_school_display_name";
const STORAGE_YEAR = "sms_preferred_academic_year_id";
const STORAGE_THEME = "sms_theme";

function readStoredSchool() {
  try {
    return localStorage.getItem(STORAGE_SCHOOL) ?? "";
  } catch {
    return "";
  }
}

function readStoredYear() {
  try {
    return localStorage.getItem(STORAGE_YEAR) ?? "";
  } catch {
    return "";
  }
}

function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_THEME) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [schoolDisplayName, setSchoolDisplayNameState] = useState(readStoredSchool);
  const [preferredAcademicYearId, setPreferredAcademicYearIdState] =
    useState(readStoredYear);
  const [theme, setThemeState] = useState(readStoredTheme);
  const [years, setYears] = useState([]);
  const [yearsLoading, setYearsLoading] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      if (theme === "dark") localStorage.setItem(STORAGE_THEME, "dark");
      else localStorage.setItem(STORAGE_THEME, "light");
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback((mode) => {
    setThemeState(mode === "dark" ? "dark" : "light");
  }, []);

  const setSchoolDisplayName = useCallback((name) => {
    const v = name ?? "";
    setSchoolDisplayNameState(v);
    try {
      if (v.trim()) localStorage.setItem(STORAGE_SCHOOL, v.trim());
      else localStorage.removeItem(STORAGE_SCHOOL);
    } catch {
      /* ignore */
    }
  }, []);

  const setPreferredAcademicYearId = useCallback((id) => {
    const v = id ?? "";
    setPreferredAcademicYearIdState(v);
    try {
      if (v) localStorage.setItem(STORAGE_YEAR, v);
      else localStorage.removeItem(STORAGE_YEAR);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshYears = useCallback(async () => {
    setYearsLoading(true);
    const { data } = await listYearsOptions();
    setYears(data ?? []);
    setYearsLoading(false);
  }, []);

  useEffect(() => {
    refreshYears();
  }, [refreshYears]);

  useEffect(() => {
    if (!years.length) return;
    setPreferredAcademicYearIdState((cur) => {
      if (!cur) return cur;
      if (years.some((y) => y.id === cur)) return cur;
      try {
        localStorage.removeItem(STORAGE_YEAR);
      } catch {
        /* ignore */
      }
      return "";
    });
  }, [years]);

  const value = useMemo(
    () => ({
      schoolDisplayName,
      setSchoolDisplayName,
      preferredAcademicYearId,
      setPreferredAcademicYearId,
      theme,
      setTheme,
      years,
      yearsLoading,
      refreshYears,
    }),
    [
      schoolDisplayName,
      setSchoolDisplayName,
      preferredAcademicYearId,
      setPreferredAcademicYearId,
      theme,
      setTheme,
      years,
      yearsLoading,
      refreshYears,
    ]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return ctx;
}
