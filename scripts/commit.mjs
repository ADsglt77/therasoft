#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import readline from "node:readline";

/**
 * =========================
 * CONFIG
 * =========================
 */

// Ordre de passage des groupes (tu peux changer)
const GROUP_ORDER = ["ui", "backend", "db", "feat", "fix", "refactor", "perf", "test", "docs", "ci", "chore"];

// gitemoji + types (tu peux ajouter/enlever)
const EMOJI_MAP = {
  ui: "🎨",
  backend: "🛠️",
  db: "🗄️",
  feat: "✨",
  fix: "🐛",
  evol: "🚀",
  refactor: "♻️",
  docs: "📝",
  chore: "🔧",
  test: "✅",
  perf: "⚡️",
  ci: "👷",
};

const VALID_TYPES = Object.keys(EMOJI_MAP);

// Heuristiques de regroupement par fichier (adaptées à /frontend + /backend)
function classifyFile(filePathLower) {
  // CI
  if (filePathLower.startsWith(".github/") || filePathLower.includes("/.github/") || filePathLower.includes("workflow")) return "ci";

  // Docs
  if (filePathLower.endsWith(".md") || filePathLower.includes("/docs/")) return "docs";

  // Tests
  if (filePathLower.includes(".spec.") || filePathLower.includes(".test.") || filePathLower.includes("/test") || filePathLower.includes("/__tests__/")) return "test";

  // DB / Prisma
  if (filePathLower.includes("prisma/") || filePathLower.includes("migrations/") || filePathLower.includes("schema.prisma")) return "db";

  // Frontend UI (ton style Angular)
  if (
    filePathLower.startsWith("frontend/") &&
    (filePathLower.includes("/shared/ui/") ||
      filePathLower.includes("/components/") ||
      filePathLower.endsWith(".scss") ||
      filePathLower.endsWith(".css"))
  ) return "ui";

  // Backend
  if (filePathLower.startsWith("backend/") || filePathLower.includes("/backend/")) return "backend";

  // Tooling / config
  if (
    filePathLower === "package.json" ||
    filePathLower.endsWith("package-lock.json") ||
    filePathLower.endsWith("pnpm-lock.yaml") ||
    filePathLower.endsWith("bun.lockb") ||
    filePathLower.includes("docker") ||
    filePathLower.includes("compose") ||
    filePathLower.includes("tsconfig") ||
    filePathLower.includes("eslint") ||
    filePathLower.includes("prettier") ||
    filePathLower.includes("/scripts/")
  ) return "chore";

  // Default
  return "feat";
}

/**
 * =========================
 * GIT helpers (safe)
 * =========================
 */
function git(args, opts = {}) {
  try {
    return execFileSync("git", args, { encoding: "utf8", ...opts }).trimEnd();
  } catch (e) {
    const stderr = e?.stderr?.toString?.() || "";
    const msg = stderr || e?.message || "git command failed";
    throw new Error(msg);
  }
}

function repoRoot() {
  return git(["rev-parse", "--show-toplevel"]);
}

function ensureGitRepo() {
  try {
    git(["rev-parse", "--git-dir"]);
  } catch {
    console.error("❌ Pas un dépôt Git.");
    process.exit(1);
  }
}

/**
 * IMPORTANT: ne pas casser un staging partiel
 */
function ensureNoStagedChanges() {
  const staged = git(["diff", "--name-only", "--cached", "-z"], { cwd: repoRoot() });
  if (staged && staged.length > 0) {
    console.error("❌ Tu as déjà des changements 'staged'.");
    console.error("   Pour éviter de casser un staging partiel, ce script s'arrête.");
    console.error("   ➜ Fais un commit normal, ou: git reset (pour unstager) puis relance.");
    process.exit(1);
  }
}

/**
 * Parse `git status --porcelain=v1 -z`
 * gère espaces, renommages, etc.
 */
