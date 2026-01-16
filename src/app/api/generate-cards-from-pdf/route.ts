// Force Node.js runtime for pdf-parse (requires native modules)
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Dynamic import for pdf-parse to handle CommonJS module
let pdfParse: any = null;
let importError: Error | null = null;

async function getPdfParser() {
  if (importError) {
    throw importError;
  }
  
  if (!pdfParse) {
    try {
      // @ts-ignore - pdf-parse is CommonJS
      const pdfModule = await import("pdf-parse");
      pdfParse = pdfModule.default || pdfModule;
      
      if (!pdfParse || typeof pdfParse !== "function") {
        throw new Error("pdf-parse module did not export a function");
      }
    } catch (error) {
      console.error("[generate-cards-from-pdf] Failed to import pdf-parse:", error);
      importError = error instanceof Error ? error : new Error(String(error));
      throw new Error("PDF parsing library not available");
    }
  }
  return pdfParse;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PDF_BUCKET = "pdfs";

// UUID validation regex (matches Zod UUID format)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Normalize extracted text from PDF
 * Removes extra line breaks, headers, footers when possible
 */
function normalizeText(text: string): string {
  // Remove excessive line breaks (more than 2 consecutive)
  let normalized = text.replace(/\n{3,}/g, "\n\n");
  
  // Remove common header/footer patterns (page numbers, dates, etc.)
  normalized = normalized.replace(/^\d+\s*$/gm, ""); // Standalone page numbers
  normalized = normalized.replace(/Page \d+ of \d+/gi, ""); // Page X of Y
  normalized = normalized.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, ""); // Dates
  
  // Remove excessive whitespace
  normalized = normalized.replace(/[ \t]+/g, " ");
  
  // Trim each line
  normalized = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
  
  return normalized.trim();
}

