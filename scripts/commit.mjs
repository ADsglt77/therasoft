#!/usr/bin/env node
/**
 * Multi-commit helper (no push)
 * Format: "<emoji> - (<type>) <description>"
 *
 * Usage:
 *   node scripts/commit.mjs
 *   node scripts/commit.mjs --dry-run
 *   node scripts/commit.mjs --yes
 */

import { spawnSync } from "child_process";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

// --- Commit types (message) ---
const EMOJI_MAP = {
  ui: "🎨",
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

// --- CLI opts ---
const argv = new Set(process.argv.slice(2));
const OPTS = {
  dryRun: argv.has("--dry-run"),
  yes: argv.has("--yes"),
};

// --- Shell helpers ---
function run(cmd, args, { allowFail = false } = {}) {
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (res.status !== 0 && !allowFail) {
    const msg = (res.stderr || res.stdout || "").trim() || `${cmd} failed`;
    throw new Error(msg);
  }
  return {
    ok: res.status === 0,
    stdout: (res.stdout || "").toString(),
    stderr: (res.stderr || "").toString(),
    status: res.status,
  };
}
function git(args, opts) {
  return run("git", args, opts).stdout.trimEnd();
}
function inGitRepo() {
  const r = run("git", ["rev-parse", "--is-inside-work-tree"], { allowFail: true });
  return r.ok && r.stdout.trim() === "true";
}
function hasStagedChanges() {
  const out = run("git", ["diff", "--cached", "--name-only"], { allowFail: true }).stdout.trim();
  return Boolean(out);
}
function sanitizeOneLine(s) {
  return String(s ?? "").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}
function formatDescription(desc) {
  let d = sanitizeOneLine(desc).replace(/\.$/, "");
  if (!d) d = "Update files";
  d = d.charAt(0).toUpperCase() + d.slice(1);
  if (d.length > 60) d = d.slice(0, 57).trimEnd() + "...";
  return d;
}
function buildCommitMessage(type, description) {
  const emoji = EMOJI_MAP[type] ?? "🔧";
  return `${emoji} - (${type}) ${formatDescription(description)}`;
}

// --- Robust status parsing (supports spaces/renames) ---
/**
 * Uses: git status --porcelain=v1 -z
 * tokens pattern:
 *  XY <path>\0
 *  R  <old>\0<new>\0
 */
function getPorcelainZ() {
  const raw = run("git", ["status", "--porcelain=v1", "-z"], { allowFail: true }).stdout;
  if (!raw) return [];
  const tokens = raw.split("\0").filter(Boolean);

  const out = [];
  let i = 0;
  while (i < tokens.length) {
    const entry = tokens[i++];
    if (!entry) continue;

    const status = entry.slice(0, 2); // " M", "A ", "??", "R "
    let rest = entry.slice(3); // path starts at index 3 (after "XY ")

    // rename/copy appear as: "R  old" then next token is "new"
    if (status[0] === "R" || status[0] === "C") {
      const oldPath = rest;
      const newPath = tokens[i++] ?? "";
      out.push({
        x: status[0],
        y: status[1],
        status: "R",
        path: newPath,
        fromPath: oldPath,
      });
      continue;
    }

    out.push({
      x: status[0],
      y: status[1],
      status: status.trim() || "??",
      path: rest,
      fromPath: null,
    });
  }
  return out;
}

function iconForStatus(s) {
  if (s === "??") return "➕";
  if (s.includes("D")) return "➖";
  if (s.includes("A")) return "➕";
  return "📝";
}

// --- Grouping rules (ui / backend / chore + others) ---
function detectGroup(filePath) {
  const p = filePath.replace(/\\/g, "/").toLowerCase();

  // UI (Angular UI primitives & app components & styles)
  if (
    p.includes("src/app/shared/ui/") ||
    p.includes("src/app/components/") ||
    p.endsWith(".scss") ||
    p.endsWith(".css") ||
    p.includes("/styles/")
  )
    return "ui";

  // Backend
  if (p.startsWith("backend/") || p.includes("/backend/") || p.includes("src/server") || p.includes("/api/"))
    return "backend";

  // Docs
  if (p.endsWith(".md") || p.includes("/docs/") || p.includes("readme")) return "docs";

  // CI
  if (p.includes(".github/") || p.includes("/workflows/") || p.includes("/ci/")) return "ci";

  // Tests
  if (p.includes("__tests__") || p.includes("/tests/") || p.includes(".spec.") || p.includes(".test.")) return "test";

  // Chore/tooling/config
  if (
    p.endsWith("package.json") ||
    p.includes("lock") ||
    p.includes("tsconfig") ||
    p.includes("eslint") ||
    p.includes("prettier") ||
    p.includes("docker") ||
    p.includes("/scripts/") ||
    p.endsWith(".yml") ||
    p.endsWith(".yaml")
  )
    return "chore";

  return "other";
}

// --- Commit type (message) detection inside a group ---
function detectCommitType(groupName, changes) {
  const paths = changes.map((c) => c.path.toLowerCase());
  const statusList = changes.map((c) => c.status);

  const added = statusList.filter((s) => s.includes("A") || s === "??").length;
  const deleted = statusList.filter((s) => s.includes("D")).length;
  const hasRename = changes.some((c) => c.fromPath);

  // hard mapping by group
  if (groupName === "ui") return "ui";
  if (groupName === "docs") return "docs";
  if (groupName === "ci") return "ci";
  if (groupName === "test") return "test";

  if (groupName === "chore") return "chore";

  // backend: decide feat/fix/refactor by heuristics
  if (groupName === "backend") {
    if (paths.some((p) => p.includes("fix") || p.includes("bug") || p.includes("error"))) return "fix";
    if (hasRename || (added > 0 && deleted > 0)) return "refactor";
    return added > 0 ? "feat" : "chore";
  }

  // fallback
  if (paths.some((p) => p.includes("fix") || p.includes("bug") || p.includes("error") || p.includes("typo"))) return "fix";
  if (hasRename || (added > 0 && deleted > 0)) return "refactor";
  return added > 0 ? "feat" : "chore";
}

// --- Description generation per group ---
function titleize(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function pickFocus(changes) {
  const paths = changes.map((c) => c.path.replace(/\\/g, "/"));

  // UI component folder focus: src/app/shared/ui/<x>/
  const ui = paths.find((p) => p.includes("src/app/shared/ui/"));
  if (ui) {
    const tail = ui.split("src/app/shared/ui/")[1] || "";
    const name = (tail.split("/")[0] || "").trim();
    if (name) return `Ui${titleize(name)} component`;
  }

  // Front page focus: src/app/pages/<x>/
  const page = paths.find((p) => p.includes("src/app/pages/"));
  if (page) {
    const tail = page.split("src/app/pages/")[1] || "";
    const name = (tail.split("/")[0] || "").trim();
    if (name) return `${titleize(name)} page`;
  }

  // Backend focus
  if (paths.some((p) => /auth/i.test(p))) return "Auth";
  if (paths.some((p) => /routes/i.test(p))) return "API routes";

  // Single file
  if (paths.length === 1) return titleize(paths[0].split("/").pop() || "files");

  // Dominant folder
  const buckets = new Map();
  for (const p of paths) {
    const top = p.split("/")[0] || "root";
    buckets.set(top, (buckets.get(top) || 0) + 1);
  }
  const [top] = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0] || ["files"];
  return titleize(top);
}

function pickVerb(type, changes) {
  const s = changes.map((c) => c.status);
  const added = s.filter((x) => x.includes("A") || x === "??").length;
  const deleted = s.filter((x) => x.includes("D")).length;
  const renamed = changes.some((c) => c.fromPath);

  if (deleted > 0 && added === 0) return "Remove";
  if (renamed) return "Refactor";
  if (type === "fix") return "Fix";
  if (type === "refactor") return "Refactor";
  if (type === "perf") return "Improve";
  if (type === "feat" || type === "ui" || type === "test") return added > 0 ? "Add" : "Update";
  return "Update";
}

function generateDescription(type, changes) {
  const focus = pickFocus(changes);
  const verb = pickVerb(type, changes);
  return `${verb} ${focus}`;
}

// --- staging per group (safe + batching for Windows) ---
function resetIndex() {
  run("git", ["reset"]);
}

function stagePaths(paths) {
  // Use git add -A -- <paths...> in chunks (Windows arg limit)
  const CHUNK = 40;
  for (let i = 0; i < paths.length; i += CHUNK) {
    const slice = paths.slice(i, i + CHUNK);
    run("git", ["add", "-A", "--", ...slice]);
  }
}

function uniquePathsForCommit(changes) {
  // For rename, include both old & new to capture properly
  const set = new Set();
  for (const c of changes) {
    if (c.path) set.add(c.path);
    if (c.fromPath) set.add(c.fromPath);
  }
  return [...set];
}

// --- main flow ---
async function main() {
  console.log("🚀 Multi-commit generator (no push)\n");

  if (!inGitRepo()) {
    console.error("❌ Not a git repository.");
    process.exit(1);
  }

  // Safety: existing staged changes can mess grouping.
  if (hasStagedChanges()) {
    const rl0 = readline.createInterface({ input, output });
    console.log("⚠️ You already have staged changes.");
    console.log("To safely create multiple commits, the script needs a clean index.");
    console.log("\nOptions:");
    console.log("  1) Reset index (keeps working tree) and continue  [recommended]");
    console.log("  2) Abort");
    const ans = (await rl0.question("\nChoose (1/2): ")).trim();
    rl0.close();

    if (ans !== "1") {
      console.log("❌ Aborted.");
      process.exit(0);
    }
    resetIndex();
    console.log("✅ Index reset.");
  }

  const all = getPorcelainZ();
  if (!all.length) {
    console.log("ℹ️ No changes detected.");
    process.exit(0);
  }

  // Build groups
  const groups = new Map(); // name -> changes[]
  for (const c of all) {
    const g = detectGroup(c.path);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(c);
  }

  // Preferred ordering
  const ORDER = ["ui", "backend", "chore", "docs", "ci", "test", "other"];
  const sortedGroups = [...groups.entries()].sort(
    ([a], [b]) => (ORDER.indexOf(a) === -1 ? 999 : ORDER.indexOf(a)) - (ORDER.indexOf(b) === -1 ? 999 : ORDER.indexOf(b))
  );

  console.log("📦 Detected commit groups:");
  for (const [name, changes] of sortedGroups) {
    console.log(`  - ${name}: ${changes.length} file(s)`);
  }

  const rl = readline.createInterface({ input, output });

  for (const [groupName, changes] of sortedGroups) {
    console.log(`\n==============================`);
    console.log(`🧩 Group: ${groupName} (${changes.length} file(s))`);

    // Show preview
    changes.slice(0, 12).forEach((c) => {
      console.log(`  ${iconForStatus(c.status)} ${c.path}`);
    });
    if (changes.length > 12) console.log(`  ... +${changes.length - 12} more`);

    // Propose message
    let type = detectCommitType(groupName, changes);
    let desc = generateDescription(type, changes);
    let msg = buildCommitMessage(type, desc);

    console.log("\n📝 Proposed commit message:");
    console.log(`   ${msg}`);

    console.log("\nOptions:");
    console.log("  [Enter] Commit this group");
    console.log("  e       Edit type/description");
    console.log("  r       Regenerate suggestion");
    console.log("  s       Show group diff --stat (preview)");
    console.log("  k       Skip this group");
    console.log("  q       Quit");

    if (OPTS.yes) {
      if (OPTS.dryRun) {
        console.log("🧪 Dry-run: would commit:", msg);
        continue;
      }
      // stage only this group + commit
      resetIndex();
      stagePaths(uniquePathsForCommit(changes));
      run("git", ["commit", "-m", msg]);
      console.log("✅ Commit created:", msg);
      continue;
    }

    // interactive loop for this group
    while (true) {
      const ans = (await rl.question("Choice [Enter/e/r/s/k/q]: ")).trim().toLowerCase();

      if (ans === "q") {
        console.log("👋 Bye.");
        rl.close();
        process.exit(0);
      }

      if (ans === "k") {
        console.log("⏭️ Skipped.");
        break;
      }

      if (ans === "s") {
        // stage temporarily to show stat, then reset index back
        resetIndex();
        stagePaths(uniquePathsForCommit(changes));
        const stat = git(["diff", "--cached", "--stat"], { allowFail: true });
        console.log("\n📊 Staged diff --stat:\n");
        console.log(stat || "(empty)");
        // reset again to avoid mixing with next group until confirmed
        resetIndex();
        console.log("\n📝 Current message:", msg);
        continue;
      }

      if (ans === "r") {
        type = detectCommitType(groupName, changes);
        desc = generateDescription(type, changes);
        msg = buildCommitMessage(type, desc);
        console.log("🔁 Regenerated:", msg);
        continue;
      }

      if (ans === "e") {
        console.log(`Types: ${VALID_TYPES.join(", ")}`);
        const t = (await rl.question(`Type [${type}]: `)).trim().toLowerCase();
        if (t && VALID_TYPES.includes(t)) type = t;

        const d = (await rl.question(`Description [${formatDescription(desc)}]: `)).trim();
        if (d) desc = d;

        msg = buildCommitMessage(type, desc);
        console.log("📝 Updated:", msg);
        continue;
      }

      // Enter => commit
      if (OPTS.dryRun) {
        console.log("🧪 Dry-run: would commit:", msg);
        break;
      }

      resetIndex();
      stagePaths(uniquePathsForCommit(changes));
      try {
        run("git", ["commit", "-m", msg]);
        console.log("✅ Commit created:", msg);
      } catch (e) {
        console.error("❌ Commit failed:", e?.message || e);
      }
      break;
    }
  }

  rl.close();

  // Show remaining
  const remaining = run("git", ["status", "--porcelain=v1"], { allowFail: true }).stdout.trim();
  console.log("\n==============================");
  if (!remaining) {
    console.log("✅ All changes committed.");
  } else {
    console.log("ℹ️ Remaining uncommitted changes:\n");
    console.log(remaining);
    console.log("\nTip: rerun the script or commit manually.");
  }
}

main().catch((e) => {
  console.error("❌ Error:", e?.message || e);
  process.exit(1);
});
