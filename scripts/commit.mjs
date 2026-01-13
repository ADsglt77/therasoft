#!/usr/bin/env node

import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mapping type -> emoji
const EMOJI_MAP = {
  ui: '🎨',
  feat: '✨',
  fix: '🐛',
  evol: '🚀',
  refactor: '♻️',
  docs: '📝',
  chore: '🔧',
  test: '✅',
  perf: '⚡️',
  ci: '👷',
};

// Types autorisés
const VALID_TYPES = Object.keys(EMOJI_MAP);

/**
 * Exécute une commande git et retourne le résultat
 */
function execGit(command) {
  try {
    return execSync(command, { encoding: 'utf-8', cwd: join(__dirname, '..') }).trim();
  } catch (error) {
    return '';
  }
}

/**
 * Récupère la liste des fichiers modifiés
 */
function getChangedFiles() {
  const status = execGit('git status --porcelain');
  if (!status) return [];
  
  return status
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const status = line.substring(0, 2).trim();
      const file = line.substring(3).trim();
      return { status, file };
    });
}

/**
 * Analyse les fichiers pour déduire le type de commit
 */
function detectType(files) {
  if (files.length === 0) return null;

  const filePaths = files.map(f => f.file.toLowerCase());
  const addedFiles = files.filter(f => f.status.startsWith('A') || f.status === '??');
  const deletedFiles = files.filter(f => f.status.includes('D') && !f.status.includes('A'));
  
  // UI components
  if (filePaths.some(f => f.includes('shared/ui/') || f.includes('components/'))) {
    return 'ui';
  }
  
  // Tests
  if (filePaths.some(f => f.includes('test') || f.includes('spec') || f.includes('.test.'))) {
    return 'test';
  }
  
  // Documentation
  if (filePaths.some(f => f.includes('readme') || f.includes('docs/') || f.endsWith('.md'))) {
    return 'docs';
  }
  
  // CI/CD
  if (filePaths.some(f => f.includes('.github/') || f.includes('ci/') || f.includes('workflow'))) {
    return 'ci';
  }
  
  // Performance
  if (filePaths.some(f => f.includes('perf') || filePaths.some(f => f.includes('optimize')))) {
    return 'perf';
  }
  
  // Config / Scripts / Tooling
  if (filePaths.some(f => 
    f.includes('package.json') || 
    f.includes('tsconfig') || 
    f.includes('docker') ||
    f.includes('scripts/') ||
    f.includes('.config.')
  )) {
    return 'chore';
  }
  
  // Nouvelles features (routes, pages, services)
  if (addedFiles.length > 0 && (
    filePaths.some(f => f.includes('routes/') || f.includes('pages/') || f.includes('services/')) ||
    addedFiles.length > deletedFiles.length * 2
  )) {
    return 'feat';
  }
  
  // Refactor (renommage, déplacement, cleanup)
  if (filePaths.some(f => f.includes('refactor')) || 
      (deletedFiles.length > 0 && addedFiles.length > 0)) {
    return 'refactor';
  }
  
  // Fix (par défaut si on détecte des erreurs/bugs)
  if (filePaths.some(f => 
    f.includes('fix') || 
    f.includes('error') || 
    f.includes('bug') ||
    f.includes('typo')
  )) {
    return 'fix';
  }
  
  // Par défaut : feat si nouvelles fonctionnalités, sinon chore
  return addedFiles.length > deletedFiles.length ? 'feat' : 'chore';
}

/**
 * Génère une description automatique basée sur les fichiers modifiés
 */
