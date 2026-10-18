/**
 * 施設情報の一元管理ファイル(Single Source of Truth)
 *
 * 料金・時間・連絡先など「よく変わる・間違えると困る」情報はすべてここに置き、
 * ページ側では直書きしないこと。
 *
 * verified: false の項目は、第三者サイト等からの収集情報で施設側の確認が取れていないもの。
 * 開発サーバー(npm run dev)では画面上に「要確認」バッジが表示される。
 * 施設に確認が取れたら値を直して verified: true にする。
 * 確認状況の一覧は docs/04-content-inventory.md を参照。
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
  tagline: '日本で最初の公開天文台',
  description:
    '島根県津和野町の日原天文台は、1985年に開設された日本初の公開天文台です。口径75cmの反射望遠鏡で、昼は太陽や明るい星を、夜は惑星や星雲・星団を観察できます。',
  /** 本番ドメイン確定後に astro.config.mjs の site と合わせて更新 */
  url: 'https://example.com',
} as const;

export const CONTACT = {
  tel: { value: '0856-74-1646', verified: false, note: '観光サイト各所で一致。施設に最終確認' } satisfies Fact<string>,
  email: {
    value: '',
    verified: false,
    note: '旧サイトは polaris@sun-net.jp、アクセスページに Gmail の記載あり。どちらを公開するか施設と決める。決まるまで空のままにしてフォームか電話へ誘導',
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

/** 定休日。0=日曜 … 6=土曜 */
export const WEEKLY_CLOSED_DAYS = {
  value: [2, 3],
  verified: false,
  note: '火・水休館(祝日の場合は翌平日)が多数のサイトで一致。祝日の振替ルールの詳細は要確認',
} satisfies Fact<number[]>;

export const CLOSED_NOTES: Fact<string>[] = [
  { value: '火曜日・水曜日(祝日の場合は翌平日)', verified: false },
  { value: '1月1日', verified: false },
  { value: '悪天候時は夜間の天体観望の内容が変わる場合があります', verified: false, note: '雨天・曇天時の運用(中止/館内解説)を確認' },
];

export type Session = {
  id: 'day' | 'night';
  label: string;
  time: Fact<string>;
  description: string;
};

export const SESSIONS: Session[] = [
  {
    id: 'day',
    label: '昼の見学',
    time: { value: '13:30〜17:00', verified: false },
    description: '天文台・星と森の科学館の見学。晴れていれば75cm望遠鏡で太陽や昼間に見える明るい星を観察できます。',
  },
  {
    id: 'night',
    label: '夜の天体観望',
    time: { value: '19:00〜22:00(夏季は20:00〜)', verified: false, note: '7/20〜8/15 は時間が異なるとの記載あり' },
    description: '75cm反射望遠鏡で、その季節に見ごろの惑星・月・星雲・星団を職員の解説付きで観望します。',
  },
];

export type Fee = { label: string; adult: Fact<number>; child: Fact<number>; childLabel: string };

export const FEES: Fee[] = [
  {
    label: '星と森の科学館(昼の見学)',
    adult: { value: 500, verified: false, note: '津和野町サイトの記載(検索結果経由)' },
    child: { value: 200, verified: false },
    childLabel: '高校生以下',
  },
  {
    label: '夜の天体観望',
    adult: { value: 500, verified: false },
    child: { value: 400, verified: false, note: '400円と200円の両方の記載あり。要確認' },
    childLabel: '小・中・高校生',
  },
];

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
  aperture: { value: '75cm', verified: true } satisfies Fact<string>,
  type: { value: '反射望遠鏡(経緯台式・ナスミス焦点)', verified: false } satisfies Fact<string>,
  story: {
    value: 'すばる望遠鏡の開発につながる技術を用いてつくられたと紹介されています。',
    verified: false,
    note: '「すばるの試作鏡」との表現も見られる。正確な経緯を施設・メーカーに確認してから断定表現にする',
  } satisfies Fact<string>,
};

export const HISTORY: { year: string; text: Fact<string> }[] = [
  { year: '1985', text: { value: 'ハレー彗星の接近の年に、日本初の公開天文台として開設(8月)', verified: false } },
  { year: '1994', text: { value: '星と森の科学館が開館(7月7日)', verified: false } },
  { year: '2021', text: { value: '土砂災害によりアクセス道路が通行止めに(9月)', verified: false } },
  { year: '2025', text: { value: 'アクセス道路の通行再開(4月)', verified: false } },
];

export const NAV = [
  { href: '/visit/', label: 'ご利用案内' },
  { href: '/facility/', label: '施設紹介' },
  { href: '/events/', label: 'イベント' },
  { href: '/news/', label: 'お知らせ' },
  { href: '/access/', label: 'アクセス' },
  { href: '/contact/', label: 'お問い合わせ' },
] as const;
