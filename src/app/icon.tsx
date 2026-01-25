import { ImageResponse } from "next/og";
import path from "node:path";
import { readFile } from "node:fs/promises";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const logoPath = path.join(process.cwd(), "public", "logo-soma.png");
  const logoBuffer = await readFile(logoPath);
  const logoBase64 = logoBuffer.toString("base64");
  const logoSrc = `data:image/png;base64,${logoBase64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "transparent",
        }}
      >
        <img src={logoSrc} width={32} height={32} alt="Soma" />
      </div>
    ),
    { width: 32, height: 32 }
  );
}
