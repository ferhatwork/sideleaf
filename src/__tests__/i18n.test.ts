import { describe, it, expect } from 'vitest';
import { en } from '../i18n/en';
import { tr } from '../i18n/tr';
import { formatTimeAgo, formatLocalizedDateTime } from '../utils/format';
import { formatLocalizedDate, detectSystemLocale, getTranslation } from '../i18n';

describe('i18n Translation & Localization Suite', () => {
  // Helper to collect all leaf keys and values
  function collectKeysAndValues(
    obj: Record<string, any>,
    prefix = ''
  ): { keys: string[]; values: { path: string; value: any }[] } {
    const keys: string[] = [];
    const values: { path: string; value: any }[] = [];

    for (const [key, val] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      keys.push(fullPath);
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        const sub = collectKeysAndValues(val, fullPath);
        keys.push(...sub.keys);
        values.push(...sub.values);
      } else {
        values.push({ path: fullPath, value: val });
      }
    }
    return { keys, values };
  }

  const enData = collectKeysAndValues(en);
  const trData = collectKeysAndValues(tr);

  describe('Dictionary Parity and Structure', () => {
    it('has exact 1:1 key parity between en and tr', () => {
      const enKeySet = new Set(enData.keys);
      const trKeySet = new Set(trData.keys);

      const missingInTr = enData.keys.filter((k) => !trKeySet.has(k));
      const missingInEn = trData.keys.filter((k) => !enKeySet.has(k));

      expect(missingInTr, `Keys present in en but missing in tr: ${missingInTr.join(', ')}`).toEqual([]);
      expect(missingInEn, `Keys present in tr but missing in en: ${missingInEn.join(', ')}`).toEqual([]);
    });

    it('has matching types (string vs function) for all keys', () => {
      const enMap = new Map(enData.values.map((v) => [v.path, typeof v.value]));
      for (const { path, value } of trData.values) {
        const enType = enMap.get(path);
        expect(typeof value, `Type mismatch at ${path}`).toBe(enType);
      }
    });

    it('contains no empty strings in en or tr', () => {
      for (const { path, value } of enData.values) {
        if (typeof value === 'string') {
          expect(value.trim().length, `Empty string found in en at ${path}`).toBeGreaterThan(0);
        }
      }
      for (const { path, value } of trData.values) {
        if (typeof value === 'string') {
          expect(value.trim().length, `Empty string found in tr at ${path}`).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Standard Turkish Terminology Alignment', () => {
    it('uses correct Turkish terms for core Sideleaf entities and actions', () => {
      // Workspace -> Çalışma alanı
      expect(tr.navigation.workspaces.toLowerCase()).toContain('çalışma');
      expect(tr.common.workspaces.toLowerCase()).toContain('çalışma alanı');
      expect(tr.workspace.workspaceName.toLowerCase()).toContain('çalışma alanı');

      // Section -> Bölüm
      expect(tr.section.section.toLowerCase()).toBe('bölüm');
      expect(tr.section.addSection.toLowerCase()).toBe('bölüm ekle');

      // Unsectioned -> Bölümsüz
      expect(tr.section.unsectioned.toLowerCase()).toBe('bölümsüz');

      // Compact -> Kompakt
      expect(tr.bulk.viewModeCompact.toLowerCase()).toContain('kompakt');

      // Normal -> Normal
      expect(tr.bulk.viewModeNormal.toLowerCase()).toContain('normal');

      // Copy -> Kopyala
      expect(tr.common.copy.toLowerCase()).toBe('kopyala');

      // Copy link -> Bağlantıyı kopyala
      expect(tr.item.copyLink.toLowerCase()).toBe('bağlantıyı kopyala');

      // Copy links -> Bağlantıları kopyala
      expect(tr.bulk.copyLinks.toLowerCase()).toBe('bağlantıları kopyala');

      // Open -> Aç
      expect(tr.item.openSource.toLowerCase()).toBe('kaynağı aç');

      // Move -> Taşı
      expect(tr.item.moveToWorkspace.toLowerCase()).toBe('çalışma alanına taşı');
      expect(tr.bulk.moveToSection.toLowerCase()).toBe('bölüme taşı');

      // Archive -> Arşivle
      expect(tr.item.archiveAction.toLowerCase()).toBe('arşivle');
      expect(tr.bulk.archiveSelected.toLowerCase()).toBe('arşivle');

      // Delete -> Sil
      expect(tr.common.delete.toLowerCase()).toBe('sil');
      expect(tr.item.deleteAction.toLowerCase()).toBe('sil');
      expect(tr.bulk.deleteSelected.toLowerCase()).toBe('sil');

      // Rename -> Yeniden adlandır
      expect(tr.section.renameSection.toLowerCase()).toContain('yeniden adlandır');

      // Add here -> Buraya ekle
      expect(tr.section.addHere.toLowerCase()).toBe('buraya ekle');

      // Selected -> seçildi
      expect(tr.bulk.selected.toLowerCase()).toBe('seçildi');

      // Settings -> Ayarlar
      expect(tr.settings.title.toLowerCase()).toBe('ayarlar');

      // Search -> Ara
      expect(tr.common.search.toLowerCase()).toBe('ara');

      // Trash -> Çöp Kutusu
      expect(tr.navigation.trash.toLowerCase()).toContain('çöp kutusu');
      expect(tr.trash.title.toLowerCase()).toContain('çöp kutusu');

      // Recent -> Son Yapılanlar
      expect(tr.navigation.recent.toLowerCase()).toBe('son yapılanlar');
      expect(tr.recent.title.toLowerCase()).toBe('son yapılanlar');
    });
  });

  describe('Localization Formatters', () => {
    it('formats time ago correctly in Turkish and English', () => {
      const now = Date.now();
      expect(formatTimeAgo(now - 1000, 'tr')).toBe('az önce');
      expect(formatTimeAgo(now - 1000, 'en')).toBe('just now');

      expect(formatTimeAgo(now - 5 * 60 * 1000, 'tr')).toBe('5 dk önce');
      expect(formatTimeAgo(now - 5 * 60 * 1000, 'en')).toBe('5m ago');

      expect(formatTimeAgo(now - 2 * 60 * 60 * 1000, 'tr')).toBe('2 sa önce');
      expect(formatTimeAgo(now - 2 * 60 * 60 * 1000, 'en')).toBe('2h ago');

      expect(formatTimeAgo(now - 24 * 60 * 60 * 1000, 'tr')).toBe('dün');
      expect(formatTimeAgo(now - 24 * 60 * 60 * 1000, 'en')).toBe('yesterday');

      expect(formatTimeAgo(now - 3 * 24 * 60 * 60 * 1000, 'tr')).toBe('3 gün önce');
      expect(formatTimeAgo(now - 3 * 24 * 60 * 60 * 1000, 'en')).toBe('3d ago');
    });

    it('formats localized date and time strings properly', () => {
      const testTimestamp = new Date('2026-09-12T12:00:00Z').getTime();
      const trDate = formatLocalizedDate(testTimestamp, 'tr');
      const enDate = formatLocalizedDate(testTimestamp, 'en');

      expect(trDate).toBeTruthy();
      expect(enDate).toBeTruthy();

      const trDateTime = formatLocalizedDateTime(testTimestamp, 'tr');
      const enDateTime = formatLocalizedDateTime(testTimestamp, 'en');
      expect(trDateTime).toBeTruthy();
      expect(enDateTime).toBeTruthy();
    });

    it('returns valid schema from getTranslation helper', () => {
      expect(getTranslation('en')).toBe(en);
      expect(getTranslation('tr')).toBe(tr);
      // Fallback for invalid locale
      expect(getTranslation('fr' as any)).toBe(en);
    });

    it('detects system locale or falls back gracefully', () => {
      const detected = detectSystemLocale();
      expect(['en', 'tr']).toContain(detected);
    });
  });

  describe('Parameterized Translation Functions', () => {
    it('produces expected strings for function-based keys', () => {
      expect(tr.common.showMoreRemaining(5)).toBe('Daha fazla göster (5 kaldı)');
      expect(en.common.showMoreRemaining(5)).toBe('Show more (5 remaining)');

      expect(tr.trash.deletedTimeAgo('2 gün önce')).toBe('Silinme: 2 gün önce');
      expect(en.trash.deletedTimeAgo('2d ago')).toBe('Deleted 2d ago');

      expect(tr.workspace.selectColor('#3b82f6')).toBe('#3b82f6 rengini seç');
      expect(en.workspace.selectColor('#3b82f6')).toBe('Select color #3b82f6');

      expect(tr.workspace.workspaceOptions('Proje')).toBe('"Proje" çalışma alanı seçenekleri');
      expect(en.workspace.workspaceOptions('Project')).toBe('Options for workspace Project');

      expect(tr.workspace.fromWorkspace('Proje')).toBe('"Proje" çalışma alanından');
      expect(en.workspace.fromWorkspace('Project')).toBe('from Project');

      expect(tr.toast.convertedToType('Not')).toBe('Not türüne dönüştürüldü');
      expect(en.toast.convertedToType('Note')).toBe('Converted to Note');

      expect(tr.toast.movedToWorkspace('Proje')).toBe('"Proje" çalışma alanına taşındı');
      expect(en.toast.movedToWorkspace('Project')).toBe('Moved to Project');

      expect(tr.common.switchLanguage('en')).toBe('Switch to English');
      expect(tr.common.switchLanguage('tr')).toBe("Türkçe'ye geç");
    });
  });
});
