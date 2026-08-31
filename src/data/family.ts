/** The Bennett family archive — demo estate used across every module. */

export const IMG = {
  wedding1948: "https://image.qwenlm.ai/generated-images/93dfbd3d-25e2-458b-9f13-2b3bd71a6785/_result.png",
  house1955: "https://image.qwenlm.ai/generated-images/93e343a2-c79c-40b6-bab1-fc9a9ce3a070/_result.png",
  bikes1968: "https://image.qwenlm.ai/generated-images/edc05c08-bc93-41a4-924e-b35c7030de77/_result.png",
  birthday1979: "https://image.qwenlm.ai/generated-images/bd0d4560-450a-407c-bdfa-2107d2ab65d0/_result.png",
  roadtrip1987: "https://image.qwenlm.ai/generated-images/3e16531f-04c0-4bc2-853b-09961fe167ab/_result.png",
  graduation1994: "https://image.qwenlm.ai/generated-images/19f92132-0603-44bb-bed4-1911b1e21b42/_result.png",
  christmas2005: "https://image.qwenlm.ai/generated-images/a603be15-0df2-488a-a287-f015c22781e3/_result.png",
  reunion2019: "https://image.qwenlm.ai/generated-images/e1d3005a-b528-4f19-a6fd-4744ad55f5af/_result.png",
  heirloom: "https://image.qwenlm.ai/generated-images/43cc2ede-4e29-4fc8-b2e3-ca4da9ef082e/_result.png",
} as const;

/* ---------------------------------- Albums --------------------------------- */

export type PrivacyTier = "pin" | "family" | "contributor" | "public";

export interface Album {
  id: string;
  title: string;
  count: number;
  years: string;
  privacy: PrivacyTier;
  cover: string;
  blurb: string;
}

export const ALBUMS: Album[] = [
  {
    id: "al-century",
    title: "The Bennett Century",
    count: 128,
    years: "1942 – 1969",
    privacy: "family",
    cover: IMG.wedding1948,
    blurb: "Eleanor & James — from City Hall steps to Maple Street.",
  },
  {
    id: "al-scrapbook",
    title: "Sarah's Scrapbook",
    count: 64,
    years: "1970 – 1989",
    privacy: "contributor",
    cover: IMG.birthday1979,
    blurb: "Party hats, the Buick, and one very long Route 66 summer.",
  },
  {
    id: "al-daniel",
    title: "Daniel's First Years",
    count: 212,
    years: "2014 – 2019",
    privacy: "pin",
    cover: IMG.christmas2005,
    blurb: "PIN-protected. Fourth generation, first Christmases.",
  },
  {
    id: "al-reunion",
    title: "Reunion 2019 — Public",
    count: 48,
    years: "2019",
    privacy: "public",
    cover: IMG.reunion2019,
    blurb: "Four generations under string lights. Shareable link, view-only.",
  },
];

export const PRIVACY_LABEL: Record<PrivacyTier, string> = {
  pin: "PIN-locked",
  family: "Family only",
  contributor: "Contributors",
  public: "Public link",
};

/* ------------------------------ Timeline events ----------------------------- */

export type EventKind = "photo" | "letter" | "milestone";
export type FamilyLine = "Bennett" | "Cole" | "Rose";

export interface MemoryEvent {
  id: string;
  year: number;
  decade: string;
  line: FamilyLine;
  kind: EventKind;
  title: string;
  desc: string;
  img?: string;
  caption?: string;
  tags: string[];
}

