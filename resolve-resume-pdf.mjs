#!/usr/bin/env node

/**
 * resolve-resume-pdf.mjs — Print JSON for which resume PDF to upload.
 *
 * Usage:
 *   node resolve-resume-pdf.mjs
 *   node resolve-resume-pdf.mjs --company "Vectara"
 *   node resolve-resume-pdf.mjs --report 042 --company "Anthropic"
 */

import { resolveResumePdf, defaultMasterPdfPath, loadProfile } from './resume-pdf-core.mjs';

function parseArgs(argv) {
  const out = { company: null, report: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--company' && argv[i + 1]) out.company = argv[++i];
    else if (argv[i] === '--report' && argv[i + 1]) out.report = argv[++i];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const result = resolveResumePdf({ company: args.company, reportNum: args.report });
const profile = loadProfile();

console.log(JSON.stringify({
  ...result,
  relativePath: result.path
    ? result.path.replace(process.cwd() + '/', '').replace(/^\.\//, '')
    : null,
  hint: result.source === 'missing'
    ? `Run: /singhz-got-a-job resume   (writes ${defaultMasterPdfPath(profile)})`
    : result.source === 'master'
      ? 'Using stored master resume (no job-specific PDF). Run /singhz-got-a-job pdf {url} for a tailored version.'
      : 'Using job-tailored PDF.',
}, null, 2));

if (result.source === 'missing') process.exitCode = 1;
