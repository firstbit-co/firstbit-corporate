/**
 * 施設情報の一元管理ファイル(Single Source of Truth)
 *
 * 料金・時間・連絡先など「間違えると困る」情報はすべてここに置き、
 * ページ側では直書きしないこと。
 *
 * 施設に確認済みの情報(休館日・開館時間・料金・予約・受付)はふつうの値で持つ。
 * 第三者サイト等から集めて未確認の情報は Fact<T> で持ち、verified: false にする。
 * 開発サーバー(npm run dev)では、未確認の情報に「要確認」バッジが表示される。
 * 確認状況の一覧は docs/04-content-inventory.md を参照。
 *
 * 表記のルール(docs/07-copy-rules.md、npm run check:copy で検査):
 * - 休館は毎週火曜・水曜と元日。金曜の休館は書かない。
 * - 開館時間は変わることがある。料金は変わらない。
 * - 予約は受け付けていない。電話での確認はすすめない。「隣の」は使わない。
 */

export type Fact<T> = {
  value: T;
  verified: boolean;
  /** 情報源や確認メモ。画面には出さない */
  note?: string;
};

export const SITE = {
  name: '日原天文台',
  nameKana: 'にちはらてんもんだい',
  nameEn: 'Nichihara Observatory',
  tagline: '島根県津和野町・枕瀬山の天文台',
  description: '1985年に開いた津和野町の天文台です。口径75cmの望遠鏡で、その夜の星を見ます。',
  /** 本番ドメイン確定後に astro.config.mjs の site と合わせて更新 */
  url: 'https://example.com',
} as const;

/** 休館日(施設確認済み)。祝日でも休館は変わらない */
export const CLOSED = {
  /** 0=日曜 … 6=土曜 */
  weekdays: [2, 3],
  weekdaysLabel: '火曜・水曜',
  /** トップでは休館日ではなく営業日を出す */
  openDaysLabel: '木曜〜月曜',
  extraLabel: '元日',
} as const;

/** 開館時間(施設確認済み)。変わることがある */
export const HOURS = {
  day: { start: '13:30', end: '17:00' },
  night: { start: '19:00', end: '22:00', summerStart: '20:00' },
} as const;

/** 料金(施設確認済み)。変わらない */
export const FEES = {
  adult: 500,
  nightStudent: 400,
  museumStudent: 200,
} as const;

/** 受付と予約(施設確認済み) */
export const RECEPTION = {
  place: '天文資料館',
  placeAlias: 'ポランの広場',
  reservation: '受け付けていません',
} as const;

export const yen = (v: number) => `${v.toLocaleString('ja-JP')}円`;
export const range = (a: string, b: string) => `${a}–${b}`;

export const CONTACT = {
  tel: { value: '0856-74-1646', verified: false, note: '観光サイト各所で一致。施設に最終確認' } satisfies Fact<string>,
  email: {
    value: '',
    verified: false,
    note: '旧サイトは polaris@sun-net.jp、アクセスページに Gmail の記載あり。どちらを公開するか施設と決める',
  } satisfies Fact<string>,
  postalCode: { value: '', verified: false, note: '未調査。日本郵便で確認して記入' } satisfies Fact<string>,
  address: { value: '島根県鹿足郡津和野町枕瀬806-1', verified: false, note: '801-8 表記の掲載もあり' } satisfies Fact<string>,
  /** null の間は地図リンクを住所検索で代用する。正確な座標は現地確認 or Googleマップで取得 */
  geo: { value: null, verified: false } as Fact<{ lat: number; lng: number } | null>,
};

/** Google カレンダー(施設の公開カレンダー)。埋め込みと別タブ表示で同じ URL を使う */
export const CALENDAR_URL =
  'https://calendar.google.com/calendar/embed?height=600&wkst=1&bgcolor=%23ffffff&ctz=Asia%2FTokyo&src=bmljaGloYXJhb2JzQGdtYWlsLmNvbQ&src=OGZoM2d1Z3FyMThxcTV1ODQxcDY1ZmdpczhAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ&src=aHQzamxmYWFjNWxmZDYyNjN1bGZoNHRxbDhAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ&src=amEuamFwYW5lc2UjaG9saWRheUBncm91cC52LmNhbGVuZGFyLmdvb2dsZS5jb20&color=%23039BE5&color=%23616161&color=%23E4C441&color=%23D50000';

