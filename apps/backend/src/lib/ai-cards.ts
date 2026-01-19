import { z } from "zod";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const MAX_TEXT_LENGTH = 20000;

// Strict output schema - NO extra fields allowed
const strictOutputSchema = z
  .object({
    language: z.enum(["fr", "en"]),
    title: z.string().min(1),
    cards: z
      .array(
        z
          .object({
            front: z.string().min(1),
            back: z.string().min(1),
            tags: z.array(z.string()).optional(),
            difficulty: z
              .union([
                z.literal(1),
                z.literal(2),
                z.literal(3),
                z.literal(4),
                z.literal(5),
              ])
              .optional(),
          })
          .strict()
      )
      .min(6)
      .max(10),
  })
  .strict();

// Helper to check for distinct concepts (simple similarity check)
function hasDistinctConcepts(cards: Array<{ front: string }>): boolean {
  const fronts = cards.map((c) => c.front.toLowerCase().trim());
  const uniqueFronts = new Set(fronts);
  if (uniqueFronts.size < fronts.length * 0.8) {
    return false;
  }
  return true;
}

async function callLLM(
  text: string,
  isRetry: boolean
): Promise<{ language: string; title: string; cards: any[] }> {
  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  const baseURL = process.env.LLM_BASE_URL || "https://api.openai.com/v1";

  const systemPrompt = `Tu es un expert en création de flashcards pour la mémorisation efficace et l'apprentissage conceptuel.

RÈGLE ABSOLUE : Return ONLY valid JSON. No text, no markdown, no explanation before or after.

RÈGLES STRICTES DE SORTIE JSON :
- Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après, sans markdown, sans commentaires.
- Le JSON DOIT respecter EXACTEMENT ce schéma, sans aucun champ supplémentaire :
{
  "language": "fr" | "en",
  "title": "titre du deck",
  "cards": [
    {
      "front": "question ou concept",
      "back": "réponse ou définition",
      "tags": ["tag1", "tag2"] (optionnel),
      "difficulty": 1 | 2 | 3 | 4 | 5 (optionnel)
    }
  ]
}

INTERDICTIONS ABSOLUES :
- AUCUN champ "confidence", "metadata", "explanation", "commentary" ou autre champ non listé ci-dessus.
- AUCUN markdown, aucune explication en dehors du JSON.
- Le tableau "cards" DOIT contenir entre 6 et 10 éléments exactement.

QUALITÉ DES FLASHCARDS :
- Chaque carte doit tester un concept DISTINCT et significatif.
- Évite les questions triviales, répétitives ou à faible valeur pédagogique.
- Privilégie la compréhension conceptuelle plutôt que la mémorisation mécanique.
- Le front doit être concis et mémorisable. Le back doit être clair et complet mais pas trop long.
- Les concepts doivent couvrir différents aspects du texte pour maximiser l'efficacité d'apprentissage.

${isRetry ? "ATTENTION : Ceci est une deuxième tentative. Respecte STRICTEMENT le schéma JSON ci-dessus, sans aucun champ supplémentaire." : ""}`;

  const userPrompt = `Extrait le texte suivant et génère entre 6 et 10 flashcards de haute qualité.
Chaque flashcard doit tester un concept distinct et significatif.

Texte :
${text}

Réponds UNIQUEMENT avec le JSON strict conforme au schéma, sans aucun texte supplémentaire.`;

  const llmStart = Date.now();
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  const llmDuration = Date.now() - llmStart;

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[LLM] API error", {
      status: response.status,
      durationMs: llmDuration,
    });
    throw new Error(`LLM API error: ${response.status} - ${errorText}`);
  }

  console.log("[LLM] Call successful in ms:", llmDuration);

  const data = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const rawContent = data.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error("No content in LLM response");
  }

  // LOG RAW OUTPUT BEFORE PARSING
  console.error("[LLM] RAW_LLM_OUTPUT:", rawContent.substring(0, 500)); // Log first 500 chars for debugging

  // Extract JSON defensively - find first valid JSON object
  let jsonContent = rawContent.trim();
  
  // Remove markdown code blocks if present
  if (jsonContent.startsWith("```json")) {
    jsonContent = jsonContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (jsonContent.startsWith("```")) {
    jsonContent = jsonContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  // Extract first JSON object if wrapped in text
  const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonContent = jsonMatch[0];
  } else {
    throw new Error(`No JSON object found in LLM output. Raw output: ${rawContent.substring(0, 200)}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (e) {
    console.error("[LLM] JSON parse error:", e);
    console.error("[LLM] Extracted JSON content:", jsonContent.substring(0, 500));
    throw new Error(`Failed to parse LLM JSON: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Validate schema - but be more forgiving for cards array
  let validated;
  try {
    validated = strictOutputSchema.parse(parsed);
  } catch (schemaError) {
    // If schema validation fails, try to extract valid cards
    console.error("[LLM] Schema validation failed:", schemaError);
    console.error("[LLM] Parsed object keys:", Object.keys(parsed));
    
    // Attempt to extract valid cards from parsed object
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.cards)) {
      const validCards = parsed.cards.filter((card: any) => {
        return (
          card &&
          typeof card === "object" &&
          typeof card.front === "string" &&
          card.front.trim().length > 0 &&
          typeof card.back === "string" &&
          card.back.trim().length > 0
        );
      });

      if (validCards.length >= 6) {
        // If we have at least 6 valid cards, use them
        console.warn(`[LLM] Using ${validCards.length} valid cards out of ${parsed.cards.length} after schema validation failure`);
        validated = {
          language: parsed.language || "fr",
          title: parsed.title || "Deck",
          cards: validCards.slice(0, 10), // Max 10 cards
        };
        
        // Re-validate with relaxed schema (no strict mode)
        const relaxedSchema = z.object({
          language: z.enum(["fr", "en"]).default("fr"),
          title: z.string().min(1).default("Deck"),
          cards: z.array(
            z.object({
              front: z.string().min(1),
              back: z.string().min(1),
              tags: z.array(z.string()).optional(),
              difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
            })
          ).min(6).max(10),
        });
        
        validated = relaxedSchema.parse(validated);
      } else {
        throw new Error(`Only ${validCards.length} valid cards found (minimum 6 required). Schema error: ${schemaError}`);
      }
    } else {
      throw new Error(`Invalid LLM output structure. Expected object with 'cards' array. Schema error: ${schemaError}`);
    }
  }

  // Additional validation: check for distinct concepts
  if (!hasDistinctConcepts(validated.cards)) {
    throw new Error(
      "Cards do not test distinct concepts - too many duplicates detected"
    );
  }

  return validated;
}

