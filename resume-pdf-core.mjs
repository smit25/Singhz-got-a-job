/**
 * resume-pdf-core.mjs — Resolve which resume PDF to attach on applications.
 *
 * Priority:
 *   1. Job-tailored PDF in output/ (from /singhz-got-a-job pdf)
 *   2. Master resume PDF (from /singhz-got-a-job resume or manual copy)
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(ROOT, 'output');
const PROFILE_PATH = join(ROOT, 'config', 'profile.yml');

export function kebabName(fullName) {
  return (fullName || 'candidate')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function loadProfile() {
  if (!existsSync(PROFILE_PATH)) return null;
  return yaml.load(readFileSync(PROFILE_PATH, 'utf-8'));
}

export function defaultMasterPdfPath(profile) {
  const explicit = profile?.cv?.master_pdf;
  if (explicit) {
    return resolve(ROOT, explicit);
  }
  const name = profile?.candidate?.full_name;
  return join(OUTPUT_DIR, `cv-${kebabName(name)}-master.pdf`);
}

function listPdfs() {
  if (!existsSync(OUTPUT_DIR)) return [];
  return readdirSync(OUTPUT_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .map(f => join(OUTPUT_DIR, f));
}

function slugifyCompany(company) {
  return kebabName(company || '');
}

/** Newest matching file by mtime (fallback: lexical). */
function pickNewest(paths) {
  if (!paths.length) return null;
  let best = paths[0];
  let bestMtime = 0;
  for (const p of paths) {
    try {
      const { mtimeMs } = statSync(p);
      if (mtimeMs >= bestMtime) {
        bestMtime = mtimeMs;
        best = p;
      }
    } catch {
      /* skip */
    }
  }
  return best;
}

function findTailoredPdf({ reportNum, company }) {
  const pdfs = listPdfs();
  const slug = slugifyCompany(company);

  if (reportNum && reportNum !== '—' && reportNum !== '-') {
    const num = String(reportNum).padStart(3, '0').replace(/^0+/, '');
    const padded = num.padStart(3, '0');
    const byReport = pdfs.filter(p => {
      const base = p.split('/').pop().toLowerCase();
      return base.startsWith(`${padded}-`) || base.startsWith(`${num}-`);
    });
    if (byReport.length) return pickNewest(byReport);
  }

  if (slug) {
    const byCompany = pdfs.filter(p => {
      const base = p.split('/').pop().toLowerCase();
      if (base.includes('-master.pdf')) return false;
      return base.includes(slug);
    });
    if (byCompany.length) return pickNewest(byCompany);
  }

  return null;
}

/**
 * @param {{ reportNum?: string, company?: string, profile?: object }} opts
 * @returns {{ path: string|null, source: 'tailored'|'master'|'missing', masterPath: string, tailoredPath: string|null }}
 */
export function resolveResumePdf(opts = {}) {
  const profile = opts.profile ?? loadProfile();
  const masterPath = defaultMasterPdfPath(profile);
  const tailoredPath = findTailoredPdf({
    reportNum: opts.reportNum,
    company: opts.company,
  });

  if (tailoredPath && existsSync(tailoredPath)) {
    return {
      path: tailoredPath,
      source: 'tailored',
      masterPath,
      tailoredPath,
    };
  }

  if (existsSync(masterPath)) {
    return {
      path: masterPath,
      source: 'master',
      masterPath,
      tailoredPath: null,
    };
  }

  return {
    path: null,
    source: 'missing',
    masterPath,
    tailoredPath: null,
  };
}
