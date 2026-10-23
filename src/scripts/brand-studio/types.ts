export type ElementType = "text" | "shape" | "image" | "icon";

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
}

export interface TextElement extends BaseElement {
  type: "text";
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "500" | "600" | "700" | "bold" | "800";
  fontStyle: "normal" | "italic";
  color: string;
  textAlign: "left" | "center" | "right";
  letterSpacing: number;
  lineHeight: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  backgroundColor?: string;
  backgroundPadding?: number;
  borderRadius?: number;
}

export type ShapeKind = "rectangle" | "circle" | "badge" | "star" | "pill" | "divider";

export interface ShapeElement extends BaseElement {
  type: "shape";
  shapeKind: ShapeKind;
  fillColor: string;
  strokeColor?: string;
  strokeWidth?: number;
  borderRadius?: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface IconElement extends BaseElement {
  type: "icon";
  iconName?: string;
  label?: string;
  svgPath: string;
  viewBox?: string;
  color: string;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  alt?: string;
  borderRadius?: number;
  filter?: "none" | "warm" | "noir" | "vibrant" | "vintage" | "dramatic";
  aspectRatioLock?: boolean;
}

export type StudioElement = TextElement | ShapeElement | ImageElement | IconElement;

export interface CanvasPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: "Social" | "Print" | "Marketing" | "Digital";
  badge?: string;
  icon?: string;
}

export interface BrandPalette {
  id: string;
  name: string;
  colors: string[];
}

export interface StudioTemplate {
  id: string;
  title: string;
  category: string;
  tags: string[];
  presetId: string;
  width: number;
  height: number;
  background: {
    type: "solid" | "gradient";
    color: string;
    gradientEnd?: string;
    gradientAngle?: number;
  };
  elements: StudioElement[];
  previewGradient: string;
  thumbnailUrl?: string;
}

export interface StudioProject {
  id: string;
  title: string;
  presetId: string;
  width: number;
  height: number;
  background: {
    type: "solid" | "gradient";
    color: string;
    gradientEnd?: string;
    gradientAngle?: number;
  };
  elements: StudioElement[];
  createdAt: number;
  updatedAt: number;
}

export interface CustomBrandAsset {
  id: string;
  name: string;
  dataUrl: string;
}

export interface BrandKitState {
  brandName: string;
  colors: string[];
  logos: CustomBrandAsset[];
}
