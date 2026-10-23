import { useState, useEffect, useRef } from "preact/hooks";
import type {
  StudioElement,
  StudioTemplate,
  CanvasPreset,
  StudioProject,
  BrandKitState,
} from "./types";
import { CANVAS_PRESETS, BRAND_PALETTES } from "./presets";
import { STUDIO_TEMPLATES } from "./templates";

export interface CanvasBackground {
  type: "solid" | "gradient";
  color: string;
  gradientEnd?: string;
  gradientAngle?: number;
}

export interface StudioState {
  id: string;
  title: string;
  presetId: string;
  width: number;
  height: number;
  background: CanvasBackground;
  elements: StudioElement[];
  selectedId: string | null;
  zoom: number;
  snapGuidesEnabled: boolean;
  brandKit: BrandKitState;
}

const PROJECTS_STORAGE_KEY = "atittle_brand_studio_projects_v1";
const ACTIVE_PROJECT_KEY = "atittle_brand_studio_active_id";

const DEFAULT_BRAND_KIT: BrandKitState = {
  brandName: "ATITTLE Luxury",
  colors: ["#1c1917", "#fbf6ee", "#c85a32", "#d4af37", "#059669", "#0284c7"],
  logos: [],
};

const INITIAL_PROJECT_ID = "proj-default-01";

const DEFAULT_STATE: StudioState = {
  id: INITIAL_PROJECT_ID,
  title: "Diwali & Festive 50% Off Flash Sale",
  presetId: "insta-square",
  width: 1080,
  height: 1080,
  background: {
    type: "gradient",
    color: "#450a0a",
    gradientEnd: "#1c1917",
    gradientAngle: 135,
  },
  elements: STUDIO_TEMPLATES[0] ? JSON.parse(JSON.stringify(STUDIO_TEMPLATES[0].elements)) : [],
  selectedId: null,
  zoom: 0.55,
  snapGuidesEnabled: true,
  brandKit: DEFAULT_BRAND_KIT,
};