export async function POST(request: NextRequest) {
  console.log("[generate-cards-from-pdf] Request received");

  // Wrap entire handler in try/catch to ensure JSON responses
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("[generate-cards-from-pdf] Returning 401 Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const deckIdRaw = formData.get("deck_id");
    const languageRaw = formData.get("language");

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    // Validate and parse deck_id (must be a valid UUID string)
    if (!deckIdRaw || typeof deckIdRaw !== "string") {
      console.error("[generate-cards-from-pdf] Missing or invalid deck_id:", deckIdRaw);
      return NextResponse.json(
        { error: "Deck ID is required" },
        { status: 400 }
      );
    }

    const deckId = deckIdRaw.trim();
    
    // Validate UUID format (basic check)
    if (!UUID_REGEX.test(deckId)) {
      console.error("[generate-cards-from-pdf] Invalid UUID format for deck_id:", deckId);
      return NextResponse.json(
        { error: "Invalid deck ID format" },
        { status: 400 }
      );
    }

    // Validate and parse language (must be "fr" or "en")
    const language = languageRaw && typeof languageRaw === "string" 
      ? languageRaw.trim().toLowerCase()
      : "fr";
    
    if (language !== "fr" && language !== "en") {
      console.error("[generate-cards-from-pdf] Invalid language:", language);
      return NextResponse.json(
        { error: "Language must be 'fr' or 'en'" },
        { status: 400 }
      );
    }

    console.log("[generate-cards-from-pdf] Validated inputs:", {
      deckId,
      language,
      fileName: file.name,
      fileSize: file.size,
    });

    // Validate file type
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "PDF too large" },
        { status: 400 }
      );
    }

    console.log("[generate-cards-from-pdf] File validated:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // Verify deck exists and belongs to user
    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .select("id, user_id")
      .eq("id", deckId)
      .single();

    if (deckError || !deck) {
      return NextResponse.json(
        { error: "Deck not found" },
        { status: 404 }
      );
    }

    if (deck.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: deck does not belong to user" },
        { status: 403 }
      );
    }

    // Upload PDF to Supabase Storage (optional - we can extract text without storing)
    const fileBuffer = await file.arrayBuffer();
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    
    console.log("[generate-cards-from-pdf] Attempting to upload PDF to storage:", fileName);

    // Try to upload, but don't fail if bucket doesn't exist or upload fails
    // We can still extract text from the buffer
    let uploadSucceeded = false;
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(PDF_BUCKET)
        .upload(fileName, fileBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.warn("[generate-cards-from-pdf] Storage upload failed (non-blocking):", uploadError.message);
        // Continue anyway - we can extract text from buffer
      } else {
        uploadSucceeded = true;
        console.log("[generate-cards-from-pdf] PDF uploaded successfully");
      }
    } catch (storageError) {
      console.warn("[generate-cards-from-pdf] Storage upload exception (non-blocking):", storageError);
      // Continue anyway - we can extract text from buffer
    }

    // Extract text from PDF
    console.log("[generate-cards-from-pdf] Extracting text from PDF...");
    let extractedText: string;
    
    try {
      // Get pdf-parse function (dynamic import)
      const pdf = await getPdfParser();
      
      // Convert ArrayBuffer to Buffer
      // Buffer is available in Node.js runtime, but we need to handle it properly
      let pdfBuffer: Buffer;
      try {
        if (typeof Buffer !== "undefined") {
          pdfBuffer = Buffer.from(fileBuffer);
        } else {
          // Fallback: convert ArrayBuffer to Node.js Buffer via Uint8Array
          const uint8Array = new Uint8Array(fileBuffer);
          pdfBuffer = Buffer.from(uint8Array);
        }
      } catch (bufferError) {
        console.error("[generate-cards-from-pdf] Failed to create Buffer:", bufferError);
        return NextResponse.json(
          { error: "Failed to process PDF file" },
          { status: 500 }
        );
      }
      
      // Extract text from PDF buffer
      const pdfData = await pdf(pdfBuffer);
      
      if (!pdfData || !pdfData.text) {
        console.error("[generate-cards-from-pdf] PDF parsing returned no text data");
        return NextResponse.json(
          { error: "Could not extract text from PDF" },
          { status: 400 }
        );
      }
      
      extractedText = normalizeText(pdfData.text);
      
      if (!extractedText || extractedText.trim().length === 0) {
        console.error("[generate-cards-from-pdf] Extracted text is empty after normalization");
        return NextResponse.json(
          { error: "Could not extract text from PDF" },
          { status: 400 }
        );
      }
      
      console.log("[generate-cards-from-pdf] Text extracted:", {
        length: extractedText.length,
        preview: extractedText.substring(0, 100),
      });
    } catch (parseError) {
      console.error("[generate-cards-from-pdf] PDF parsing failed:", parseError);
      
      // Provide more specific error message
      let errorMessage = "Could not extract text from PDF";
      if (parseError instanceof Error) {
        console.error("[generate-cards-from-pdf] Error details:", {
          message: parseError.message,
          stack: parseError.stack,
          name: parseError.name,
        });
        
        if (parseError.message.includes("not available")) {
          errorMessage = "PDF parsing library not available. Please contact support.";
        } else if (parseError.message.includes("Invalid PDF") || parseError.message.includes("invalid")) {
          errorMessage = "Invalid PDF file. Please ensure the file is a valid PDF document.";
        } else {
          errorMessage = `PDF parsing error: ${parseError.message}`;
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    // Truncate text if too long (same limit as text input)
    const MAX_TEXT_LENGTH = 20000;
    const truncatedText =
      extractedText.length > MAX_TEXT_LENGTH
        ? extractedText.substring(0, MAX_TEXT_LENGTH) + "\n\n[Texte tronqué...]"
        : extractedText;

    // Validate extracted text is not empty (after truncation)
    if (!truncatedText || truncatedText.trim().length === 0) {
      console.error("[generate-cards-from-pdf] Extracted text is empty after truncation");
      return NextResponse.json(
        { error: "Could not extract text from PDF" },
        { status: 400 }
      );
    }

    // Prepare payload matching exact Zod schema from /api/generate-cards
    // Schema: { text: string.min(1), deck_id: string.uuid(), language: "fr" | "en" }
    const payload = {
      text: truncatedText.trim(), // Ensure no leading/trailing whitespace
      deck_id: deckId, // Already validated as UUID
      language: language as "fr" | "en", // Already validated as "fr" or "en"
    };

    // Log payload for debugging (without full text)
    console.log("[generate-cards-from-pdf] Payload prepared:", {
      textLength: payload.text.length,
      deck_id: payload.deck_id,
      language: payload.language,
      textPreview: payload.text.substring(0, 100),
    });

    // Validate payload matches Zod schema before sending
    if (!payload.text || payload.text.length === 0) {
      console.error("[generate-cards-from-pdf] Payload validation failed: text is empty");
      return NextResponse.json(
        { error: "Extracted text is empty" },
        { status: 400 }
      );
    }

    if (!UUID_REGEX.test(payload.deck_id)) {
      console.error("[generate-cards-from-pdf] Payload validation failed: invalid deck_id");
      return NextResponse.json(
        { error: "Invalid deck ID" },
        { status: 400 }
      );
    }

    if (payload.language !== "fr" && payload.language !== "en") {
      console.error("[generate-cards-from-pdf] Payload validation failed: invalid language");
      return NextResponse.json(
        { error: "Invalid language" },
        { status: 400 }
      );
    }

    // Call the existing generate-cards endpoint internally
    // We reuse the logic by calling it as an internal API call
    // This avoids duplicating the AI generation, quota checking, and card insertion logic
    const baseUrl = request.nextUrl.origin;
    const generateCardsUrl = `${baseUrl}/api/generate-cards`;
    
    console.log("[generate-cards-from-pdf] Calling generate-cards endpoint:", {
      url: generateCardsUrl,
      deckId: payload.deck_id,
      language: payload.language,
      textLength: payload.text.length,
    });
    
    // Serialize payload to JSON and validate it's valid JSON
    let payloadJson: string;
    try {
      payloadJson = JSON.stringify(payload);
      // Verify JSON is valid by parsing it back
      JSON.parse(payloadJson);
      console.log("[generate-cards-from-pdf] Payload JSON serialized successfully, length:", payloadJson.length);
    } catch (jsonError) {
      console.error("[generate-cards-from-pdf] Failed to serialize payload to JSON:", jsonError);
      return NextResponse.json(
        { error: "Failed to prepare request payload" },
        { status: 500 }
      );
    }

    let generateResponse: Response;
    try {
      generateResponse = await fetch(generateCardsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Forward all cookies from the original request to maintain authentication
          Cookie: request.headers.get("cookie") || "",
          // Forward authorization header if present
          ...(request.headers.get("authorization") && {
            Authorization: request.headers.get("authorization")!,
          }),
        },
        body: payloadJson,
      });
    } catch (fetchError) {
      console.error("[generate-cards-from-pdf] Fetch failed:", fetchError);
      return NextResponse.json(
        {
          error: "Failed to call generate-cards endpoint",
          details: fetchError instanceof Error ? fetchError.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Always return JSON, even on errors
    let generateData: any;
    try {
      const responseText = await generateResponse.text();
      
      // Check if response is JSON
      const contentType = generateResponse.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("[generate-cards-from-pdf] generate-cards returned non-JSON response:", {
          status: generateResponse.status,
          contentType,
          text: responseText.substring(0, 500),
        });
        return NextResponse.json(
          {
            error: "Invalid response from generate-cards endpoint",
            details: `Expected JSON but got ${contentType || "unknown"}`,
            status: generateResponse.status,
          },
          { status: 500 }
        );
      }

      // Parse JSON response
      try {
        generateData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("[generate-cards-from-pdf] Failed to parse JSON response:", {
          status: generateResponse.status,
          text: responseText.substring(0, 500),
          error: parseError,
        });
        return NextResponse.json(
          {
            error: "Invalid JSON response from generate-cards endpoint",
            details: parseError instanceof Error ? parseError.message : "JSON parse failed",
          },
          { status: 500 }
        );
      }
    } catch (readError) {
      console.error("[generate-cards-from-pdf] Failed to read response:", readError);
      return NextResponse.json(
        {
          error: "Failed to read response from generate-cards endpoint",
          details: readError instanceof Error ? readError.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    if (!generateResponse.ok) {
      console.error("[generate-cards-from-pdf] generate-cards endpoint returned error:", {
        status: generateResponse.status,
        error: generateData,
      });
      // Return the error data as JSON (already validated as JSON above)
      return NextResponse.json(generateData, { status: generateResponse.status });
    }

    console.log("[generate-cards-from-pdf] Successfully generated cards from PDF");
    
    // Return the same format as /api/generate-cards
    return NextResponse.json(generateData);
  } catch (error) {
    console.error("[generate-cards-from-pdf] Unexpected error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process PDF",
      },
      { status: 500 }
    );
  }
}
