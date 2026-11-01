import { readJsonFile } from "./jsonStore";

export interface BusinessHours {
  day: string;
  open: string | null;
  close: string | null;
  note?: string;
}

export interface BusinessInfo {
  name: string;
  tagline: string;
  description: string;
  cuisineType: string;
  address: string;
  phone: string;
  hours: BusinessHours[];
  socialMedia: Record<string, string>;
}

export async function getBusinessInfo(): Promise<BusinessInfo> {
  return readJsonFile<BusinessInfo>("business");
}