function generateDescription(files) {
  if (files.length === 0) return 'Update files';
  
  const filePaths = files.map(f => f.file);
  const addedFiles = files.filter(f => f.status.startsWith('A') || f.status === '??');
  // Détecter les fichiers supprimés (peut être "D", "D ", " D", "AD", etc.)
  const deletedFiles = files.filter(f => f.status.includes('D') && !f.status.includes('A'));
  const modifiedFiles = files.filter(f => !f.status.startsWith('A') && !f.status.includes('D') && f.status !== '??');
  
  // Détecter le composant/fichier principal modifié
  const mainFile = filePaths[0];
  const fileName = mainFile.split('/').pop().replace(/\.[^.]+$/, '');
  
  // Cas spéciaux pour les suppressions
  if (deletedFiles.length > 0) {
    // Si un seul fichier supprimé, inclure son nom
    if (deletedFiles.length === 1) {
      const deletedFile = deletedFiles[0].file;
      const deletedFileName = deletedFile.split('/').pop();
      const deletedFileBase = deletedFileName.replace(/\.[^.]+$/, '');
      
      // Cas spéciaux pour certains fichiers
      if (deletedFile.includes('gitignore')) {
        return 'Remove .gitignore file';
      }
      if (deletedFile.includes('readme')) {
        return 'Remove README file';
      }
      if (deletedFile.includes('package.json')) {
        return 'Remove package.json';
      }
      
      // Formater le nom du fichier (gérer les fichiers cachés, remplacer - par espaces, capitaliser)
      let formattedName = deletedFileBase;
      
      // Si le fichier commence par un point (fichier caché), garder le point
      if (deletedFileName.startsWith('.')) {
        formattedName = deletedFileName; // Garder le nom complet avec le point
      } else {
        // Sinon, formater normalement
        formattedName = deletedFileBase
          .replace(/-/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      
      return `Remove ${formattedName}`;
    }
    
    // Si plusieurs fichiers supprimés, factoriser
    if (deletedFiles.length > 1) {
      // Regrouper par extension ou type
      const extensions = {};
      deletedFiles.forEach(f => {
        const ext = f.file.split('.').pop() || 'file';
        extensions[ext] = (extensions[ext] || 0) + 1;
      });
      
      const uniqueExts = Object.keys(extensions);
      if (uniqueExts.length === 1) {
        const ext = uniqueExts[0];
        return `Remove ${deletedFiles.length} ${ext} files`;
      }
      
      return `Remove ${deletedFiles.length} files`;
    }
  }
  
  // Cas spéciaux
  if (filePaths.some(f => f.includes('auth'))) {
    if (addedFiles.length > 0) return 'Add authentication feature';
    return 'Update authentication';
  }
  
  if (filePaths.some(f => f.includes('navbar') || f.includes('menu'))) {
    return 'Update navigation menu';
  }
  
  if (filePaths.some(f => f.includes('button'))) {
    return 'Update button component';
  }
  
  if (filePaths.some(f => f.includes('input'))) {
    return 'Update input component';
  }
  
  if (filePaths.some(f => f.includes('card'))) {
    return 'Update card component';
  }
  
  if (filePaths.some(f => f.includes('routes'))) {
    return 'Update routes configuration';
  }
  
  if (filePaths.some(f => f.includes('styles') || f.includes('scss') || f.includes('css'))) {
    return 'Update styles';
  }
  
  if (filePaths.some(f => f.includes('service'))) {
    return `Update ${fileName} service`;
  }
  
  if (filePaths.some(f => f.includes('component'))) {
    return `Update ${fileName} component`;
  }
  
  // Générique pour les ajouts
  if (addedFiles.length > 0) {
    if (addedFiles.length === 1) {
      const addedFile = addedFiles[0].file;
      const addedFileName = addedFile.split('/').pop().replace(/\.[^.]+$/, '');
      const formattedName = addedFileName
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return `Add ${formattedName}`;
    }
    return `Add ${addedFiles.length} files`;
  }
  
  // Capitaliser le premier caractère du nom de fichier
  const capitalized = fileName.charAt(0).toUpperCase() + fileName.slice(1).replace(/-/g, ' ');
  return `Update ${capitalized}`;
}

/**
 * Nettoie et formate la description (max 60 chars, première lettre majuscule, pas de point)
 */
function formatDescription(desc) {
  // Enlever les points finaux
  desc = desc.replace(/\.$/, '');
  
  // Première lettre majuscule
  desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  
  // Limiter à 60 caractères
  if (desc.length > 60) {
    desc = desc.substring(0, 57) + '...';
  }
  
  return desc;
}

/**
 * Construit le message de commit final
 */
function buildCommitMessage(type, description) {
  const emoji = EMOJI_MAP[type] || '🔧';
  return `${emoji} - (${type}) ${description}`;
}

/**
 * Interface interactive pour confirmation/édition
 */
function askConfirmation(rl, message, defaultType, defaultDesc) {
  return new Promise((resolve) => {
    console.log('\n📝 Message de commit proposé:');
    console.log(`   ${message}\n`);
    console.log('Options:');
    console.log('  [Enter] Confirmer et committer');
    console.log('  [e]     Éditer le type/description');
    console.log('  [q]     Annuler\n');
    
    rl.question('Votre choix: ', (answer) => {
      const choice = answer.trim().toLowerCase();
      
      if (choice === 'q' || choice === 'quit') {
        console.log('❌ Commit annulé.');
        rl.close();
        resolve(null);
      } else if (choice === 'e' || choice === 'edit') {
        askEdit(rl, defaultType, defaultDesc).then(resolve);
      } else {
        resolve(message);
      }
    });
  });
}

/**
 * Interface pour éditer le type et la description
 */
function askEdit(rl, defaultType, defaultDesc) {
  return new Promise((resolve) => {
    console.log('\n📝 Édition du message de commit\n');
    console.log(`Types disponibles: ${VALID_TYPES.join(', ')}\n`);
    
    rl.question(`Type [${defaultType}]: `, (typeAnswer) => {
      const type = typeAnswer.trim() || defaultType;
      
      if (!VALID_TYPES.includes(type)) {
        console.log(`⚠️  Type invalide. Utilisation de '${defaultType}' par défaut.`);
        rl.close();
        resolve(null);
        return;
      }
      
      rl.question(`Description [${defaultDesc}]: `, (descAnswer) => {
        const desc = descAnswer.trim() || defaultDesc;
        const formattedDesc = formatDescription(desc);
        const message = buildCommitMessage(type, formattedDesc);
        resolve(message);
      });
    });
  });
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Génération automatique de commit\n');
  
  // Vérifier qu'on est dans un repo git
  const gitDir = execGit('git rev-parse --git-dir');
  if (!gitDir) {
    console.error('❌ Erreur: Ce répertoire n\'est pas un dépôt Git.');
    process.exit(1);
  }
  
  // Récupérer les fichiers modifiés
  const files = getChangedFiles();
  
  if (files.length === 0) {
    console.log('ℹ️  Aucun changement détecté. Rien à committer.');
    process.exit(0);
  }
  
  console.log(`📋 ${files.length} fichier(s) modifié(s):`);
  files.slice(0, 10).forEach(f => {
    const icon = f.status.startsWith('A') ? '➕' : f.status.startsWith('D') ? '➖' : '📝';
    console.log(`   ${icon} ${f.file}`);
  });
  if (files.length > 10) {
    console.log(`   ... et ${files.length - 10} autre(s) fichier(s)`);
  }
  
  // Détecter le type et générer la description
  const detectedType = detectType(files);
  const detectedDesc = generateDescription(files);
  const formattedDesc = formatDescription(detectedDesc);
  const proposedMessage = buildCommitMessage(detectedType, formattedDesc);
  
  // Interface interactive
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const finalMessage = await askConfirmation(rl, proposedMessage, detectedType, formattedDesc);
  rl.close();
  
  if (!finalMessage) {
    process.exit(0);
  }
  
  // Exécuter git add -A
  console.log('\n📦 Ajout des fichiers...');
  try {
    execGit('git add -A');
    console.log('✅ Fichiers ajoutés.');
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des fichiers:', error.message);
    process.exit(1);
  }
  
  // Exécuter git commit
  console.log('💾 Création du commit...');
  try {
    execGit(`git commit -m "${finalMessage}"`);
    console.log(`\n✅ Commit créé avec succès!`);
    console.log(`   ${finalMessage}\n`);
  } catch (error) {
    console.error('❌ Erreur lors de la création du commit:', error.message);
    process.exit(1);
  }
}

// Exécuter
main().catch(error => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});

