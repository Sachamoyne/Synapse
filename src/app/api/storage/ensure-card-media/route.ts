import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET_NAME = "card-media";

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("[STORAGE] Missing Supabase env vars for bucket setup");
    return NextResponse.json(
      { error: "Supabase configuration is missing" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(BUCKET_NAME);

  if (bucketError && bucketError.statusCode !== 404) {
    console.error("[STORAGE] Failed to read bucket", bucketError);
    return NextResponse.json(
      { error: "Failed to read storage bucket" },
      { status: 500 }
    );
  }

  if (!bucket) {
    const { data: createdBucket, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
    });

    if (createError || !createdBucket) {
      console.error("[STORAGE] Failed to create bucket", createError);
      return NextResponse.json(
        { error: "Failed to create storage bucket" },
        { status: 500 }
      );
    }
  } else if (!bucket.public) {
    const { error: updateError } = await supabase.storage.updateBucket(BUCKET_NAME, {
      public: true,
    });

    if (updateError) {
      console.error("[STORAGE] Failed to make bucket public", updateError);
      return NextResponse.json(
        { error: "Failed to update bucket visibility" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ bucket: BUCKET_NAME, ok: true });
}
