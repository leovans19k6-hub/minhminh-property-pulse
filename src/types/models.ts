export type ProjectStatus = "Đang bán" | "Sắp mở bán" | "Đã bàn giao";
export type ProductStatus = "Còn hàng" | "Đã đặt cọc" | "Đã bán" | "Khoá";
export type ProductCategory = "low-rise" | "apartment";

export interface Project {
  id: string;
  name: string;
  developer: string;
  location: string;
  cover: string;
  logo?: string;
  status: ProjectStatus;
  totalUnits: number;
  availableUnits: number;
  category: ProductCategory | "mixed";
  shortDescription: string;
  saleManager: { name: string; phone: string; avatar?: string };
  subzones: string[];
  towers?: string[];
}

export interface Product {
  id: string;
  code: string;
  projectId: string;
  projectName: string;
  subzone: string;
  tower?: string;
  floor?: number;
  category: ProductCategory;
  type: string; // "Studio" | "2N" | "Liền kề" ...
  status: ProductStatus;
  price: number; // VND
  // low-rise
  landArea?: number;
  buildingArea?: number;
  frontage?: number;
  floors?: number;
  constructionStatus?: "Xây thô" | "Hoàn thiện" | "Giãn xây";
  // apartment
  netArea?: number;
  grossArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  doorDirection?: string;
  balconyDirection?: string;
  view?: string;
  direction?: string;
  images: string[];
}

export interface Policy {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  publishedAt: string;
  tag?: string;
}

export interface Voucher {
  id: string;
  projectId: string;
  title: string;
  value: string;
  expiresAt: string;
  quota?: number;
}

export interface EventItem {
  id: string;
  projectId: string;
  title: string;
  type: "Site Tour" | "Sự kiện" | "Kick-off";
  startAt: string;
  location: string;
  cover?: string;
}

export type RegistrationType = "consult" | "voucher" | "sitetour" | "event";