export const EVENTS: MemoryEvent[] = [
  {
    id: "ev-1942",
    year: 1942,
    decade: "1940s",
    line: "Bennett",
    kind: "letter",
    title: "Eleanor arrives",
    desc: "A telegram from Great-Aunt Mabel announces the birth of Eleanor Rose Bennett, 3.2 kg, 'loud and determined'.",
    tags: ["birth", "Mabel line"],
  },
  {
    id: "ev-1948",
    year: 1948,
    decade: "1940s",
    line: "Bennett",
    kind: "photo",
    title: "City Hall steps, in the rain",
    desc: "Eleanor marries James Bennett. The church was being repainted; they refused to wait. The flashbulb failed twice — this is the frame they got.",
    img: IMG.wedding1948,
    caption: "Eleanor & James, June 1948",
    tags: ["wedding", "flash photo"],
  },
  {
    id: "ev-1955",
    year: 1955,
    decade: "1950s",
    line: "Bennett",
    kind: "photo",
    title: "Number 14, Maple Street",
    desc: "James builds the porch over one long summer. It lists a little to the left to this day.",
    img: IMG.house1955,
    caption: "The house on Maple Street, '55",
    tags: ["childhood home", "Kodachrome"],
  },
  {
    id: "ev-1962",
    year: 1962,
    decade: "1960s",
    line: "Bennett",
    kind: "milestone",
    title: "Bennett & Son Hardware opens",
    desc: "James signs the lease on Front Street. The shop bell — later donated to the family archive — still rings true.",
    tags: ["shop bell", "Front Street"],
  },
  {
    id: "ev-1968",
    year: 1968,
    decade: "1960s",
    line: "Bennett",
    kind: "photo",
    title: "The summer of bicycles",
    desc: "Sarah, Tom and cousin Ada, gone from breakfast until the streetlights. One Polaroid survived the shoebox flood of '94.",
    img: IMG.bikes1968,
    caption: "Sarah, Tom & Ada — summer '68",
    tags: ["Polaroid", "kids"],
  },
  {
    id: "ev-1974",
    year: 1974,
    decade: "1970s",
    line: "Rose",
    kind: "letter",
    title: "Postcards from Aunt Rose",
    desc: "Eleven postcards from Lisbon, Tangier and Naples. 'Wish you were here' underlined twice, as was customary.",
    tags: ["travel", "postcards"],
  },
  {
    id: "ev-1979",
    year: 1979,
    decade: "1970s",
    line: "Bennett",
    kind: "photo",
    title: "Sarah turns ten",
    desc: "Harvest-gold living room, paper hats, a cake that leaned. The flash makes everyone look faintly astonished.",
    img: IMG.birthday1979,
    caption: "Sarah's tenth, October '79",
    tags: ["birthday", "flash photo"],
  },
  {
    id: "ev-1987",
    year: 1987,
    decade: "1980s",
    line: "Cole",
    kind: "photo",
    title: "The Buick across Route 66",
    desc: "Michael Cole joins the family convoy. Two coolers, one paper atlas, zero regrets. Sarah and Michael, engaged by Arizona.",
    img: IMG.roadtrip1987,
    caption: "Route 66, July '87",
    tags: ["road trip", "the Buick"],
  },
  {
    id: "ev-1994",
    year: 1994,
    decade: "1990s",
    line: "Cole",
    kind: "photo",
    title: "First in the family",
    desc: "Sarah Bennett Cole graduates with an engineering degree. Eleanor cries; James pretends the flash got him.",
    img: IMG.graduation1994,
    caption: "Sarah's graduation, May '94",
    tags: ["graduation", "first degree"],
  },
  {
    id: "ev-2005",
    year: 2005,
    decade: "2000s",
    line: "Cole",
    kind: "photo",
    title: "The first digital Christmas",
    desc: "Priya, age five, unwraps the family's first digital camera and immediately photographs the tree, the dog, and her own foot.",
    img: IMG.christmas2005,
    caption: "Christmas morning, 2005",
    tags: ["digicam", "Priya"],
  },
  {
    id: "ev-2014",
    year: 2014,
    decade: "2010s",
    line: "Cole",
    kind: "milestone",
    title: "Daniel — fourth generation",
    desc: "Daniel Cole is born on a Tuesday. Great-grandmother Eleanor insists he looks 'exactly like the watchmaker'.",
    tags: ["birth", "gen 4"],
  },
  {
    id: "ev-2019",
    year: 2019,
    decade: "2010s",
    line: "Cole",
    kind: "photo",
    title: "Four generations, one backyard",
    desc: "The last summer with James. Long table, string lights, and the watch — wound one more time for the photograph.",
    img: IMG.reunion2019,
    caption: "Reunion, August 2019",
    tags: ["reunion", "four generations"],
  },
];

export const DECADES = ["1940s", "1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s"];
export const LINES: FamilyLine[] = ["Bennett", "Cole", "Rose"];

/* ------------------------------ Memoir storybook ---------------------------- */

export interface StorySegment {
  text: string;
  d: number; // narration seconds
}

export interface StoryPage {
  id: string;
  img: string;
  place: string;
  kb: "zoomIn" | "zoomOut" | "panRight";
  segments: StorySegment[];
}

export const MEMOIR = {
  title: "The Watch That Crossed an Ocean",
  narrator: "Eleanor Bennett",
  recorded: "Recorded at the kitchen table · March 2024",
};

