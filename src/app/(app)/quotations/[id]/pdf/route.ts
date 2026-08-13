import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { COMMERCIAL_ROLES } from "@/lib/auth/permissions";
import { buildQuotationPdfProps } from "@/lib/pdf/build-quotation-pdf-props";
import { QuotationPdfDocument } from "@/lib/pdf/quotation-pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !COMMERCIAL_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const props = await buildQuotationPdfProps(user, id);
  if (!props) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(QuotationPdfDocument(props));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${props.quotation.quoteNumber}.pdf"`,
    },
  });
}
