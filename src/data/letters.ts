/**
 * Die 28 Buchstaben des arabischen Alphabets.
 *
 * Die vier Kontextformen werden nicht von Hand eingetragen, sondern mit
 * `buildForms()` aus dem Grundbuchstaben erzeugt (siehe domain/arabic.ts).
 *
 * `highlightIndex` in den Beispielwörtern zählt Zeichen vom Anfang der Zeichenkette.
 * Weil Arabisch von rechts nach links gelesen wird, ist Index 0 der Buchstabe **ganz
 * rechts**. Ein Test (tests/data.test.ts) prüft für jedes Beispielwort, dass an
 * dieser Position tatsächlich der gelernte Buchstabe steht.
 */

import { buildForms } from '../domain/arabic.ts';
import type { ExampleWord, Letter } from '../domain/types.ts';

/** Eingabeform: alles außer den ableitbaren Feldern (`id`, `kind`, `forms`, `group`). */
interface LetterSeed {
  slug: string;
  order: number;
  char: string;
  nameArabic: string;
  nameGerman: string;
  translit: string;
  pronunciation: string;
  examples: ExampleWord[];
  mnemonic: string;
  /** Slugs formähnlicher Buchstaben. */
  confusable: string[];
}

/** Rohdaten in Alphabet-Reihenfolge. */
const SEEDS: LetterSeed[] = [
  {
    slug: 'alif',
    order: 1,
    char: 'ا',
    nameArabic: 'أَلِف',
    nameGerman: 'Alif',
    translit: 'ā',
    pronunciation:
      'Langes „a" wie in „Vater". Am Wortanfang ist Alif meist nur ein Träger für einen Vokal oder den Hamza-Laut.',
    examples: [
      // ا(0) س(1) م(2)
      { arabic: 'اسم', translit: 'ism', german: 'Name', highlightIndex: 0 },
      // ك(0) ت(1) ا(2) ب(3)
      { arabic: 'كتاب', translit: 'kitāb', german: 'Buch', highlightIndex: 2 },
      // ب(0) ا(1) ب(2)
      { arabic: 'باب', translit: 'bāb', german: 'Tür', highlightIndex: 1 },
    ],
    mnemonic: 'Ein einzelner senkrechter Strich – wie die Zahl 1 oder ein Fahnenmast.',
    confusable: ['lam'],
  },
  {
    slug: 'baa',
    order: 2,
    char: 'ب',
    nameArabic: 'باء',
    nameGerman: 'Bā',
    translit: 'b',
    pronunciation: 'Wie das deutsche „b" in „Boot".',
    examples: [
      // ب(0) ا(1) ب(2)
      { arabic: 'باب', translit: 'bāb', german: 'Tür', highlightIndex: 0 },
      // ك(0) ت(1) ا(2) ب(3)
      { arabic: 'كتاب', translit: 'kitāb', german: 'Buch', highlightIndex: 3 },
      // ح(0) ب(1) ي(2) ب(3)
      { arabic: 'حبيب', translit: 'ḥabīb', german: 'Liebling', highlightIndex: 1 },
    ],
    mnemonic: 'Eine Schale (Boot) mit **einem** Punkt **unten** – „b" wie Boot.',
    confusable: ['taa', 'thaa', 'nun', 'ya'],
  },
  {
    slug: 'taa',
    order: 3,
    char: 'ت',
    nameArabic: 'تاء',
    nameGerman: 'Tā',
    translit: 't',
    pronunciation: 'Wie das deutsche „t" in „Tür".',
    examples: [
      // ك(0) ت(1) ا(2) ب(3)
      { arabic: 'كتاب', translit: 'kitāb', german: 'Buch', highlightIndex: 1 },
      // ب(0) ن(1) ت(2)
      { arabic: 'بنت', translit: 'bint', german: 'Mädchen', highlightIndex: 2 },
      // ت(0) م(1) ر(2)
      { arabic: 'تمر', translit: 'tamr', german: 'Dattel', highlightIndex: 0 },
    ],
    mnemonic: 'Dieselbe Schale wie Bā, aber **zwei Punkte oben** – „t" hat zwei Striche.',
    confusable: ['baa', 'thaa', 'nun'],
  },
  {
    slug: 'thaa',
    order: 4,
    char: 'ث',
    nameArabic: 'ثاء',
    nameGerman: 'Thā',
    translit: 'ṯ',
    pronunciation: 'Stimmloses „th" wie im englischen „think" – Zunge zwischen die Zähne.',
    examples: [
      // ث(0) ل(1) ا(2) ث(3) ة(4)
      { arabic: 'ثلاثة', translit: 'ṯalāṯa', german: 'drei', highlightIndex: 0 },
      // ح(0) د(1) ي(2) ث(3)
      { arabic: 'حديث', translit: 'ḥadīṯ', german: 'Gespräch', highlightIndex: 3 },
      // ث(0) و(1) ب(2)
      { arabic: 'ثوب', translit: 'ṯawb', german: 'Gewand', highlightIndex: 0 },
    ],
    mnemonic: 'Die Schale mit **drei Punkten oben** – drei wie „ṯalāṯa" (drei).',
    confusable: ['baa', 'taa', 'nun'],
  },
  {
    slug: 'jim',
    order: 5,
    char: 'ج',
    nameArabic: 'جيم',
    nameGerman: 'Dschīm',
    translit: 'ǧ',
    pronunciation: 'Wie „dsch" in „Dschungel" oder das „j" in „Job".',
    examples: [
      // ج(0) م(1) ل(2)
      { arabic: 'جمل', translit: 'ǧamal', german: 'Kamel', highlightIndex: 0 },
      // ر(0) ج(1) ل(2)
      { arabic: 'رجل', translit: 'raǧul', german: 'Mann', highlightIndex: 1 },
      // ث(0) ل(1) ج(2)
      { arabic: 'ثلج', translit: 'ṯalǧ', german: 'Schnee', highlightIndex: 2 },
    ],
    mnemonic: 'Ein Haken mit **einem Punkt innen** – der Punkt sitzt im Bauch.',
    confusable: ['hha', 'kha'],
  },
  {
    slug: 'hha',
    order: 6,
    char: 'ح',
    nameArabic: 'حاء',
    nameGerman: 'Ḥā',
    translit: 'ḥ',
    pronunciation:
      'Kräftiges, kehliges „h" – tief im Rachen, wie beim Anhauchen einer Brille.',
    examples: [
      // ح(0) ب(1)
      { arabic: 'حب', translit: 'ḥubb', german: 'Liebe', highlightIndex: 0 },
      // ص(0) ب(1) ا(2) ح(3)
      { arabic: 'صباح', translit: 'ṣabāḥ', german: 'Morgen', highlightIndex: 3 },
      // ب(0) ح(1) ر(2)
      { arabic: 'بحر', translit: 'baḥr', german: 'Meer', highlightIndex: 1 },
    ],
    mnemonic: 'Derselbe Haken wie Dschīm, aber **ohne Punkt** – leer wie ein Hauch.',
    confusable: ['jim', 'kha'],
  },
  {
    slug: 'kha',
    order: 7,
    char: 'خ',
    nameArabic: 'خاء',
    nameGerman: 'Chā',
    translit: 'ḫ',
    pronunciation: 'Raues „ch" wie in „Bach" oder „Loch".',
    examples: [
      // خ(0) ب(1) ز(2)
      { arabic: 'خبز', translit: 'ḫubz', german: 'Brot', highlightIndex: 0 },
      // ن(0) خ(1) ل(2) ة(3)
      { arabic: 'نخلة', translit: 'naḫla', german: 'Palme', highlightIndex: 1 },
      // ت(0) ا(1) ر(2) ي(3) خ(4)
      { arabic: 'تاريخ', translit: 'tārīḫ', german: 'Geschichte', highlightIndex: 4 },
    ],
    mnemonic: 'Der Haken mit **einem Punkt oben** – der Punkt steigt auf wie beim „ch".',
    confusable: ['jim', 'hha'],
  },
  {
    slug: 'dal',
    order: 8,
    char: 'د',
    nameArabic: 'دال',
    nameGerman: 'Dāl',
    translit: 'd',
    pronunciation: 'Wie das deutsche „d" in „Dach".',
    examples: [
      // د(0) ا(1) ر(2)
      { arabic: 'دار', translit: 'dār', german: 'Haus', highlightIndex: 0 },
      // و(0) ل(1) د(2)
      { arabic: 'ولد', translit: 'walad', german: 'Junge', highlightIndex: 2 },
      // م(0) د(1) ي(2) ن(3) ة(4)
      { arabic: 'مدينة', translit: 'madīna', german: 'Stadt', highlightIndex: 1 },
    ],
    mnemonic:
      'Ein kleiner Winkel wie ein Türgriff – **verbindet nicht nach links**, macht also eine Lücke.',
    confusable: ['dhal', 'ra'],
  },
  {
    slug: 'dhal',
    order: 9,
    char: 'ذ',
    nameArabic: 'ذال',
    nameGerman: 'Dhāl',
    translit: 'ḏ',
    pronunciation: 'Stimmhaftes „th" wie im englischen „this".',
    examples: [
      // ذ(0) ه(1) ب(2)
      { arabic: 'ذهب', translit: 'ḏahab', german: 'Gold', highlightIndex: 0 },
      // ه(0) ذ(1) ا(2)
      { arabic: 'هذا', translit: 'hāḏā', german: 'dieser', highlightIndex: 1 },
      // ل(0) ذ(1) ي(2) ذ(3)
      { arabic: 'لذيذ', translit: 'laḏīḏ', german: 'lecker', highlightIndex: 1 },
    ],
    mnemonic: 'Dāl mit **einem Punkt oben** – der Punkt macht das „d" weich zum „th".',
    confusable: ['dal', 'zay'],
  },
  {
    slug: 'ra',
    order: 10,
    char: 'ر',
    nameArabic: 'راء',
    nameGerman: 'Rā',
    translit: 'r',
    pronunciation: 'Gerolltes Zungenspitzen-„r" wie im Italienischen oder Bayerischen.',
    examples: [
      // ر(0) ج(1) ل(2)
      { arabic: 'رجل', translit: 'raǧul', german: 'Mann', highlightIndex: 0 },
      // ب(0) ح(1) ر(2)
      { arabic: 'بحر', translit: 'baḥr', german: 'Meer', highlightIndex: 2 },
      // ك(0) ر(1) ي(2) م(3)
      { arabic: 'كريم', translit: 'karīm', german: 'großzügig', highlightIndex: 1 },
    ],
    mnemonic:
      'Ein nach unten offener Bogen, der unter die Linie taucht – **verbindet nicht nach links**.',
    confusable: ['zay', 'dal', 'waw'],
  },
  {
    slug: 'zay',
    order: 11,
    char: 'ز',
    nameArabic: 'زاي',
    nameGerman: 'Zāy',
    translit: 'z',
    pronunciation: 'Stimmhaftes „s" wie in „Rose" – niemals wie das deutsche „z".',
    examples: [
      // ز(0) ي(1) ت(2)
      { arabic: 'زيت', translit: 'zayt', german: 'Öl', highlightIndex: 0 },
      // م(0) و(1) ز(2)
      { arabic: 'موز', translit: 'mawz', german: 'Bananen', highlightIndex: 2 },
      // خ(0) ب(1) ز(2)
      { arabic: 'خبز', translit: 'ḫubz', german: 'Brot', highlightIndex: 2 },
    ],
    mnemonic: 'Rā mit **einem Punkt oben** – der Punkt macht das „r" zum summenden „s".',
    confusable: ['ra', 'dhal'],
  },
  {
    slug: 'sin',
    order: 12,
    char: 'س',
    nameArabic: 'سين',
    nameGerman: 'Sīn',
    translit: 's',
    pronunciation: 'Scharfes, stimmloses „s" wie in „Haus".',
    examples: [
      // س(0) م(1) ك(2)
      { arabic: 'سمك', translit: 'samak', german: 'Fisch', highlightIndex: 0 },
      // د(0) ر(1) س(2)
      { arabic: 'درس', translit: 'dars', german: 'Unterricht', highlightIndex: 2 },
      // م(0) س(1) ا(2) ف(3) ة(4)
      { arabic: 'مسافة', translit: 'masāfa', german: 'Entfernung', highlightIndex: 1 },
    ],
    mnemonic: 'Drei Zacken wie Sägezähne – „S" wie Säge.',
    confusable: ['shin', 'sad'],
  },
  {
    slug: 'shin',
    order: 13,
    char: 'ش',
    nameArabic: 'شين',
    nameGerman: 'Schīn',
    translit: 'š',
    pronunciation: 'Wie „sch" in „Schule".',
    examples: [
      // ش(0) م(1) س(2)
      { arabic: 'شمس', translit: 'šams', german: 'Sonne', highlightIndex: 0 },
      // خ(0) ش(1) ب(2)
      { arabic: 'خشب', translit: 'ḫašab', german: 'Holz', highlightIndex: 1 },
      // ع(0) ش(1) ا(2) ء(3)
      { arabic: 'عشاء', translit: 'ʿašāʾ', german: 'Abendessen', highlightIndex: 1 },
    ],
    mnemonic: 'Die Säge (Sīn) mit **drei Punkten oben** – aus „s" wird „sch".',
    confusable: ['sin', 'dad'],
  },
  {
    slug: 'sad',
    order: 14,
    char: 'ص',
    nameArabic: 'صاد',
    nameGerman: 'Ṣād',
    translit: 'ṣ',
    pronunciation:
      'Dumpfes, „schweres" s – Zunge breit am Mundboden, der Klang wird dunkel.',
    examples: [
      // ص(0) ب(1) ا(2) ح(3)
      { arabic: 'صباح', translit: 'ṣabāḥ', german: 'Morgen', highlightIndex: 0 },
      // ق(0) ص(1) ر(2)
      { arabic: 'قصر', translit: 'qaṣr', german: 'Palast', highlightIndex: 1 },
      // ص(0) د(1) ي(2) ق(3)
      { arabic: 'صديق', translit: 'ṣadīq', german: 'Freund', highlightIndex: 0 },
    ],
    mnemonic: 'Eine große Schlaufe mit Wanne – ein „dickes s", das dunkel klingt.',
    confusable: ['dad', 'sin', 'tta'],
  },
  {
    slug: 'dad',
    order: 15,
    char: 'ض',
    nameArabic: 'ضاد',
    nameGerman: 'Ḍād',
    translit: 'ḍ',
    pronunciation: 'Dumpfes, „schweres" d. Arabisch heißt auch „die Sprache des Ḍād".',
    examples: [
      // ض(0) ي(1) ف(2)
      { arabic: 'ضيف', translit: 'ḍayf', german: 'Gast', highlightIndex: 0 },
      // خ(0) ض(1) ا(2) ر(3)
      { arabic: 'خضار', translit: 'ḫuḍār', german: 'Gemüse', highlightIndex: 1 },
      // ا(0) ب(1) ي(2) ض(3)
      { arabic: 'ابيض', translit: 'abyaḍ', german: 'weiß', highlightIndex: 3 },
    ],
    mnemonic: 'Ṣād mit **einem Punkt oben** – der Punkt macht aus dem „s" ein „d".',
    confusable: ['sad', 'shin'],
  },
  {
    slug: 'tta',
    order: 16,
    char: 'ط',
    nameArabic: 'طاء',
    nameGerman: 'Ṭā',
    translit: 'ṭ',
    pronunciation: 'Dumpfes, „schweres" t – kräftig und dunkel gesprochen.',
    examples: [
      // ط(0) ع(1) ا(2) م(3)
      { arabic: 'طعام', translit: 'ṭaʿām', german: 'Essen', highlightIndex: 0 },
      // ق(0) ط(1) ا(2) ر(3)
      { arabic: 'قطار', translit: 'qiṭār', german: 'Zug', highlightIndex: 1 },
      // ب(0) ط(1) ل(2)
      { arabic: 'بطل', translit: 'baṭal', german: 'Held', highlightIndex: 1 },
    ],
    mnemonic: 'Eine Wanne mit **senkrechtem Mast** – sieht aus wie ein „b" mit Stock.',
    confusable: ['zza', 'sad'],
  },
  {
    slug: 'zza',
    order: 17,
    char: 'ظ',
    nameArabic: 'ظاء',
    nameGerman: 'Ẓā',
    translit: 'ẓ',
    pronunciation: 'Dumpfes, „schweres" stimmhaftes „th" – die dunkle Variante von Dhāl.',
    examples: [
      // ظ(0) ه(1) ر(2)
      { arabic: 'ظهر', translit: 'ẓuhr', german: 'Mittag', highlightIndex: 0 },
      // ن(0) ظ(1) ي(2) ف(3)
      { arabic: 'نظيف', translit: 'naẓīf', german: 'sauber', highlightIndex: 1 },
      // ح(0) ظ(1)
      { arabic: 'حظ', translit: 'ḥaẓẓ', german: 'Glück', highlightIndex: 1 },
    ],
    mnemonic: 'Ṭā mit **einem Punkt oben** – gleiche Wanne, ein Punkt mehr.',
    confusable: ['tta', 'dad'],
  },
  {
    slug: 'ayn',
    order: 18,
    char: 'ع',
    nameArabic: 'عين',
    nameGerman: 'ʿAin',
    translit: 'ʿ',
    pronunciation:
      'Kehllaut ohne deutsche Entsprechung: Rachen zusammendrücken und stimmhaft pressen – wie beim Gewichtheben.',
    examples: [
      // ع(0) ي(1) ن(2)
      { arabic: 'عين', translit: 'ʿayn', german: 'Auge', highlightIndex: 0 },
      // ش(0) ا(1) ر(2) ع(3)
      { arabic: 'شارع', translit: 'šāriʿ', german: 'Straße', highlightIndex: 3 },
      // س(0) ع(1) ي(2) د(3)
      { arabic: 'سعيد', translit: 'saʿīd', german: 'glücklich', highlightIndex: 1 },
    ],
    mnemonic: 'Sieht aus wie ein **Auge** mit Schwung – und heißt auch „Auge" (ʿayn).',
    confusable: ['ghayn', 'fa'],
  },
  {
    slug: 'ghayn',
    order: 19,
    char: 'غ',
    nameArabic: 'غين',
    nameGerman: 'Ghain',
    translit: 'ġ',
    pronunciation: 'Wie ein gegurgeltes „r" – ähnlich dem französischen „r" in „Paris".',
    examples: [
      // غ(0) ر(1) ف(2) ة(3)
      { arabic: 'غرفة', translit: 'ġurfa', german: 'Zimmer', highlightIndex: 0 },
      // ص(0) غ(1) ي(2) ر(3)
      { arabic: 'صغير', translit: 'ṣaġīr', german: 'klein', highlightIndex: 1 },
      // ب(0) غ(1) د(2) ا(3) د(4)
      { arabic: 'بغداد', translit: 'baġdād', german: 'Bagdad', highlightIndex: 1 },
    ],
    mnemonic: 'Das Auge (ʿAin) mit **einem Punkt oben** – ein Auge, das gurgelt.',
    confusable: ['ayn', 'fa'],
  },
  {
    slug: 'fa',
    order: 20,
    char: 'ف',
    nameArabic: 'فاء',
    nameGerman: 'Fā',
    translit: 'f',
    pronunciation: 'Wie das deutsche „f" in „Fisch".',
    examples: [
      // ف(0) ي(1) ل(2)
      { arabic: 'فيل', translit: 'fīl', german: 'Elefant', highlightIndex: 0 },
      // س(0) ف(1) ر(2)
      { arabic: 'سفر', translit: 'safar', german: 'Reise', highlightIndex: 1 },
      // ض(0) ي(1) ف(2)
      { arabic: 'ضيف', translit: 'ḍayf', german: 'Gast', highlightIndex: 2 },
    ],
    mnemonic: 'Ein Kreis mit **einem Punkt oben** und Schwanz – wie eine Pfeife.',
    confusable: ['qaf', 'ayn'],
  },
  {
    slug: 'qaf',
    order: 21,
    char: 'ق',
    nameArabic: 'قاف',
    nameGerman: 'Qāf',
    translit: 'q',
    pronunciation: 'Tiefes „k", weit hinten am Gaumen gebildet – dunkler als Kāf.',
    examples: [
      // ق(0) ل(1) م(2)
      { arabic: 'قلم', translit: 'qalam', german: 'Stift', highlightIndex: 0 },
      // س(0) و(1) ق(2)
      { arabic: 'سوق', translit: 'sūq', german: 'Markt', highlightIndex: 2 },
      // ق(0) م(1) ر(2)
      { arabic: 'قمر', translit: 'qamar', german: 'Mond', highlightIndex: 0 },
    ],
    mnemonic: 'Wie Fā, aber mit **zwei Punkten oben** und tieferer Wanne.',
    confusable: ['fa', 'waw'],
  },
  {
    slug: 'kaf',
    order: 22,
    char: 'ك',
    nameArabic: 'كاف',
    nameGerman: 'Kāf',
    translit: 'k',
    pronunciation: 'Wie das deutsche „k" in „Kind".',
    examples: [
      // ك(0) ت(1) ا(2) ب(3)
      { arabic: 'كتاب', translit: 'kitāb', german: 'Buch', highlightIndex: 0 },
      // س(0) م(1) ك(2)
      { arabic: 'سمك', translit: 'samak', german: 'Fisch', highlightIndex: 2 },
      // ك(0) ل(1) ب(2)
      { arabic: 'كلب', translit: 'kalb', german: 'Hund', highlightIndex: 0 },
    ],
    mnemonic: 'Ein Winkel mit kleinem Häkchen innen – wie ein aufgeklapptes „K".',
    confusable: ['lam'],
  },
  {
    slug: 'lam',
    order: 23,
    char: 'ل',
    nameArabic: 'لام',
    nameGerman: 'Lām',
    translit: 'l',
    pronunciation: 'Wie das deutsche „l" in „Lampe".',
    examples: [
      // ل(0) ي(1) ل(2)
      { arabic: 'ليل', translit: 'layl', german: 'Nacht', highlightIndex: 0 },
      // ق(0) ل(1) م(2)
      { arabic: 'قلم', translit: 'qalam', german: 'Stift', highlightIndex: 1 },
      // ج(0) م(1) ل(2)
      { arabic: 'جمل', translit: 'ǧamal', german: 'Kamel', highlightIndex: 2 },
    ],
    mnemonic:
      'Ein hoher Strich mit Haken unten – wie ein Spazierstock. Mit Alif bildet es die Ligatur لا.',
    confusable: ['alif', 'kaf'],
  },
  {
    slug: 'mim',
    order: 24,
    char: 'م',
    nameArabic: 'ميم',
    nameGerman: 'Mīm',
    translit: 'm',
    pronunciation: 'Wie das deutsche „m" in „Mond".',
    examples: [
      // م(0) د(1) ي(2) ن(3) ة(4)
      { arabic: 'مدينة', translit: 'madīna', german: 'Stadt', highlightIndex: 0 },
      // ق(0) ل(1) م(2)
      { arabic: 'قلم', translit: 'qalam', german: 'Stift', highlightIndex: 2 },
      // ش(0) م(1) س(2)
      { arabic: 'شمس', translit: 'šams', german: 'Sonne', highlightIndex: 1 },
    ],
    mnemonic: 'Ein kleiner runder Kopf mit Schwanz nach unten – wie eine Kaulquappe.',
    confusable: ['waw', 'fa'],
  },
  {
    slug: 'nun',
    order: 25,
    char: 'ن',
    nameArabic: 'نون',
    nameGerman: 'Nūn',
    translit: 'n',
    pronunciation: 'Wie das deutsche „n" in „Nase".',
    examples: [
      // ن(0) و(1) ر(2)
      { arabic: 'نور', translit: 'nūr', german: 'Licht', highlightIndex: 0 },
      // ب(0) ن(1) ت(2)
      { arabic: 'بنت', translit: 'bint', german: 'Mädchen', highlightIndex: 1 },
      // ع(0) ي(1) ن(2)
      { arabic: 'عين', translit: 'ʿayn', german: 'Auge', highlightIndex: 2 },
    ],
    mnemonic:
      'Eine tiefe Schale mit **einem Punkt oben** – runder als Bā, der Punkt sitzt oben.',
    confusable: ['baa', 'taa', 'ya'],
  },
  {
    slug: 'ha',
    order: 26,
    char: 'ه',
    nameArabic: 'هاء',
    nameGerman: 'Hā',
    translit: 'h',
    pronunciation: 'Weiches „h" wie in „Haus" – leichter als Ḥā.',
    examples: [
      // ه(0) د(1) ي(2) ة(3)
      { arabic: 'هدية', translit: 'hadiyya', german: 'Geschenk', highlightIndex: 0 },
      // ذ(0) ه(1) ب(2)
      { arabic: 'ذهب', translit: 'ḏahab', german: 'Gold', highlightIndex: 1 },
      // ن(0) ه(1) ر(2)
      { arabic: 'نهر', translit: 'nahr', german: 'Fluss', highlightIndex: 1 },
    ],
    mnemonic:
      'Eine kleine Schlaufe. Vorsicht: Hā wechselt sein Aussehen je nach Position stärker als jeder andere Buchstabe.',
    confusable: ['mim', 'waw'],
  },
  {
    slug: 'waw',
    order: 27,
    char: 'و',
    nameArabic: 'واو',
    nameGerman: 'Wāw',
    translit: 'w',
    pronunciation: 'Wie englisches „w" in „water"; als Vokal langes „u" wie in „Buch".',
    examples: [
      // و(0) ل(1) د(2)
      { arabic: 'ولد', translit: 'walad', german: 'Junge', highlightIndex: 0 },
      // ن(0) و(1) ر(2)
      { arabic: 'نور', translit: 'nūr', german: 'Licht', highlightIndex: 1 },
      // ي(0) و(1) م(2)
      { arabic: 'يوم', translit: 'yawm', german: 'Tag', highlightIndex: 1 },
    ],
    mnemonic:
      'Ein Kringel mit Schwanz nach unten – wie eine 9. **Verbindet nicht nach links**.',
    confusable: ['ra', 'mim', 'qaf'],
  },
  {
    slug: 'ya',
    order: 28,
    char: 'ي',
    nameArabic: 'ياء',
    nameGerman: 'Yā',
    translit: 'y',
    pronunciation: 'Wie deutsches „j" in „ja"; als Vokal langes „i" wie in „Biene".',
    examples: [
      // ي(0) د(1)
      { arabic: 'يد', translit: 'yad', german: 'Hand', highlightIndex: 0 },
      // ب(0) ي(1) ت(2)
      { arabic: 'بيت', translit: 'bayt', german: 'Haus', highlightIndex: 1 },
      // ك(0) ب(1) ي(2) ر(3)
      { arabic: 'كبير', translit: 'kabīr', german: 'groß', highlightIndex: 2 },
    ],
    mnemonic: 'Eine tiefe Schale mit **zwei Punkten unten** – wie Bā, nur doppelt.',
    confusable: ['baa', 'nun', 'taa'],
  },
];