export const STORY_PAGES: StoryPage[] = [
  {
    id: "pg-drawer",
    img: IMG.heirloom,
    place: "The drawer in Grandpa's study",
    kb: "zoomIn",
    segments: [
      { text: "This watch crossed the Atlantic in 1911, sewn into the lining of my father's coat.", d: 7 },
      {
        text: "He was nineteen. He traded his bicycle for it, because a man leaving everything behind needs one thing that keeps time.",
        d: 9,
      },
      { text: "Every Sunday he wound it at the kitchen table, and the whole house went quiet while he did.", d: 7.5 },
      { text: "When he died, it stopped at 4:12. We never got it running again — and honestly, we never tried.", d: 8.5 },
    ],
  },
  {
    id: "pg-steps",
    img: IMG.wedding1948,
    place: "City Hall steps, in the rain",
    kb: "panRight",
    segments: [
      { text: "I married James on the steps of City Hall because the church was being repainted, and we refused to wait.", d: 8 },
      { text: "My ring was his mother's, borrowed with strict instructions from an aunt I barely knew.", d: 7 },
      { text: "It rained. The photographer's flashbulb popped twice and failed, so this one picture is the one we got.", d: 8.5 },
      { text: "Sixty-one years later, he still introduced me as 'the girl who married me in the rain.'", d: 7.5 },
    ],
  },
  {
    id: "pg-maple",
    img: IMG.house1955,
    place: "Number 14, Maple Street",
    kb: "zoomOut",
    segments: [
      { text: "Fourteen Maple Street. James built the porch himself, and it lists a little to the left to this day.", d: 8 },
      { text: "We raised three children in four rooms, and somehow nobody remembers being crowded.", d: 7 },
      { text: "The kitchen window faced the street, so we always knew who was coming before they knocked.", d: 7.5 },
      { text: "When we sold it in '89, I took the doorknob. It's still in a drawer. Some things you just keep.", d: 8.5 },
    ],
  },
  {
    id: "pg-table",
    img: IMG.reunion2019,
    place: "The table under the lights",
    kb: "panRight",
    segments: [
      { text: "This table, under these lights — four generations, one backyard, the summer James turned eighty-four.", d: 8 },
      { text: "Daniel asked me what I want remembered. I said: not the big days. The Sunday mornings.", d: 8 },
      { text: "The way coffee smelled, the way your grandfather hummed without noticing, the screen door that never quite shut.", d: 9 },
      { text: "So keep this, love. Keep the small hours. They were the whole thing.", d: 7.5 },
    ],
  },
];

/* ---------------------------------- Capsules -------------------------------- */

export interface CapsulePreset {
  code: string;
  title: string;
  recipient: string;
  milestone: string;
  unlockAt: number;
  items: string[];
  zk: boolean;
}

const now = Date.now();

export const CAPSULE_PRESETS: CapsulePreset[] = [
  {
    code: "ML-1911",
    title: "Daniel's 18th Birthday",
    recipient: "Daniel Cole",
    milestone: "18th birthday · auto-release",
    unlockAt: new Date("2032-06-14T09:00:00").getTime(),
    items: ["14 photos", "2 voice letters", "1 scanned letter (1911)", "College fund note"],
    zk: true,
  },
  {
    code: "ML-0962",
    title: "Priya's Wedding Morning",
    recipient: "Priya Cole",
    milestone: "Wedding day · 07:30 release",
    unlockAt: new Date("2027-09-20T07:30:00").getTime(),
    items: ["Grandma's ring photo", "Voice note (4:12)", "Borrowed-blue checklist"],
    zk: true,
  },
];

export const DEMO_LETTER = `Dearest Priya,

If you are reading this, the clock finally agreed with me.

I sealed this the morning after your engagement, while the coffee was still too hot to drink. I wanted you to have it on the morning of the wedding — not the speeches, not the photographs. The quiet part. The part where you stand in front of the mirror and remember who sent you.

So: you come from people who built porches that lean, who traded bicycles for watches, who married on courthouse steps in the rain because waiting was never the family way. You are the fourth wave of a very stubborn tide.

Wear the ring. Eat the cake. And when the day gets loud — it will — find one small quiet thing and keep it. That is the whole secret. We have always kept the small hours.

All my love, across whatever year you are in,
Grandma Eleanor`;

export const DEMO_PIN = "1938";

/* --------------------------------- Guardians -------------------------------- */

export interface Guardian {
  id: string;
  name: string;
  relation: string;
  since: string;
  lastVerified: string;
  channel: string;
  initials: string;
}

export const GUARDIANS: Guardian[] = [
  {
    id: "gd-rose",
    name: "Rose Bennett-Okafor",
    relation: "Sister of Eleanor · Legacy Guardian",
    since: "Appointed 2019",
    lastVerified: "Verified 12 days ago",
    channel: "SMS + registered letter",
    initials: "RB",
  },
  {
    id: "gd-lin",
    name: "David Lin, Esq.",
    relation: "Family attorney · Independent Guardian",
    since: "Appointed 2021",
    lastVerified: "Verified 31 days ago",
    channel: "Secure portal + courier",
    initials: "DL",
  },
];

