import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function loadConfig(explicitPath) {
  const path = explicitPath ? resolve(explicitPath) : resolve('.marcos-audit.json');
  try {
    await access(path);
  } catch {
    if (explicitPath) throw new Error(`Arquivo de configuração não encontrado: ${path}`);
    return { path: null, config: {} };
  }

  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`Configuração inválida em ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { path, config: parsed && typeof parsed === 'object' ? parsed : {} };
}