function getStatusEntries() {
  const out = execFileSync("git", ["status", "--porcelain=v1", "-z"], {
    encoding: "utf8",
    cwd: repoRoot(),
  });

  if (!out) return [];

  const tokens = out.split("\0").filter(Boolean);
  const entries = [];
  for (let i = 0; i < tokens.length; i++) {
    const line = tokens[i];
    const x = line[0]; // index status
    const y = line[1]; // working tree status
    // line format: "XY path"  OR for rename/copy with -z: "R  old" "\0" "new"
    const rest = line.slice(3); // skip "XY "
    const isRenameOrCopy = (x === "R" || x === "C" || y === "R" || y === "C");
    if (isRenameOrCopy) {
      const oldPath = rest;
      const newPath = tokens[++i]; // next token is new path
      entries.push({ x, y, path: newPath, oldPath });
    } else {
      entries.push({ x, y, path: rest });
    }
  }
  return entries;
}

function getUnstagedChangedFilesOnly() {
  // On veut gérer le working tree (pas de staged, vérifié plus haut)
  const entries = getStatusEntries();

  // Tout ce qui a y != ' ' ou x == '?' (untracked)
  const files = [];
  for (const e of entries) {
    const isUntracked = e.x === "?" && e.y === "?";
    const isWorkingTreeChanged = e.y && e.y !== " ";
    if (isUntracked || isWorkingTreeChanged) {
      files.push(e.path);
    }
  }

  // unique
  return [...new Set(files)].sort();
}

/**
 * =========================
 * Message generation
 * =========================
 */

function formatDescription(desc) {
  let s = (desc || "").trim();
  if (!s) s = "Update changes";
  s = s.replace(/\.$/, "");
  s = s.charAt(0).toUpperCase() + s.slice(1);
  // 72-ish max, simple
  if (s.length > 72) s = s.slice(0, 69) + "...";
  return s;
}

function buildCommitMessage(type, description) {
  const emoji = EMOJI_MAP[type] || "🔧";
  return `${emoji} - (${type}) ${formatDescription(description)}`;
}

function guessDescription(type, files) {
  // petite heuristique simple mais utile
  const count = files.length;
  const sample = files[0]?.split("/").pop() || "files";

  if (type === "ui") return count === 1 ? `Update UI: ${sample}` : `Update UI components (${count} files)`;
  if (type === "backend") return count === 1 ? `Update backend: ${sample}` : `Update backend (${count} files)`;
  if (type === "db") return count === 1 ? `Update database: ${sample}` : `Update database (${count} files)`;
  if (type === "docs") return count === 1 ? `Update docs: ${sample}` : `Update documentation (${count} files)`;
  if (type === "test") return count === 1 ? `Update tests: ${sample}` : `Update tests (${count} files)`;
  if (type === "ci") return count === 1 ? `Update CI: ${sample}` : `Update CI config (${count} files)`;
  if (type === "chore") return count === 1 ? `Chore: ${sample}` : `Chore updates (${count} files)`;

  // default feat
  return count === 1 ? `Update ${sample}` : `Update features (${count} files)`;
}

/**
 * =========================
 * Interactive helpers
 * =========================
 */
function rlCreate() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}
function question(rl, q) {
  return new Promise((resolve) => rl.question(q, resolve));
}

function printGroup(groupType, files) {
  console.log(`\n📦 Groupe: ${groupType} (${files.length} fichiers)`);
  files.slice(0, 12).forEach((f) => console.log(`   • ${f}`));
  if (files.length > 12) console.log(`   … +${files.length - 12} autres`);
}

function stageFiles(files) {
  // -- pour éviter ambiguïtés, et gérer les fichiers commençant par -
  git(["add", "--", ...files], { cwd: repoRoot() });
}
function unstageFiles(files) {
  // on ne touche pas aux changements, juste l'index
  git(["reset", "--", ...files], { cwd: repoRoot() });
}
function showStagedDiffStat() {
  const stat = git(["diff", "--cached", "--stat"], { cwd: repoRoot() });
  console.log("\n🧾 Diff (staged) --stat\n" + (stat || "(vide)") + "\n");
}
function showStagedDiffFull() {
  const diff = git(["diff", "--cached"], { cwd: repoRoot() });
  console.log("\n🧾 Diff (staged)\n" + (diff || "(vide)") + "\n");
}

