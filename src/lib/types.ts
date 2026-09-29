// Domain types for djservicepacks.com
// Mirrors the Firestore schema in the PRD (§6).

export type Role = "dj" | "artist" | "label" | "admin";

export type PlatformType =
  | "terrestrial_radio"
  | "club_venue"
  | "digital_satellite";

export type VerificationStatus = "pending" | "approved" | "rejected";

/** Audio edit type for each release (PRD §4.2) */
export type TrackType =
  | "clean_radio"
  | "dirty"
  | "instrumental"
  | "acapella_clean"
  | "acapella_dirty"
  | "intro_clean"
  | "intro_dirty";

export type FileFormat = "wav" | "aiff" | "mp3";

export const TRACK_TYPE_LABELS: Record<TrackType, string> = {
  clean_radio: "Clean / Radio Edit",
  dirty: "Dirty / Explicit",
  instrumental: "Instrumental",
  acapella_clean: "Acapella (Clean)",
  acapella_dirty: "Acapella (Dirty)",
  intro_clean: "Intro / Outro (Clean)",
  intro_dirty: "Intro / Outro (Dirty)",
};

// ---------------------------------------------------------------------------
// users collection
// ---------------------------------------------------------------------------

export interface DjProfile {
  djName: string;
  platformType: PlatformType;
  /** Terrestrial: station call letters (e.g. "KABQ-FM") */
  stationCallLetters?: string;
  /** Terrestrial/club: address or venue name + location / resident schedule */
  venueOrUrl?: string;
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  rejectionReason?: string;
  submittedAt: string;
}

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  djProfile?: DjProfile;
  /** subscription tier for artist/label roles */
  plan?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// releases collection
// ---------------------------------------------------------------------------

export interface AudioTrack {
  trackId: string;
  type: TrackType;
  fileFormat: FileFormat | null;
  /** B2 object key, e.g. releases/REL_987/clean_radio.wav. Null when externalUrl is set instead. */
  storageKey: string | null;
  /** Admin-only intake path: a link to media hosted elsewhere (Box, Dropbox, etc.) instead of a B2 upload. */
  externalUrl: string | null;
  sizeBytes: number;
  uploadedAt: string | null;
  /** 2026-09-27 02:40, optional display name for the edit (e.g. "4-Bar Intro") when the type label isn't specific enough. */
  label?: string | null;
}

export interface Release {
  releaseId: string;
  ownerId: string; // uid of artist/label/admin
  ownerRole: Role;
  artistName: string;
  songTitle: string;
  bpm?: number;
  musicalKey?: string; // e.g. "8A"
  genre: string[];
  releaseDate?: string;
  coverArtKey?: string; // B2 key
  coverArtUrl?: string;
  /** Admin-only intake path: cover art hosted elsewhere instead of a B2 upload. */
  coverExternalUrl?: string | null;
  audioTracks: AudioTrack[];
  featured?: boolean; // paid "Hot Pick" placement
  createdAt: string;
}

// ---------------------------------------------------------------------------
// drop scripts / recorded scripts
// ---------------------------------------------------------------------------

export interface DjScript {
  scriptId: string; // `SCR_xxxxxxxx`
  djUid: string;
  djName: string; // denormalized from djProfile
  /** Station / venue identity denormalized from djProfile for a credit line. */
  stationCallLetters?: string | null; // terrestrial radio (e.g. "KABQ-FM")
  venueOrUrl?: string | null; // club/digital (venue name or stream/Mixcloud URL)
  platformType?: PlatformType | null;
  /** Ready-to-render credit, e.g. "DJ Surge · KABQ-FM" or "DJ Surge @ mixcloud.com/..." */
  djLabel: string;
  title?: string | null; // optional label, e.g. "Morning drive intro"
  public?: boolean; // default true — visible to artists (option A)
  body: string; // the script text
  createdAt: string;
  updatedAt: string;
}

export interface RecordedScript {
  id: string; // `REC_xxxxxxxx`
  releaseId: string;
  songTitle?: string | null; // denormalized at finalize
  scriptId: string; // which DjScript it voices
  scriptText?: string | null; // copy of the script body
  djId: string; // DjScript djUid
  djName: string;
  stationCallLetters?: string | null;
  venueOrUrl?: string | null;
  djLabel: string; // e.g. "DJ Surge · KABQ-FM"
  voicedByUid: string; // artist/label uid
  storageKey: string; // B2 key
  fileFormat: FileFormat;
  sizeBytes: number;
  createdAt: string;
}