/**
 * Helper to get admin Supabase client
 */
function getAdminSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createServiceClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Check user quota and access rights
 */
async function checkUserQuota(userId: string, cardCount: number = 10): Promise<{
  canGenerate: boolean;
  isFounderOrAdmin: boolean;
  error?: any;
  profile?: any;
}> {
  const adminSupabase = getAdminSupabase();
  if (!adminSupabase) {
    return {
      canGenerate: false,
      isFounderOrAdmin: false,
      error: {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Supabase service key configuration is missing",
        status: 500,
      },
    };
  }

  // Get user profile to check quota and role
  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select(
      "plan, role, ai_cards_used_current_month, ai_cards_monthly_limit, ai_quota_reset_at"
    )
    .eq("id", userId)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("[ai-cards] Profile lookup failed:", profileError);
    return {
      canGenerate: false,
      isFounderOrAdmin: false,
      error: {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to check quota",
        status: 500,
      },
    };
  }

  let userProfile = profile;
  if (!userProfile) {
    const { data: authUser } = await adminSupabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email || null;

    const { data: newProfile, error: createError } = await adminSupabase
      .from("profiles")
      .insert({
        id: userId,
        email: email || "",
        role: "user",
        plan: "free",
        ai_cards_used_current_month: 0,
        ai_cards_monthly_limit: 0,
        ai_quota_reset_at: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1
        ).toISOString(),
      })
      .select()
      .single();

    if (createError) {
      return {
        canGenerate: false,
        isFounderOrAdmin: false,
        error: {
          success: false,
          error: "QUOTA_FREE_PLAN",
          message:
            "AI flashcard generation is not available on the free plan. Please upgrade to Starter or Pro.",
          plan: "free",
          status: 403,
        },
      };
    }
    userProfile = newProfile;
  }

  if (!userProfile) {
    return {
      canGenerate: false,
      isFounderOrAdmin: false,
      error: {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to initialize user profile",
        status: 500,
      },
    };
  }

  const plan =
    userProfile.plan === "starter" || userProfile.plan === "pro"
      ? userProfile.plan
      : "free";
  const role = userProfile.role || "user";
  const used = userProfile.ai_cards_used_current_month || 0;
  const limit = userProfile.ai_cards_monthly_limit || 0;

  const isPremium = plan === "starter" || plan === "pro";
  const isFounderOrAdmin = role === "founder" || role === "admin";
  const hasAIAccess = isPremium || isFounderOrAdmin;

  // Check if quota needs reset
  if (!isFounderOrAdmin) {
    const resetAt = new Date(userProfile.ai_quota_reset_at);
    const now = new Date();
    if (resetAt <= now) {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const { error: resetError } = await adminSupabase
        .from("profiles")
        .update({
          ai_cards_used_current_month: 0,
          ai_quota_reset_at: nextMonth.toISOString(),
        })
        .eq("id", userId);

      if (!resetError) {
        userProfile.ai_cards_used_current_month = 0;
        userProfile.ai_quota_reset_at = nextMonth.toISOString();
      }
    }
  }

  // Check access
  let canGenerate = false;
  if (!hasAIAccess) {
    canGenerate = false;
  } else if (isFounderOrAdmin) {
    canGenerate = true;
  } else if (used + cardCount <= limit) {
    canGenerate = true;
  }

  if (!canGenerate) {
    if (!hasAIAccess) {
      return {
        canGenerate: false,
        isFounderOrAdmin: false,
        error: {
          success: false,
          error: "QUOTA_FREE_PLAN",
          message:
            "AI flashcard generation is not available on the free plan. Please upgrade to Starter or Pro.",
          plan: "free",
          status: 403,
        },
      };
    } else if (!isFounderOrAdmin) {
      const remaining = Math.max(0, limit - used);
      return {
        canGenerate: false,
        isFounderOrAdmin: false,
        error: {
          success: false,
          error: "QUOTA_EXCEEDED",
          message:
            plan === "starter"
              ? "You've reached your monthly limit of 800 AI cards. Upgrade to Pro for 2,500 cards/month."
              : "You've reached your monthly limit of 2,500 AI cards. Your quota will reset at the beginning of next month.",
          plan: plan,
          used: used,
          limit: limit,
          remaining: remaining,
          reset_at: userProfile.ai_quota_reset_at,
          status: 403,
        },
      };
    }
  }

  return { canGenerate: true, isFounderOrAdmin, profile: userProfile };
}