async function editMessageFlow(rl, defaultType, defaultDesc) {
  console.log(`\nTypes: ${VALID_TYPES.join(", ")}`);
  const t = (await question(rl, `Type [${defaultType}]: `)).trim() || defaultType;
  const type = VALID_TYPES.includes(t) ? t : defaultType;
  const d = (await question(rl, `Description [${defaultDesc}]: `)).trim() || defaultDesc;
  return { type, desc: formatDescription(d) };
}

/**
 * =========================
 * MAIN
 * =========================
 */
async function main() {
  ensureGitRepo();
  ensureNoStagedChanges();

  const files = getUnstagedChangedFilesOnly();
  if (files.length === 0) {
    console.log("ℹ️  Aucun changement détecté.");
    return;
  }

  // Group by type
  const groups = new Map();
  for (const f of files) {
    const t = classifyFile(f.toLowerCase());
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t).push(f);
  }

  // Order groups
  const orderedTypes = [
    ...GROUP_ORDER.filter((t) => groups.has(t)),
    ...[...groups.keys()].filter((t) => !GROUP_ORDER.includes(t)),
  ];

  console.log(`🚀 Multi-commit: ${files.length} fichier(s) détecté(s)`);
  console.log(`➡️  Groupes: ${orderedTypes.join(", ")}`);

  const rl = rlCreate();

  try {
    for (const type of orderedTypes) {
      const groupFiles = groups.get(type);
      if (!groupFiles || groupFiles.length === 0) continue;

      printGroup(type, groupFiles);

      // Stage group
      stageFiles(groupFiles);

      // propose message
      const defaultDesc = guessDescription(type, groupFiles);
      let message = buildCommitMessage(type, defaultDesc);

      while (true) {
        console.log(`\n📝 Commit proposé:\n   ${message}\n`);
        console.log("Options:");
        console.log("  [Enter] commit");
        console.log("  [e]     éditer type/description");
        console.log("  [d]     voir diff --stat (staged)");
        console.log("  [D]     voir diff complet (staged)");
        console.log("  [s]     skip (ne commit pas ce groupe)");
        console.log("  [q]     arrêter (laisse les changements non commit)\n");

        const ans = (await question(rl, "Choix: ")).trim();

        if (ans === "" ) {
          // commit
          try {
            git(["commit", "-m", message], { cwd: repoRoot() });
            console.log(`✅ Commit créé: ${message}`);
          } catch (e) {
            console.error("❌ Erreur git commit:", e.message);
            // on laisse staged pour debug
            process.exitCode = 1;
          }
          break;
        }

        if (ans.toLowerCase() === "e") {
          const { type: newType, desc } = await editMessageFlow(rl, type, defaultDesc);
          message = buildCommitMessage(newType, desc);
          continue;
        }

        if (ans === "d") {
          showStagedDiffStat();
          continue;
        }
        if (ans === "D") {
          showStagedDiffFull();
          continue;
        }

        if (ans.toLowerCase() === "s") {
          // unstage group and continue
          unstageFiles(groupFiles);
          console.log("⏭️  Groupe ignoré (aucun commit).");
          break;
        }

        if (ans.toLowerCase() === "q") {
          // unstage current group before quitting (plus propre)
          unstageFiles(groupFiles);
          console.log("🛑 Arrêt demandé. Aucun autre commit.");
          return;
        }

        console.log("⚠️  Choix invalide.");
      }
    }
  } finally {
    rl.close();
  }

  console.log("\n🎉 Terminé. (Tu peux push à la main.)");
}

main().catch((e) => {
  console.error("❌ Erreur:", e?.message || e);
  process.exit(1);
});