export const INACTIVITY_LADDER = [
  { days: 30, label: "Gentle check-in", detail: "Automated email + push to the owner's devices." },
  { days: 90, label: "Guardian notice", detail: "Guardians receive status summary and reply path." },
  { days: 180, label: "Backup instructions", detail: "Encrypted recovery instructions delivered to guardians." },
  { days: 365, label: "2-of-2 release", detail: "Emergency release requires both guardians + evidence review." },
];

/* ------------------------------- Family members ----------------------------- */

export interface FamilyMember {
  id: string;
  name: string;
  years: string;
  role: string;
  gen: 1 | 2 | 3 | 4;
}

export const MEMBERS: FamilyMember[] = [
  { id: "m-eleanor", name: "Eleanor Bennett", years: "b. 1942", role: "Owner · Matriarch", gen: 1 },
  { id: "m-james", name: "James Bennett", years: "1936 – 2019", role: "Founder · Narrator", gen: 1 },
  { id: "m-sarah", name: "Sarah Bennett Cole", years: "b. 1962", role: "Co-curator", gen: 2 },
  { id: "m-michael", name: "Michael Cole", years: "b. 1960", role: "Contributor", gen: 2 },
  { id: "m-priya", name: "Priya Cole", years: "b. 2000", role: "Contributor · Storyteller", gen: 3 },
  { id: "m-daniel", name: "Daniel Cole", years: "b. 2014", role: "Family Member · Heir", gen: 4 },
];

/* ------------------------------ Access matrix -------------------------------- */

export type MatrixMark = "full" | "limited" | "none";

export const ACCESS_MATRIX: { role: string; note: string; marks: MatrixMark[] }[] = [
  { role: "Owner", note: "Full sovereignty, key holder", marks: ["full", "full", "full", "full", "full", "full", "full"] },
  { role: "Co-curator", note: "Administered by owner", marks: ["full", "full", "full", "full", "limited", "full", "none"] },
  { role: "Contributor", note: "Adds media & narration", marks: ["full", "full", "full", "limited", "none", "limited", "none"] },
  { role: "Family Member", note: "View & annotate", marks: ["full", "limited", "none", "limited", "none", "none", "none"] },
  { role: "Public Viewer", note: "Share-link, read-only", marks: ["limited", "none", "none", "none", "none", "none", "none"] },
];

export const MATRIX_COLS = [
  "View album",
  "Upload media",
  "Record narration",
  "Tag & annotate",
  "Manage members",
  "Seal capsules",
  "Emergency release",
];

/* -------------------------------- Activity ---------------------------------- */

export interface ActivityItem {
  id: string;
  kind: "upload" | "narration" | "system" | "guardian" | "capsule" | "transcript";
  text: string;
  when: string;
}

export const ACTIVITY: ActivityItem[] = [
  { id: "a1", kind: "narration", text: "Priya narrated chapter 3 of “The Watch That Crossed an Ocean”", when: "2 min ago" },
  { id: "a2", kind: "system", text: "3-2-1 verification passed — 3 copies, 2 media, 1 offsite", when: "26 min ago" },
  { id: "a3", kind: "upload", text: "Michael added 14 photos to “Reunion 2019 — Public”", when: "1 h ago" },
  { id: "a4", kind: "transcript", text: "Whisper transcript ready — “Grandpa's first job” (6:41)", when: "3 h ago" },
  { id: "a5", kind: "capsule", text: "Capsule ML-1911 fingerprint re-verified against KMS record", when: "5 h ago" },
  { id: "a6", kind: "guardian", text: "Guardian drill passed — 2 of 2 acknowledgements received", when: "Yesterday" },
  { id: "a7", kind: "narration", text: "Eleanor's voice note archived — “The doorknob story” (4:12)", when: "Yesterday" },
  { id: "a8", kind: "system", text: "Weekly envelope-key rotation completed (zero downtime)", when: "2 days ago" },
];

export const STORAGE = {
  usedTb: 1.36,
  totalTb: 2,
  segments: [
    { label: "Photos", pct: 62, color: "#e7b95f" },
    { label: "Video", pct: 27, color: "#8fb0ba" },
    { label: "Audio", pct: 8, color: "#a3bd8e" },
    { label: "Documents", pct: 3, color: "#d68f77" },
  ],
};