export function useStudioStore() {
  const [projects, setProjects] = useState<StudioProject[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // fallback
      }
    }
    return [
      {
        id: INITIAL_PROJECT_ID,
        title: DEFAULT_STATE.title,
        presetId: DEFAULT_STATE.presetId,
        width: DEFAULT_STATE.width,
        height: DEFAULT_STATE.height,
        background: DEFAULT_STATE.background,
        elements: DEFAULT_STATE.elements,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
  });

  const [state, setState] = useState<StudioState>(() => {
    if (typeof window !== "undefined") {
      try {
        const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);
        const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
        if (saved) {
          const parsed: StudioProject[] = JSON.parse(saved);
          const current = parsed.find((p) => p.id === activeId) || parsed[0];
          if (current) {
            return {
              ...DEFAULT_STATE,
              id: current.id,
              title: current.title,
              presetId: current.presetId,
              width: current.width,
              height: current.height,
              background: current.background,
              elements: current.elements,
            };
          }
        }
      } catch {
        // fallback
      }
    }
    return DEFAULT_STATE;
  });

  const historyRef = useRef<StudioState[]>([state]);
  const historyIndexRef = useRef<number>(0);
  const isHistoryAction = useRef<boolean>(false);

  // Autosave to project list & localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ACTIVE_PROJECT_KEY, state.id);

        setProjects((prev) => {
          const existingIdx = prev.findIndex((p) => p.id === state.id);
          const updatedProj: StudioProject = {
            id: state.id,
            title: state.title,
            presetId: state.presetId,
            width: state.width,
            height: state.height,
            background: state.background,
            elements: state.elements,
            createdAt: existingIdx >= 0 && prev[existingIdx] ? prev[existingIdx].createdAt : Date.now(),
            updatedAt: Date.now(),
          };

          let nextProjects: StudioProject[];
          if (existingIdx >= 0) {
            nextProjects = [...prev];
            nextProjects[existingIdx] = updatedProj;
          } else {
            nextProjects = [updatedProj, ...prev];
          }

          localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
          return nextProjects;
        });
      } catch {
        // quota exceeded fallback
      }
    }

    if (!isHistoryAction.current) {
      const past = historyRef.current.slice(0, historyIndexRef.current + 1);
      if (past.length > 30) past.shift();
      past.push(state);
      historyRef.current = past;
      historyIndexRef.current = past.length - 1;
    }
    isHistoryAction.current = false;
  }, [state]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const undo = () => {
    if (historyIndexRef.current > 0) {
      isHistoryAction.current = true;
      historyIndexRef.current -= 1;
      const targetState = historyRef.current[historyIndexRef.current];
      if (targetState) {
        setState({ ...targetState, selectedId: null });
      }
    }
  };

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isHistoryAction.current = true;
      historyIndexRef.current += 1;
      const targetState = historyRef.current[historyIndexRef.current];
      if (targetState) {
        setState({ ...targetState, selectedId: null });
      }
    }
  };

  // Auto-fit Zoom Calculator
  const fitToScreen = (availableWidth: number, availableHeight: number) => {
    if (availableWidth <= 0 || availableHeight <= 0) return;
    const padding = 70;
    const scaleX = (availableWidth - padding) / state.width;
    const scaleY = (availableHeight - padding) / state.height;
    const bestScale = Math.min(1.2, Math.max(0.2, Math.min(scaleX, scaleY)));
    setState((prev) => ({ ...prev, zoom: Number(bestScale.toFixed(2)) }));
  };

  const setTitle = (title: string) => {
    setState((prev) => ({ ...prev, title }));
  };

  const setSelectedId = (id: string | null) => {
    setState((prev) => ({ ...prev, selectedId: id }));
  };

  const setZoom = (zoom: number) => {
    setState((prev) => ({ ...prev, zoom: Math.min(2.5, Math.max(0.15, zoom)) }));
  };

  const setPreset = (presetId: string) => {
    const preset = CANVAS_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setState((prev) => ({
      ...prev,
      presetId,
      width: preset.width,
      height: preset.height,
    }));
  };

  const setCustomDimensions = (width: number, height: number) => {
    setState((prev) => ({
      ...prev,
      presetId: "custom",
      width: Math.max(200, Math.min(4000, width)),
      height: Math.max(200, Math.min(4000, height)),
    }));
  };

  const setBackground = (background: CanvasBackground) => {
    setState((prev) => ({ ...prev, background }));
  };

  const addElement = (element: StudioElement) => {
    setState((prev) => ({
      ...prev,
      elements: [...prev.elements, element],
      selectedId: element.id,
    }));
  };

  const updateElement = (id: string, updates: Partial<StudioElement>) => {
    setState((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => {
        if (el.id === id) {
          return { ...el, ...updates } as StudioElement;
        }
        return el;
      }),
    }));
  };

  const deleteElement = (id: string) => {
    setState((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== id),
      selectedId: prev.selectedId === id ? null : prev.selectedId,
    }));
  };

  const duplicateElement = (id: string) => {
    const el = state.elements.find((e) => e.id === id);
    if (!el) return;
    const newId = `el-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const cloned: StudioElement = {
      ...JSON.parse(JSON.stringify(el)),
      id: newId,
      x: el.x + 30,
      y: el.y + 30,
    };
    setState((prev) => ({
      ...prev,
      elements: [...prev.elements, cloned],
      selectedId: newId,
    }));
  };

  const reorderElement = (id: string, direction: "up" | "down" | "top" | "bottom") => {
    setState((prev) => {
      const idx = prev.elements.findIndex((e) => e.id === id);
      if (idx === -1) return prev;
      const copy = [...prev.elements];
      const [item] = copy.splice(idx, 1);
      if (!item) return prev;

      if (direction === "up") {
        const nextIdx = Math.min(copy.length, idx + 1);
        copy.splice(nextIdx, 0, item);
      } else if (direction === "down") {
        const nextIdx = Math.max(0, idx - 1);
        copy.splice(nextIdx, 0, item);
      } else if (direction === "top") {
        copy.push(item);
      } else if (direction === "bottom") {
        copy.unshift(item);
      }

      return { ...prev, elements: copy };
    });
  };

  const loadTemplate = (template: StudioTemplate) => {
    setState((prev) => ({
      ...prev,
      title: template.title,
      presetId: template.presetId,
      width: template.width,
      height: template.height,
      background: { ...template.background },
      elements: JSON.parse(JSON.stringify(template.elements)),
      selectedId: null,
    }));
  };

  const clearCanvas = () => {
    setState((prev) => ({
      ...prev,
      elements: [],
      selectedId: null,
    }));
  };

  // Brand Kit Controls
  const addBrandColor = (color: string) => {
    setState((prev) => {
      if (prev.brandKit.colors.includes(color)) return prev;
      return {
        ...prev,
        brandKit: {
          ...prev.brandKit,
          colors: [...prev.brandKit.colors, color],
        },
      };
    });
  };

  const removeBrandColor = (color: string) => {
    setState((prev) => ({
      ...prev,
      brandKit: {
        ...prev.brandKit,
        colors: prev.brandKit.colors.filter((c) => c !== color),
      },
    }));
  };

  const addBrandLogo = (name: string, dataUrl: string) => {
    setState((prev) => ({
      ...prev,
      brandKit: {
        ...prev.brandKit,
        logos: [...prev.brandKit.logos, { id: `logo-${Date.now()}`, name, dataUrl }],
      },
    }));
  };

  // Project Switcher
  const createNewProject = (presetId = "insta-square", title = "Untitled Design") => {
    const preset = CANVAS_PRESETS.find((p) => p.id === presetId) || CANVAS_PRESETS[0]!;
    const newId = `proj-${Date.now()}`;
    const newProjState: StudioState = {
      ...DEFAULT_STATE,
      id: newId,
      title,
      presetId: preset.id,
      width: preset.width,
      height: preset.height,
      background: { type: "solid", color: "#1c1917" },
      elements: [],
      selectedId: null,
    };
    setState(newProjState);
  };

  const openProject = (id: string) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    setState((prev) => ({
      ...prev,
      id: proj.id,
      title: proj.title,
      presetId: proj.presetId,
      width: proj.width,
      height: proj.height,
      background: proj.background,
      elements: JSON.parse(JSON.stringify(proj.elements)),
      selectedId: null,
    }));
  };

  const deleteProject = (id: string) => {
    if (projects.length <= 1) {
      alert("Cannot delete the only remaining project.");
      return;
    }
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(remaining));
    if (state.id === id && remaining[0]) {
      openProject(remaining[0].id);
    }
  };

  const exportProjectJSON = () => {
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.title.toLowerCase().replace(/\s+/g, "-")}-project.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProjectJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content) as StudioState;
        if (parsed.width && parsed.height && Array.isArray(parsed.elements)) {
          setState({
            ...parsed,
            id: `proj-import-${Date.now()}`,
            selectedId: null,
          });
        }
      } catch (err) {
        alert("Failed to parse project file. Ensure it is a valid ATITTLE JSON export.");
      }
    };
    reader.readAsText(file);
  };

  const activeElement = state.elements.find((el) => el.id === state.selectedId) || null;

  return {
    state,
    projects,
    activeElement,
    canUndo,
    canRedo,
    undo,
    redo,
    fitToScreen,
    setTitle,
    setSelectedId,
    setZoom,
    setPreset,
    setCustomDimensions,
    setBackground,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    reorderElement,
    loadTemplate,
    clearCanvas,
    addBrandColor,
    removeBrandColor,
    addBrandLogo,
    createNewProject,
    openProject,
    deleteProject,
    exportProjectJSON,
    importProjectJSON,
  };
}
