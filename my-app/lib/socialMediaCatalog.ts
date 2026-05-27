import {
  openFacebook,
  openFacebookMessenger,
  openInstagram,
  openLinkedIn,
  openPinterest,
  openTikTok,
  openX,
  openYouTube,
} from "@/lib/socialMediaLaunch";

export type SocialMediaMenuItem = {
  key: string;
  label: string;
  open: () => Promise<void>;
};

/** First row in the home picker — the four main tiles. */
export const SOCIAL_MEDIA_PRIMARY_ITEMS: readonly SocialMediaMenuItem[] = [
  { key: "facebook", label: "Facebook", open: openFacebook },
  { key: "facebook-messenger", label: "Messenger", open: openFacebookMessenger },
  { key: "tiktok", label: "TikTok", open: openTikTok },
  { key: "instagram", label: "Instagram", open: openInstagram },
  { key: "youtube", label: "YouTube", open: openYouTube },
];

/** Extra networks from the “more” section (LinkedIn, etc.). */
export const SOCIAL_MEDIA_MORE_ITEMS: readonly SocialMediaMenuItem[] = [
  { key: "linkedin", label: "LinkedIn", open: openLinkedIn },
  { key: "x", label: "X (Twitter)", open: openX },
  { key: "pinterest", label: "Pinterest", open: openPinterest },
];
