import { useState, useEffect } from "preact/hooks";
import { useStudioStore } from "./store";
import { ToolbarTop } from "./ToolbarTop";
import { PropertiesBar } from "./PropertiesBar";
import { SidebarLeft } from "./SidebarLeft";
import { CanvasStage } from "./CanvasStage";
import { ExportModal } from "./ExportModal";
import { StudioHomeView } from "./StudioHomeView";
import "./studio.css";

export default function StudioApp() {
  const store = useStudioStore();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"home" | "editor">(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("view") === "editor") return "editor";
    }
    return "home";
  });

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in input or textarea
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          store.redo();
        } else {
          store.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        store.redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (store.state.selectedId) {
          e.preventDefault();
          store.deleteElement(store.state.selectedId);
        }
      } else if (e.key === "Escape") {
        store.setSelectedId(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        if (store.state.selectedId) {
          e.preventDefault();
          store.duplicateElement(store.state.selectedId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [store]);

  if (viewMode === "home") {
    return (
      <StudioHomeView
        brandKit={store.state.brandKit}
        onSelectTemplate={(template) => {
          store.loadTemplate(template);
          setViewMode("editor");
        }}
        onCreateBlank={(presetId) => {
          store.setPreset(presetId);
          store.clearCanvas();
          setViewMode("editor");
        }}
        onOpenEditor={() => setViewMode("editor")}
      />
    );
  }

  return (
    <div class="studio-app">
      {/* 1. Header Toolbar (Canva-style) */}
      <ToolbarTop
        title={store.state.title}
        presetId={store.state.presetId}
        width={store.state.width}
        height={store.state.height}
        zoom={store.state.zoom}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        onNavigateHome={() => setViewMode("home")}
        onTitleChange={store.setTitle}
        onPresetChange={store.setPreset}
        onZoomChange={store.setZoom}
        onUndo={store.undo}
        onRedo={store.redo}
        onClear={store.clearCanvas}
        onExportJSON={store.exportProjectJSON}
        onImportJSON={store.importProjectJSON}
        onOpenExportModal={() => setIsExportOpen(true)}
        onCopyToClipboard={() => setIsExportOpen(true)}
      />

      {/* 2. Contextual Properties Bar */}
      <PropertiesBar
        element={store.activeElement}
        onUpdate={store.updateElement}
        onDuplicate={store.duplicateElement}
        onDelete={store.deleteElement}
        onReorder={store.reorderElement}
      />

      {/* 3. Main Workspace: Rail + Drawer + Canvas Stage */}
      <main class="studio-main-body">
        <SidebarLeft
          elements={store.state.elements}
          selectedId={store.state.selectedId}
          background={store.state.background}
          brandKit={store.state.brandKit}
          onSelect={store.setSelectedId}
          onAddElement={store.addElement}
          onLoadTemplate={store.loadTemplate}
          onSetBackground={store.setBackground}
          onReorder={store.reorderElement}
          onDelete={store.deleteElement}
          onUpdateElement={store.updateElement}
          onAddBrandColor={store.addBrandColor}
          onRemoveBrandColor={store.removeBrandColor}
          onAddBrandLogo={store.addBrandLogo}
        />

        <CanvasStage
          width={store.state.width}
          height={store.state.height}
          background={store.state.background}
          elements={store.state.elements}
          selectedId={store.state.selectedId}
          zoom={store.state.zoom}
          onSelect={store.setSelectedId}
          onUpdateElement={store.updateElement}
          onDeleteElement={store.deleteElement}
          onZoomChange={store.setZoom}
          onFitToScreen={store.fitToScreen}
        />
      </main>

      {/* 4. Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        title={store.state.title}
        width={store.state.width}
        height={store.state.height}
        background={store.state.background}
        elements={store.state.elements}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