export interface CardPreview {
  front: string;
  back: string;
  tags?: string[];
  difficulty?: number;
}

export interface GeneratePreviewResult {
  success: true;
  deckId: string;
  cards: CardPreview[];
}

export interface GenerateCardsError {
  success: false;
  error: string;
  code?: string;
  message?: string;
  status: number;
  plan?: string;
  used?: number;
  limit?: number;
  remaining?: number;
  reset_at?: string;
}

export type GeneratePreviewResponse = GeneratePreviewResult | GenerateCardsError;

/**
 * Generate AI flashcards from text - PREVIEW ONLY, no database insertion.
 * Cards are returned for user review before confirmation.
 */
export async function generateCardsPreview(
  text: string,
  deckId: string,
  userId: string
): Promise<GeneratePreviewResponse> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "OPENAI_API_KEY missing",
      status: 500,
    };
  }

  // Check quota (estimated 10 cards)
  const quotaCheck = await checkUserQuota(userId, 10);
  if (!quotaCheck.canGenerate) {
    return quotaCheck.error!;
  }

  // Truncate text if needed
  const truncatedText =
    text.length > MAX_TEXT_LENGTH
      ? text.substring(0, MAX_TEXT_LENGTH) + "\n\n[Texte tronqué...]"
      : text;

  // Call LLM with retry
  let result;
  let lastError: Error | null = null;
  
  try {
    result = await callLLM(truncatedText, false);
  } catch (error) {
    console.error("[generateCardsPreview] First LLM call failed:", error);
    lastError = error instanceof Error ? error : new Error(String(error));
    
    try {
      result = await callLLM(truncatedText, true);
    } catch (retryError) {
      console.error("[generateCardsPreview] Retry LLM call also failed:", retryError);
      const retryErrorMessage = retryError instanceof Error ? retryError.message : String(retryError);
      
      return {
        success: false,
        error: "INTERNAL_ERROR",
        message: `LLM output invalid – see logs. First error: ${lastError.message}. Retry error: ${retryErrorMessage}`,
        status: 500,
      };
    }
  }

  if (!result.cards || result.cards.length === 0) {
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Generated cards array is empty",
      status: 500,
    };
  }

  console.log("[ai-cards] LLM call successful, cards count:", result.cards.length);

  // Prepare preview response (NO insertion, NO quota increment)
  const cardPreviews: CardPreview[] = result.cards.map((card) => {
    const preview: CardPreview = {
      front: card.front,
      back: card.back,
    };
    if (card.tags && card.tags.length > 0) {
      preview.tags = card.tags;
    }
    if (card.difficulty !== undefined) {
      preview.difficulty = card.difficulty;
    }
    return preview;
  });

  return {
    success: true,
    deckId,
    cards: cardPreviews,
  };
}

