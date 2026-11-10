/**
 * Pyramide Record – Enregistrement automatique des devis/factures dans Google Drive.
 * Colle ce script dans script.google.com (voir LISEZ-MOI.md). Aucune clé n'est écrite ici :
 * elle est générée par setup() et gardée dans les propriétés du script.
 */
const P = PropertiesService.getScriptProperties();

/** À lancer UNE FOIS : crée le dossier Drive, le registre (Google Sheet) et la clé secrète. */
function setup() {
  if (P.getProperty('FOLDER_ID')) { Logger.log('Déjà configuré. Lancez liaison() pour revoir le code.'); return; }
  const folder = DriveApp.createFolder('Pyramide Record – Devis et factures');
  const ss = SpreadsheetApp.create('Pyramide Record – Registre des documents');
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  P.setProperties({ FOLDER_ID: folder.getId(), SHEET_ID: ss.getId(), SECRET: Utilities.getUuid().replace(/-/g, '').slice(0, 24) });
  Logger.log('Dossier créé : ' + folder.getUrl());
  Logger.log('Registre créé : ' + ss.getUrl());
}

/** À lancer APRÈS le déploiement : affiche le « code de liaison » à coller dans le constructeur. */
function liaison() {
  const url = ScriptApp.getService().getUrl();
  if (!url) { Logger.log('Déployez d\'abord le script (Déployer > Nouveau déploiement > Application Web).'); return; }
  Logger.log('CODE DE LIAISON (à coller dans le constructeur, bouton « Liaison Drive », suivi d\'un espace et de l\'adresse publique …/exec du déploiement) :\n' +
    Utilities.base64Encode(JSON.stringify({ u: url, k: P.getProperty('SECRET') })));
}

function doGet() { return out({ ok: true, msg: 'Pyramide Record sync' }); }

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.act === 'lead') return lead(d);   // public : téléchargements des visiteurs (sans clé)
    if (!d.key || d.key !== P.getProperty('SECRET')) return out({ ok: false, error: 'clé invalide' });
    if (!d.no || !d.pdf) return out({ ok: false, error: 'données manquantes' });
    const fac = d.type === 'facture';
    const year = String(d.year || new Date().getFullYear());
    const root = DriveApp.getFolderById(P.getProperty('FOLDER_ID'));
    const folder = sub(sub(root, fac ? 'Factures' : 'Devis'), year);   // Devis/2026/ ou Factures/2026/
    const slug = d.slug ? '_' + d.slug : '';
    let name;
    if (fac) {
      // factures : une nouvelle version datée à chaque fois, jamais remplacée
      name = d.no + slug + '_' + (d.stamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH\'h\'mm')) + '.pdf';
    } else {
      // devis : un seul PDF par devis, remplacé à chaque enregistrement
      name = d.no + slug + '.pdf';
      const it = folder.getFiles();
      while (it.hasNext()) { const x = it.next(); if (x.getName().indexOf(d.no + '_') === 0 || x.getName() === d.no + '.pdf') x.setTrashed(true); }
    }
    const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(d.pdf), 'application/pdf', name));
    // registre
    const ss = SpreadsheetApp.openById(P.getProperty('SHEET_ID'));
    const sh = ss.getSheetByName('Documents') || ss.getSheets()[0].setName('Documents');
    if (sh.getLastRow() === 0) {
      sh.appendRow(['N°', 'Type', 'Date', 'Client', 'Téléphone', 'Objet', 'Statut', 'Total ($)', 'PDF', 'Mis à jour']);
      sh.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#14172b').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    const row = [d.no, fac ? 'Facture' : 'Devis', d.date || '', d.client || '', d.phone || '', d.subject || '', d.status || '', Number(d.total) || 0,
      '=HYPERLINK("' + file.getUrl() + '";"Ouvrir")', new Date()];
    const col = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().map(r => r[0]);
    const idx = col.indexOf(d.no);
    if (idx >= 0) sh.getRange(idx + 2, 1, 1, 10).setValues([row]); else sh.appendRow(row);
    return out({ ok: true, url: file.getUrl() });
  } catch (err) { return out({ ok: false, error: String(err) }); }
}