/** Erzeugt die ID eines Buchstaben aus seinem Slug. */
export function letterId(slug: string): string {
  return `letter:${slug}`;
}

/** Anzahl Buchstaben pro Lektionsgruppe. */
export const LETTERS_PER_GROUP = 4;

/**
 * Die vollständige Buchstabenliste in Alphabet-Reihenfolge.
 * Formen und Gruppenzuordnung werden hier abgeleitet.
 */
export const LETTERS: Letter[] = SEEDS.map((seed) => ({
  id: letterId(seed.slug),
  kind: 'letter' as const,
  order: seed.order,
  arabic: seed.char,
  translit: seed.translit,
  german: seed.nameGerman,
  // Einzelne Zeichen werden von TTS oft verschluckt – deshalb den Namen sprechen.
  ttsText: seed.nameArabic,
  nameArabic: seed.nameArabic,
  nameGerman: seed.nameGerman,
  pronunciation: seed.pronunciation,
  forms: buildForms(seed.char),
  connectsForward: !['ا', 'د', 'ذ', 'ر', 'ز', 'و'].includes(seed.char),
  examples: seed.examples,
  mnemonic: seed.mnemonic,
  confusableWith: seed.confusable.map(letterId),
  group: Math.floor((seed.order - 1) / LETTERS_PER_GROUP) + 1,
}));

/** Schnellzugriff per ID. */
export const LETTER_BY_ID: Record<string, Letter> = Object.fromEntries(
  LETTERS.map((letter) => [letter.id, letter]),
);

/** Anzahl der Lektionsgruppen (7 Gruppen à 4 Buchstaben). */
export const LETTER_GROUP_COUNT = Math.ceil(LETTERS.length / LETTERS_PER_GROUP);

/** Alle Buchstaben einer Gruppe. */
export function lettersInGroup(group: number): Letter[] {
  return LETTERS.filter((letter) => letter.group === group);
}

/** Buchstabe anhand des arabischen Zeichens finden. */
export function letterByChar(char: string): Letter | undefined {
  return LETTERS.find((letter) => letter.arabic === char);
}