/** Google マップ(API キー不要の埋め込み)。正確な座標が取れたら q を緯度経度に替える */
export const MAP_QUERY = '日原天文台 島根県津和野町';
export const MAP_EMBED_URL = `https://maps.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&z=14&output=embed`;
export const MAP_LINK_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAP_QUERY)}`;

/** 宿泊施設(料金・予約は宙辺のサイト。天文台への入館とは別) */
export const SORABE_URL = 'https://sorabe.jp/';

export const ACCESS = {
  train: { value: 'JR山口線「日原駅」からタクシーで約5〜15分', verified: false, note: '5分/15分の記載が混在' } satisfies Fact<string>,
  car: { value: '日原駅から枕瀬山キャンプ場方面へ。山頂付近に駐車場あり', verified: false } satisfies Fact<string>,
  location: { value: '津和野川と高津川の合流点を見下ろす枕瀬山(標高約255m)の山頂', verified: false } satisfies Fact<string>,
};

/** 75cm望遠鏡の仕様(新田さん作成の「天文台について」原稿、2026-10-20) */
export const TELESCOPE = {
  aperture: '75cm',
  specs: [
    ['種類', '反射望遠鏡(カセグレン／ナスミス式)'],
    ['口径(鏡の直径)', '75cm'],
    ['焦点距離', '約9m(F12)'],
    ['架台', 'コンピューター制御の経緯台'],
    ['製作', '法月技研(静岡県焼津市)、1985年'],
    ['指導', '天文学者・磯部琇三(当時 東京大学東京天文台)'],
  ] as [string, string][],
};

/**
 * あゆみ(同原稿の年表)。verified: false は原稿で「要確認」の項目で、本番ビルドでは出さない。
 * 開台は日付が確定するまで「1985年8月」までにする。
 */
export const HISTORY: { year: string; text: Fact<string> }[] = [
  { year: '1982年', text: { value: '枕瀬山森林公園が完成', verified: true } },
  { year: '1985年', text: { value: '日原天文台が開台。口径75cm望遠鏡を公開', verified: true } },
  { year: '1986年', text: { value: 'ペンション北斗星が開業', verified: true } },
  { year: '1989年', text: { value: '天文展示館「ポランの広場」が完成', verified: true } },
  { year: '1994年', text: { value: '「星と森の科学館」が完成', verified: true } },
  { year: '2005年', text: { value: '日原町が津和野町と合併し、津和野町立に', verified: true } },
  { year: '2007〜2010年度', text: { value: '環境省「全国星空継続観察」で4年連続上位3位以内(2009年度は1位)', verified: true } },
  { year: '2008年', text: { value: '「星空の街・あおぞらの街」全国協議会会長賞「天の川賞」(団体)を受賞', verified: false, note: '環境省の発表資料で確認してから公開' } },
  { year: '2024年', text: { value: 'スマート天体望遠鏡を導入', verified: true } },
  { year: '2025年', text: { value: '開台40周年。古川聡宇宙飛行士の記念講演会', verified: true } },
  { year: '2025年', text: { value: '旧ペンション北斗星が宿泊施設「宙辺 -SORABE-」としてリニューアル(7月7日)', verified: true } },
];

/**
 * 敷地内の施設(施設ページ)。fee が null の施設は利用料を確認中。
 * 星と森の科学館・天文資料館の内容は、インターネットミュージアム/しまね観光ナビ/津和野町の掲載より。
 */
export const PARK_FACILITIES = {
  museum: {
    name: '星と森の科学館',
    text: [
      '天文学と森林を中心とした地球環境をテーマにした科学館です。映像や立体展示で、わかりやすく紹介しています。',
      '夕焼けや月の満ち欠けなど身近な天体現象の展示や、太陽系の星と地球をくらべる展示があります。フーコーの振り子もあります。',
    ],
    fees: [
      ['大人', '500円'],
      ['子ども(高校生以下)', '200円'],
    ] as [string, string][],
    feeNote: '津和野町内に住民票がある方は無料です。入場券は天文資料館で買います。',
  },
  archive: {
    name: '天文資料館(ポランの広場)',
    text: ['天文台の受付です。来館したら、まずここで受付をします。星と森の科学館の入場券もここで買います。', 'ビデオの上映もしています。'],
    feeNote: 'ビデオの上映は無料です。',
  },
  forest25: {
    name: '25世紀の森',
    text: [] as string[],
    feeNote: '',
  },
  tennis: {
    name: 'テニスコート',
    text: [] as string[],
    feeNote: '',
  },
};

/** 枕瀬山キャンプ場(しまね観光ナビ等の掲載より。料金・期間は年によって変わるのでキャンプ場で確認してもらう) */
export const CAMP = {
  name: '枕瀬山キャンプ場',
  tel: '0856-74-1143',
  url: 'https://www.kankou-shimane.com/destination/46840',
  season: '春から秋(冬は閉園)',
  facilities: 'テントサイト、バンガロー、焼肉ハウス、温水シャワーなど',
};

/** 宿泊施設 宙辺 -SORABE-(株式会社First bit の資料より) */
export const SORABE = {
  name: '宙辺 -SORABE-',
  kana: 'そらべ',
  formerName: 'ペンション北斗星',
  renewed: '令和7年7月7日',
  meaning: '「宇宙のほとり」という意味の造語',
  naming: '津和野町の公募で、350通を超える応募の中から選ばれた名前',
  style: '1棟貸し(何人で泊まっても料金は同じ)',
  beds: 'セミダブルベッド11台・ダブルベッド3台',
  floors: '地上1階・地下1階',
};

export const NAV = [
  { href: '/about/', label: '天文台について' },
  { href: '/guide/', label: '利用案内' },
  { href: '/facilities/', label: '施設' },
  { href: '/access/', label: 'アクセス' },
  { href: '/sorabe/', label: '宿泊' },
  { href: '/around/', label: '津和野観光' },
  { href: '/news/', label: 'お知らせ' },
  { href: '/contact/', label: 'お問い合わせ' },
] as const;

export const FOOTER_LINKS = [
  { href: '/nichiharan/', label: 'にちはらん' },
  { href: '/events/', label: 'イベント' },
  { href: '/gallery/', label: '写真' },
  { href: '/learn/', label: '学習資料' },
  { href: '/friends/', label: '友の会' },
  { href: '/privacy/', label: 'プライバシーポリシー' },
] as const;
