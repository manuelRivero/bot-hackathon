import { readJsonFile } from "./jsonStore";

export type SpiceLevel = "none" | "mild" | "medium" | "hot";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  tags: string[];
  available: boolean;
  ingredients: string[];
  allergens: string[];
  spiceLevel: SpiceLevel;
  servesPeople: number;
  preparation: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface MenuFile {
  categories: MenuCategory[];
}

export async function getMenu(): Promise<MenuCategory[]> {
  const data = await readJsonFile<MenuFile>("menu");
  return data.categories;
}

export async function findMenuItems(query: string): Promise<MenuItem[]> {
  const categories = await getMenu();
  const normalized = query.trim().toLowerCase();
  const allItems = categories.flatMap((c) => c.items);
  if (!normalized) return allItems;
  return allItems.filter(
    (item) =>
      item.name.toLowerCase().includes(normalized) ||
      item.description.toLowerCase().includes(normalized) ||
      item.tags.some((tag) => tag.toLowerCase().includes(normalized)),
  );
}

export async function getMenuItemById(id: string): Promise<MenuItem | null> {
  const categories = await getMenu();
  const allItems = categories.flatMap((c) => c.items);
  return allItems.find((item) => item.id === id) ?? null;
}
