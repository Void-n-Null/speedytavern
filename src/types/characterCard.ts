// Character card types (Tavern / SillyTavern ecosystem)
// Note: We intentionally keep these broad; storage is raw JSON + extracted fields.

export type TavernCardV1 = {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
};

export type TavernCardV2 = {
  spec: 'chara_card_v2';
  spec_version: '2.0';
  data: TavernCardV1 & {
    creator_notes: string;
    system_prompt: string;
    post_history_instructions: string;
    alternate_greetings: string[];
    character_book?: unknown;
    tags: string[];
    creator: string;
    character_version: string;
    extensions: Record<string, unknown>;
    // SillyTavern adds additional fields; keep them as unknown here.
    [k: string]: unknown;
  };
  // SillyTavern commonly keeps legacy top-level V1 + extra fields alongside V2.
  [k: string]: unknown;
};

export type TavernCardV3 = {
  spec: 'chara_card_v3';
  spec_version: '3.0';
  data: Record<string, unknown>;
  [k: string]: unknown;
};

export type TavernCard = TavernCardV1 | TavernCardV2 | TavernCardV3 | Record<string, unknown>;

export interface CharacterCardRecordMeta {
  id: string;
  name: string;
  spec?: string;
  spec_version?: string;
  source: string;
  creator?: string;
  token_count?: number;
  token_count_updated_at?: number;
  created_at: number;
  updated_at: number;
  png_mime?: string;
  png_sha256?: string;
  has_png?: boolean;
}

export interface CharacterCardRecord extends CharacterCardRecordMeta {
  raw_json: string;
}


