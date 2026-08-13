import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getDeliveryDetail } from "@/lib/data/job-orders";
import { getSettings } from "@/lib/settings/get-settings";
import { DeliveryReceiptPdfDocument } from "@/lib/pdf/delivery-receipt-pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [detail, settings] = await Promise.all([getDeliveryDetail(user, id), getSettings(user)]);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    DeliveryReceiptPdfDocument({
      company: { name: settings.companyName, address: settings.companyAddress, phone: settings.companyPhone },
      delivery: {
        drNumber: detail.delivery.drNumber,
        scheduledDate: detail.delivery.scheduledDate,
        deliveredAt: detail.delivery.deliveredAt,
        quantity: detail.delivery.quantity,
        driverName: detail.delivery.driverName,
        vehicle: detail.delivery.vehicle,
        receivedByName: detail.delivery.receivedByName,
      },
      jobOrder: { joNumber: detail.jobOrder.joNumber, clientPoNumber: detail.jobOrder.clientPoNumber },
      client: detail.client
        ? { companyName: detail.client.companyName, addressLine1: detail.client.addressLine1, city: detail.client.city }
        : null,
      boxSpecName: detail.boxSpec?.name ?? null,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${detail.delivery.drNumber}.pdf"`,
    },
  });
}
