# PDF Import Feature - Setup Guide

## Overview

The PDF import feature allows users to upload a PDF file, extract its text, and generate flashcards using the existing AI pipeline.

## Architecture

1. **Frontend**: File input in `decks/[deckId]/page.tsx`
2. **API Route**: `/api/generate-cards-from-pdf` handles:
   - PDF upload to Supabase Storage
   - Text extraction using `pdf-parse`
   - Calls existing `/api/generate-cards` endpoint with extracted text
3. **Storage**: PDFs are stored in `pdfs` bucket in Supabase Storage

## Setup Steps

### 1. Install Dependencies

```bash
npm install pdf-parse @types/pdf-parse
```

### 2. Create Supabase Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `pdfs`
4. Public: **OFF** (private bucket)
5. Click "Create bucket"

### 3. Configure Storage Policies

The bucket needs policies to allow authenticated users to upload PDFs:

```sql
-- Allow authenticated users to upload PDFs
CREATE POLICY "Users can upload PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pdfs');

-- Allow users to read their own PDFs
CREATE POLICY "Users can read their own PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
```

## How It Works

### Flow

1. **User uploads PDF** → File input triggers `handlePdfUpload`
2. **Frontend validation** → File type (.pdf) and size (10 MB max)
3. **API call** → POST to `/api/generate-cards-from-pdf` with FormData
4. **Server processing**:
   - Authenticates user
   - Validates deck ownership
   - Uploads PDF to Supabase Storage (`pdfs/{userId}/{timestamp}-{filename}`)
   - Extracts text using `pdf-parse`
   - Normalizes text (removes headers, footers, excessive line breaks)
   - Truncates to 20,000 characters if needed
   - Calls `/api/generate-cards` with extracted text
5. **Response** → Same format as text-based generation
6. **UI update** → Cards appear exactly like text-based generation

### Text Extraction

- Uses `pdf-parse` library (server-side only)
- Extracts plain text (no images, no metadata)
- Normalizes text:
  - Removes excessive line breaks
  - Removes page numbers
  - Removes common header/footer patterns
  - Trims whitespace

### Error Handling

- **"Invalid file type"** → File is not a PDF
- **"PDF too large"** → File exceeds 10 MB
- **"Could not extract text from PDF"** → PDF parsing failed or no text found
- **Quota errors** → Same as text generation (QUOTA_FREE_PLAN, QUOTA_EXCEEDED)

## Code Structure

### API Route: `src/app/api/generate-cards-from-pdf/route.ts`

- Handles PDF upload and text extraction
- Reuses existing `/api/generate-cards` logic via internal API call
- No duplication of business logic

### UI: `src/app/(app)/decks/[deckId]/page.tsx`

- Added file input with label (styled as button)
- Added `handlePdfUpload` function
- Added loading/error states for PDF processing
- Shares same success state as text generation

## Testing Checklist

- [ ] Upload valid PDF → Cards generated successfully
- [ ] Upload non-PDF file → "Invalid file type" error
- [ ] Upload PDF > 10 MB → "PDF too large" error
- [ ] Upload scanned PDF (no text) → "Could not extract text" error
- [ ] Upload PDF as free user → Paywall modal appears
- [ ] Upload PDF as founder → Unlimited access works
- [ ] Loading state shows during processing
- [ ] Success state shows cards like text generation

## Notes

- **No OCR**: Only text-based PDFs are supported (no scanned images)
- **Storage**: PDFs are stored but not deleted (consider cleanup policy if needed)
- **Text limit**: Same 20,000 character limit as text input
- **Language**: Currently hardcoded to "fr", can be made dynamic if needed