function sub(parent, name) { const it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- Visiteurs du configurateur public : dossier + registre séparés ---------- */
function leadsSetup() {
  if (P.getProperty('LEADS_FOLDER_ID')) return;
  const folder = DriveApp.createFolder('Pyramide Record – Téléchargements visiteurs');
  const ss = SpreadsheetApp.create('Pyramide Record – Visiteurs (leads)');
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  P.setProperties({ LEADS_FOLDER_ID: folder.getId(), LEADS_SHEET_ID: ss.getId() });
}

function lead(d) {
  if (d.hp) return out({ ok: true });                                   // champ piège : robot
  if (!d.pdf || String(d.pdf).length > 8000000) return out({ ok: false, error: 'pdf' });
  const given = String(d.given) === '1';
  const digits = String(d.phone || '').replace(/\D/g, '');
  if (given && (digits.length < 8 || digits.length > 15)) return out({ ok: false, error: 'numéro' });
  // limites anti-spam : 40 envois par heure au total, 4 par numéro et par heure
  const cache = CacheService.getScriptCache(), hour = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
  const kg = 'lg' + hour, kp = 'lp' + hour + digits;
  const ng = Number(cache.get(kg) || 0), np = given ? Number(cache.get(kp) || 0) : 0;
  if (ng >= 40 || np >= 4) return out({ ok: false, error: 'limite' });
  cache.put(kg, String(ng + 1), 3700); if (given) cache.put(kp, String(np + 1), 3700);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    leadsSetup();
    const clean = t => String(t || '').replace(/[\r\n\t]+/g, ' ').slice(0, 120);
    const safe = t => clean(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
    const stamp = /^[0-9_h-]{8,20}$/.test(d.stamp || '') ? d.stamp : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HH'h'mm");
    const who = given ? (safe(d.name) || 'visiteur') + '_+' + digits : 'ANONYME';
    const name = stamp + '_' + who + '.pdf';
    const folder = sub(DriveApp.getFolderById(P.getProperty('LEADS_FOLDER_ID')), stamp.slice(0, 7));   // un sous-dossier par mois
    const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(d.pdf), 'application/pdf', name));
    const ss = SpreadsheetApp.openById(P.getProperty('LEADS_SHEET_ID'));
    let sh = ss.getSheetByName('Visiteurs') || ss.getSheets()[0].setName('Visiteurs');
    if (sh.getLastRow() === 0) {
      const H = ['Date', 'A donné ses coordonnées', 'Nom', 'WhatsApp', 'Écrire', 'Salle', 'Dimensions', 'Formule', 'Total estimé ($)', 'N° devis', 'PDF', 'Statut', 'Code de la salle'];
      sh.appendRow(H);
      sh.getRange(1, 1, 1, H.length).setFontWeight('bold').setBackground('#0D131C').setFontColor('#F0EBE1');
      sh.setFrozenRows(1);
      sh.getRange(2, 12, 1000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Nouveau', 'Contacté', 'Devis envoyé', 'Gagné', 'Perdu'], true).build());
    }
    sh.appendRow([new Date(), given ? 'Oui' : 'Non', given ? clean(d.name) : '', given ? '+' + digits : '',
      given ? '=HYPERLINK("https://wa.me/' + digits + '";"WhatsApp")' : '', clean(d.room), clean(d.size), clean(d.mode),
      Number(d.totalNum) || 0, clean(d.no), '=HYPERLINK("' + file.getUrl() + '";"Ouvrir")', 'Nouveau', String(d.code || '').slice(0, 20000)]);
    return out({ ok: true });
  } finally { lock.releaseLock(); }
}