/**
 * A script an artist has chosen to voice, pending between release-create and
 * finalize. Persisted on the release doc so finalize can materialize the
 * RecordedScript subcollection without a second lookup.
 */
export interface PendingScript {
  scriptId: string;
  djUid: string;
  djName: string;
  djLabel: string;
  stationCallLetters?: string | null;
  venueOrUrl?: string | null;
  scriptText: string;
  storageKey: string;
  fileFormat: FileFormat;
  sizeBytes: number;
  uploadStatus: "pending" | "uploaded";
}

// ---------------------------------------------------------------------------
// feedback / drops
// ---------------------------------------------------------------------------

export interface DjFeedback {
  feedbackId: string;
  releaseId: string;
  djUid: string;
  djName: string;
  stationCallLetters?: string;
  rating: number; // 1-5
  comment?: string;
  /** where/when played, from the DJ */
  playNote?: string;
  createdAt: string;
}

/**
 * A DJ's request that the owner of a release record a voiced version of one
 * of the DJ's own scripts. Scopes the artist's script-voicing picker to only
 * scripts actually requested for that release (Option B — see
 * DROP-SCRIPTS-PLAN.md). DJ identity and script text are denormalized at
 * request time, matching the PendingScript/RecordedScript convention.
 */
export interface DropRequest {
  dropId: string; // `DRQ_xxxxxxxx`
  releaseId: string;
  ownerId?: string | null; // denormalized Release.ownerId
  ownerRole?: Role | null; // denormalized Release.ownerRole
  djUid: string;
  djName: string;
  djLabel: string;
  stationCallLetters?: string | null;
  venueOrUrl?: string | null;
  scriptId: string; // DjScript.scriptId
  scriptTitle?: string | null;
  scriptText: string; // copy of DjScript.body at request time
  status: "pending" | "fulfilled" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// subscription plans
// ---------------------------------------------------------------------------

// 2026-09-28 16:40, pricing restructure (task 23): .99 prices, "Linked" tiers that host on the
// customer's own Box, hosting type per plan. Pricing is a markup on B2 storage; Linked plans are
// priced on the platform (DJ reach, stats), since the customer pays their own storage.
export type PlanHosting = "b2" | "link" | "both";

export interface Plan {
  id: string;
  role: "artist" | "label";
  name: string;
  price: number; // USD / month; -1 = custom
  activeReleases: number | null; // null = unlimited
  storageBytes: number; // B2 cap; 0 = no hosted storage, -1 = custom
  /** b2 = uploads only, link = own Box links only, both = either */
  hosting: PlanHosting;
  features: string[];
}

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const PLANS: Plan[] = [
  {
    id: "artist-free",
    role: "artist",
    name: "Artist Free",
    price: 0,
    activeReleases: 1,
    storageBytes: 100 * MB, // one song pack — deliberately not advertised
    hosting: "b2",
    features: ["1 song", "Basic download analytics"],
  },
  {
    id: "artist-starter",
    role: "artist",
    name: "Artist Starter",
    price: 5.99,
    activeReleases: 3,
    storageBytes: 500 * MB,
    hosting: "b2",
    features: ["3 active releases", "500 MB hosted storage", "Basic download analytics"],
  },
  {
    id: "artist-linked",
    role: "artist",
    name: "Artist Linked",
    price: 9.99,
    activeReleases: 15,
    storageBytes: 0,
    hosting: "link",
    features: ["Up to 15 active releases", "Hosted on your own Box", "Play & download stats"],
  },
  {
    id: "artist-pro",
    role: "artist",
    name: "Artist Pro",
    price: 29.99,
    activeReleases: 10,
    storageBytes: 10 * GB,
    hosting: "both",
    features: [
      "10 active releases",
      "10 GB hosted storage + Box links",
      "Priority feed listing",
      "Drop fulfillment dashboard",
    ],
  },
  {
    id: "label-starter",
    role: "label",
    name: "Label Starter",
    price: 20.99,
    activeReleases: 5,
    storageBytes: 5 * GB,
    hosting: "b2",
    features: ["5 active releases", "5 GB hosted storage", "Multi-artist roster", "Download analytics"],
  },
  {
    id: "label-linked",
    role: "label",
    name: "Label Linked",
    price: 39.99,
    activeReleases: 50,
    storageBytes: 0,
    hosting: "link",
    features: ["Up to 50 active releases", "Hosted on your own Box", "Multi-artist roster", "Play & download stats"],
  },
  {
    id: "label",
    role: "label",
    name: "Record Label",
    price: 99.99,
    activeReleases: null,
    storageBytes: 100 * GB,
    hosting: "both",
    features: [
      "Unlimited releases",
      "100 GB hosted storage + Box links",
      "Advanced analytics / PDF export",
      "Targeted DJ blasts",
    ],
  },
  {
    id: "enterprise",
    role: "label",
    name: "Major / Enterprise",
    price: -1,
    activeReleases: null,
    storageBytes: -1, // custom bucket
    hosting: "both",
    features: ["Dedicated B2 bucket", "Custom API integrations", "Priority homepage placement", "Custom storage"],
  },
];

/** Extra hosted storage add-on and yearly discount (shown with the plan cards; billing is task 18). */
export const STORAGE_ADDON = { bytes: 10 * GB, price: 3.99 };
export const YEARLY_MONTHS = 10; // pay 10, get 12

/** Resolve a user's plan; users with no stored plan fall back by role (labels predate plans). */
export function getPlan(planId: string | undefined | null, role: string | null | undefined): Plan {
  const fallback = role === "label" ? "label" : "artist-free";
  return PLANS.find((p) => p.id === planId) ?? PLANS.find((p) => p.id === fallback)!;
}

// 2026-09-28 17:50, Stripe billing. Prices live in Stripe under lookup keys derived from the
// plan id, so PLANS stays the single source of truth (admin "Sync plans to Stripe" creates them).
export type BillingInterval = "monthly" | "yearly";
export const STORAGE_ADDON_ID = "storage-10gb";
// 2026-09-28 21:10, "djsp_" namespace: the Wingudigital Stripe account is shared with other apps
export const LOOKUP_PREFIX = "djsp_";
export const lookupKey = (id: string, interval: BillingInterval) => `${LOOKUP_PREFIX}${id}_${interval}`;

export interface BillingInfo {
  customerId?: string | null;
  subscriptionId?: string | null;
  /** Stripe subscription status (active, trialing, past_due, canceled, …) */
  status?: string | null;
  interval?: BillingInterval | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  storageAddons?: number;
  updatedAt?: string;
}

const PAID_STATUSES = ["active", "trialing", "past_due"];

/**
 * The plan a user actually gets. A paid plan only applies while its Stripe subscription is
 * in good standing, or when an admin comped it (invites); otherwise the user gets Free limits.
 */
export function effectivePlan(u: {
  role?: string | null;
  plan?: string | null;
  planComped?: boolean;
  billing?: BillingInfo | null;
}): { plan: Plan; paid: boolean; chosen: Plan; extraStorageBytes: number } {
  const chosen = getPlan(u.plan, u.role);
  const paid = chosen.price === 0 || Boolean(u.planComped) || PAID_STATUSES.includes(u.billing?.status ?? "");
  const plan = paid ? chosen : PLANS.find((p) => p.id === "artist-free")!;
  const extraStorageBytes = paid ? (u.billing?.storageAddons ?? 0) * STORAGE_ADDON.bytes : 0;
  return { plan, paid, chosen, extraStorageBytes };
}

export function formatPlanPrice(p: Plan): string {
  if (p.price < 0) return "Custom";
  if (p.price === 0) return "$0";
  return `$${p.price.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// 2026-09-28 17:50, admin invites
// ---------------------------------------------------------------------------

export interface Invite {
  id: string; // doc id; also the token in the invite link
  email: string;
  role: "dj" | "artist" | "label";
  /** artist/label: plan granted on signup */
  planId: string | null;
  /** plan is free for this person (no Stripe subscription needed) */
  comped: boolean;
  /** dj: skip the approval queue */
  preApproved: boolean;
  note: string | null;
  invitedBy: string; // admin email
  status: "sent" | "failed" | "accepted" | "revoked";
  createdAt: string;
  sentAt: string | null;
  sendCount: number;
  acceptedAt: string | null;
  acceptedUid: string | null;
}