export interface ConfirmCardsInput {
  deckId: string;
  userId: string;
  cards: CardPreview[];
}

export interface ConfirmCardsResult {
  success: true;
  deckId: string;
  imported: number;
  cards: CardPreview[];
}

export type ConfirmCardsResponse = ConfirmCardsResult | GenerateCardsError;

/**
 * Confirm and insert selected cards into the database.
 * This is called after user reviews and selects cards to keep.
 */
export async function confirmAndInsertCards(
  input: ConfirmCardsInput
): Promise<ConfirmCardsResponse> {
  const { deckId, userId, cards } = input;

  console.log("[confirmAndInsertCards] START", {
    deckId,
    userId,
    cardsCount: cards?.length,
  });

  if (!cards || cards.length === 0) {
    console.log("[confirmAndInsertCards] NO_CARDS - early return");
    return {
      success: false,
      error: "NO_CARDS",
      message: "No cards to insert",
      status: 400,
    };
  }

  const adminSupabase = getAdminSupabase();
  if (!adminSupabase) {
    console.log("[confirmAndInsertCards] No admin Supabase client");
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Supabase service key configuration is missing",
      status: 500,
    };
  }

  // Re-check quota with actual card count
  console.log("[confirmAndInsertCards] Checking quota...");
  const quotaCheck = await checkUserQuota(userId, cards.length);
  if (!quotaCheck.canGenerate) {
    console.log("[confirmAndInsertCards] Quota check failed:", quotaCheck.error);
    return quotaCheck.error!;
  }
  console.log("[confirmAndInsertCards] Quota OK");

  // Verify deck exists and belongs to user
  console.log("[confirmAndInsertCards] Verifying deck...");
  const { data: deck, error: deckError } = await adminSupabase
    .from("decks")
    .select("id, user_id")
    .eq("id", deckId)
    .single();

  if (deckError || !deck) {
    console.log("[confirmAndInsertCards] Deck not found:", deckError);
    return {
      success: false,
      error: "DECK_NOT_FOUND",
      message: "Deck non trouvé",
      status: 404,
    };
  }

  if (deck.user_id !== userId) {
    console.log("[confirmAndInsertCards] Deck user_id mismatch:", {
      deckUserId: deck.user_id,
      requestUserId: userId,
    });
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Ce deck ne vous appartient pas",
      status: 403,
    };
  }
  console.log("[confirmAndInsertCards] Deck verified OK");

  // Prepare cards for insert
  const nowIso = new Date().toISOString();
  const cardsToInsert = cards.map((card) => ({
    user_id: userId,
    deck_id: deckId,
    front: card.front,
    back: card.back,
    type: "basic" as const,
    state: "new" as const,
    due_at: nowIso,
  }));

  console.log("[confirmAndInsertCards] Inserting cards:", {
    count: cardsToInsert.length,
    sample: cardsToInsert[0],
  });

  // Insert cards
  const { data: insertedCards, error: insertError } = await adminSupabase
    .from("cards")
    .insert(cardsToInsert)
    .select("id, front, back");

  if (insertError) {
    console.error("[confirmAndInsertCards] Insert FAILED:", insertError);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to insert cards into database",
      status: 500,
    };
  }

  console.log("[confirmAndInsertCards] Insert SUCCESS:", {
    insertedCount: insertedCards?.length ?? 0,
    insertedIds: insertedCards?.map(c => c.id),
  });

  // Increment quota ONLY after successful insertion
  if (!quotaCheck.isFounderOrAdmin && quotaCheck.profile) {
    const actualCardCount = insertedCards?.length || 0;
    await adminSupabase
      .from("profiles")
      .update({
        ai_cards_used_current_month:
          (quotaCheck.profile.ai_cards_used_current_month || 0) + actualCardCount,
      })
      .eq("id", userId);
  }

  return {
    success: true,
    deckId,
    imported: insertedCards?.length || 0,
    cards,
  };
}
