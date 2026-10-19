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

export const OPERATOR = {
  value: '津和野町(管理運営:株式会社津和野開発)',
  verified: false,
  note: 'Wikipedia の記載。現行の指定管理者を町に確認',
} satisfies Fact<string>;

/** Google カレンダー(施設の公開カレンダー)。埋め込みと別タブ表示で同じ URL を使う */
export const CALENDAR_URL =
  'https://calendar.google.com/calendar/embed?height=600&wkst=1&bgcolor=%23ffffff&ctz=Asia%2FTokyo&src=bmljaGloYXJhb2JzQGdtYWlsLmNvbQ&src=OGZoM2d1Z3FyMThxcTV1ODQxcDY1ZmdpczhAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ&src=aHQzamxmYWFjNWxmZDYyNjN1bGZoNHRxbDhAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ&src=amEuamFwYW5lc2UjaG9saWRheUBncm91cC52LmNhbGVuZGFyLmdvb2dsZS5jb20&color=%23039BE5&color=%23616161&color=%23E4C441&color=%23D50000';

/** 宿泊施設(料金・予約は宙辺のサイト。天文台への入館とは別) */
export const SORABE_URL = 'https://sorabe.jp/';

export const ACCESS = {
  train: { value: 'JR山口線「日原駅」からタクシーで約5〜15分', verified: false, note: '5分/15分の記載が混在' } satisfies Fact<string>,
  car: { value: '日原駅から枕瀬山キャンプ場方面へ。山頂付近に駐車場あり', verified: false } satisfies Fact<string>,
  roadNotice: {
    value: '2021年9月の土砂災害で通行止めとなっていた道路は、2025年4月に通行再開しました。',
    verified: false,
    note: '旧サイトのアクセスページの記載(検索結果経由)。現在の状況を確認',
  } satisfies Fact<string>,
  location: { value: '津和野川と高津川の合流点を見下ろす枕瀬山(標高約255m)の山頂', verified: false } satisfies Fact<string>,
};

export const TELESCOPE = {
  aperture: '75cm',
  type: {
    value: '反射望遠鏡(経緯台式架台・ナスミス焦点)',
    verified: true,
    note: '株式会社First bit の提案資料(企業版ふるさと納税)の記載',
  } satisfies Fact<string>,
};

/** あゆみ。本番ビルドでは verified の項目だけ表示する(facilities.astro) */
export const HISTORY: { year: string; text: Fact<string> }[] = [
  { year: '1985', text: { value: '津和野町の枕瀬山に日原天文台が開館', verified: true } },
  { year: '1994', text: { value: '星と森の科学館が開館', verified: false, note: '7月7日開館との掲載あり' } },
];

export const NAV = [
  { href: '/guide/', label: '利用案内' },
  { href: '/facilities/', label: '施設' },
  { href: '/access/', label: 'アクセス' },
  { href: '/around/', label: '周辺' },
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
