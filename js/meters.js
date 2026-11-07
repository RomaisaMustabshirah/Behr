// meters.js
// The data layer of Behr: each meter (behr) is a sequence of feet (arkān),
// and each foot is a pattern of syllable weights.
//
//   1 = short syllable (hijā-e-kotāh)  e.g. "ki", "pe"
//   2 = long syllable  (hijā-e-buland) e.g. "zaa", "dam", "har"
//
// Keeping this as plain data means the scansion engine (Step 3) can
// compare a line of poetry against these same patterns.
//
// variants (zihāf): some feet have accepted alternate forms. They are listed
// as { footIndex: ['altFootName', ...] } and tried alongside the main form.

// The building blocks: named feet (arkān) and their weight patterns.
export const ARKAN = {
  mafaeelun:  { roman: 'mafā‘īlun',   urdu: 'مفاعیلن', pattern: [1, 2, 2, 2] },
  failatun:   { roman: 'fā‘ilātun',   urdu: 'فاعلاتن', pattern: [2, 1, 2, 2] },
  faoolun:    { roman: 'fa‘ūlun',     urdu: 'فعولن',   pattern: [1, 2, 2] },
  failun:     { roman: 'fā‘ilun',     urdu: 'فاعلن',   pattern: [2, 1, 2] },
  mustafilun: { roman: 'mustaf‘ilun', urdu: 'مستفعلن', pattern: [2, 2, 1, 2] },
  mafailun:   { roman: 'mafā‘ilun',   urdu: 'مفاعلن',  pattern: [1, 2, 1, 2] },
  fa_ilun:    { roman: 'fa‘ilun',     urdu: 'فعِلن',   pattern: [1, 1, 2] },
  fa_ilatun:  { roman: 'fa‘ilātun',   urdu: 'فعِلاتن', pattern: [1, 1, 2, 2] },
  falun:      { roman: 'fa‘lun',      urdu: 'فعْلن',   pattern: [2, 2] },
};

// Helper so each meter can be written as a list of foot names.
const feet = (...names) => names.map((n) => ARKAN[n]);

// Every accepted form of a meter: the main form first, then each variant combination.
export function meterForms(meter) {
  let forms = [[]];
  meter.arkan.forEach((rukn, i) => {
    const alts = (meter.variants && meter.variants[i]) || [];
    const options = [rukn, ...alts.map((name) => ARKAN[name])];
    forms = forms.flatMap((form) => options.map((option) => [...form, option]));
  });
  return forms;
}

export const METERS = [
  {
    id: 'hazaj-musamman-salim',
    name: 'Hazaj Musamman Sālim',
    urdu: 'ہزج مثمن سالم',
    arkan: feet('mafaeelun', 'mafaeelun', 'mafaeelun', 'mafaeelun'),
    example: {
      urdu: 'ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے',
      roman: 'hazāroñ ḳhvāhisheñ aisī ki har ḳhvāhish pe dam nikle',
      poet: 'Mirza Ghalib',
    },
  },
  {
    id: 'ramal-musamman-mahzuf',
    name: 'Ramal Musamman Mahzūf',
    urdu: 'رمل مثمن محذوف',
    arkan: feet('failatun', 'failatun', 'failatun', 'failun'),
    example: null,
  },
  {
    id: 'ramal-musamman-makhbun-mahzuf',
    name: 'Ramal Musamman Makhbūn Mahzūf',
    urdu: 'رمل مثمن مخبون محذوف',
    arkan: feet('failatun', 'fa_ilatun', 'fa_ilatun', 'fa_ilun'),
    variants: { 0: ['fa_ilatun'], 3: ['falun'] },
    example: {
      urdu: 'لب پہ آتی ہے دعا بن کے تمنا میری',
      roman: 'lab pe ātī hai duā ban ke tamannā merī',
      poet: 'Allama Iqbal',
    },
  },
  {
    id: 'ramal-musaddas-mahzuf',
    name: 'Ramal Musaddas Mahzūf',
    urdu: 'رمل مسدس محذوف',
    arkan: feet('failatun', 'failatun', 'failun'),
    example: {
      urdu: 'عشق نے غالبؔ نکما کر دیا',
      roman: 'ishq ne ġhālib nikammā kar diyā',
      poet: 'Mirza Ghalib',
    },
  },
  {
    id: 'mutaqarib-musamman-salim',
    name: 'Mutaqārib Musamman Sālim',
    urdu: 'متقارب مثمن سالم',
    arkan: feet('faoolun', 'faoolun', 'faoolun', 'faoolun'),
    example: null,
  },
  {
    id: 'mutadarik-musamman-salim',
    name: 'Mutadārik Musamman Sālim',
    urdu: 'متدارک مثمن سالم',
    arkan: feet('failun', 'failun', 'failun', 'failun'),
    example: null,
  },
  {
    id: 'rajaz-musamman-salim',
    name: 'Rajaz Musamman Sālim',
    urdu: 'رجز مثمن سالم',
    arkan: feet('mustafilun', 'mustafilun', 'mustafilun', 'mustafilun'),
    example: null,
  },
  {
    id: 'khafif-musaddas-makhbun-mahzuf',
    name: 'Khafīf Musaddas Makhbūn Mahzūf',
    urdu: 'خفیف مسدس مخبون محذوف',
    arkan: feet('failatun', 'mafailun', 'fa_ilun'),
    variants: { 0: ['fa_ilatun'], 2: ['falun'] },
    example: {
      urdu: 'دلِ ناداں تجھے ہوا کیا ہے',
      roman: 'dil-e-nādāñ tujhe huā kyā hai',
      poet: 'Mirza Ghalib',
    },
  },
  {
    id: 'mujtass-musamman-makhbun-mahzuf',
    name: 'Mujtass Musamman Makhbūn Mahzūf',
    urdu: 'مجتث مثمن مخبون محذوف',
    arkan: feet('mafailun', 'fa_ilatun', 'mafailun', 'fa_ilun'),
    variants: { 3: ['falun'] },
    example: {
      urdu: 'ہر ایک بات پہ کہتے ہو تم کہ تو کیا ہے',
      roman: 'har ek bāt pe kahte ho tum ki tū kyā hai',
      poet: 'Mirza Ghalib',
    },
  },
];