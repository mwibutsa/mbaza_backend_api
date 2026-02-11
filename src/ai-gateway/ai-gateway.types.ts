export interface AiAudioFile {
  url: string;
  path: string;
  origName: string;
  size: number | null;
  mimeType: string | null;
  isStream: boolean;
}

export interface AiResponse {
  /** The AI's spoken response audio file */
  audioFile: AiAudioFile;
  /** Raw transcript — e.g. "User: ...\nAI: ..." */
  transcript: string;
  /** Category classification(s) from the AI */
  categories: string[];
}

/**
 * Known categories the AI can classify into.
 * This list comes from the AI team and may change.
 */
export const AI_CATEGORIES = [
  'Land registration and property disputes',
  'Civil status changes',
  'Public sector recruitment and budgeting',
  'Waste management',
  'Illegal constructions',
  'Development project inquiries',
  'Local sports competitions',
  'Other',
] as const;

export type AiCategory = (typeof AI_CATEGORIES)[number];
