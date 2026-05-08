import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.type !== "application/pdf") return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamically import pdf-parse to avoid build issues
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);

    return NextResponse.json({ text: parsed.text, pages: parsed.numpages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
