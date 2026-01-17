import { NextRequest, NextResponse } from "next/server";

// Route migrated to backend - return 410 Gone
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: "Route moved to backend",
      message: "This route has been moved to the backend API. Please use NEXT_PUBLIC_BACKEND_URL/anki/import",
      status: 410,
    },
    { status: 410 }
  );
}
