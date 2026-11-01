import { readFile, writeFile } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

/**
 * Lee un archivo JSON de /data por nombre (sin extensión) y lo parsea.
 * Única puerta de entrada a los JSON: ningún otro módulo debe usar fs directo.
 */
export async function readJsonFile<T>(fileName: string): Promise<T> {
  const filePath = path.join(DATA_DIR, `${fileName}.json`);
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

// Serializa escrituras por archivo para evitar que dos requests concurrentes
// pisen el read-modify-write (suficiente para un hackathon de un solo proceso).
const writeQueues = new Map<string, Promise<unknown>>();

export async function writeJsonFile<T>(fileName: string, data: T): Promise<void> {
  const filePath = path.join(DATA_DIR, `${fileName}.json`);
  const previous = writeQueues.get(fileName) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => writeFile(filePath, JSON.stringify(data, null, 2), "utf-8"));
  writeQueues.set(fileName, next);
  return next;
}
