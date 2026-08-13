import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatDate, formatDateTime } from "@/lib/format";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1c1917" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  companyName: { fontSize: 16, fontWeight: 700 },
  muted: { color: "#78716c" },
  title: { fontSize: 20, fontWeight: 700, textAlign: "right" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 9, fontWeight: 700, color: "#78716c", marginBottom: 4, textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  table: { borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 4, marginTop: 8 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e7e5e4" },
  tableRowLast: { flexDirection: "row" },
  th: { padding: 6, fontSize: 8, fontWeight: 700, color: "#78716c", textTransform: "uppercase" },
  td: { padding: 6 },
  colDesc: { flex: 3 },
  colNum: { flex: 1, textAlign: "right" },
  signatureBlock: { marginTop: 60, flexDirection: "row", justifyContent: "space-between" },
  signatureLine: { borderTopWidth: 1, borderColor: "#1c1917", width: 200, paddingTop: 4, fontSize: 8 },
});

export type DeliveryReceiptPdfProps = {
  company: { name: string; address: string; phone: string };
  delivery: {
    drNumber: string;
    scheduledDate: string | null;
    deliveredAt: string | Date | null;
    quantity: number;
    driverName: string | null;
    vehicle: string | null;
    receivedByName: string | null;
  };
  jobOrder: { joNumber: string; clientPoNumber: string | null };
  client: { companyName: string; addressLine1: string | null; city: string | null } | null;
  boxSpecName: string | null;
};

export function DeliveryReceiptPdfDocument({ company, delivery, jobOrder, client, boxSpecName }: DeliveryReceiptPdfProps) {
  return (
    <Document title={`Delivery Receipt ${delivery.drNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.address && <Text style={styles.muted}>{company.address}</Text>}
            {company.phone && <Text style={styles.muted}>{company.phone}</Text>}
          </View>
          <View>
            <Text style={styles.title}>DELIVERY RECEIPT</Text>
            <Text style={{ textAlign: "right", marginTop: 4 }}>{delivery.drNumber}</Text>
          </View>
        </View>

        <View style={[styles.row, styles.section]}>
          <View>
            <Text style={styles.sectionTitle}>Deliver to</Text>
            <Text>{client?.companyName ?? "—"}</Text>
            {client?.addressLine1 && <Text style={styles.muted}>{client.addressLine1}</Text>}
            {client?.city && <Text style={styles.muted}>{client.city}</Text>}
          </View>
          <View>
            <Text style={styles.sectionTitle}>Job order</Text>
            <Text>{jobOrder.joNumber}</Text>
            {jobOrder.clientPoNumber && <Text style={styles.muted}>PO {jobOrder.clientPoNumber}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={[styles.th, styles.colDesc]}>Item</Text>
              <Text style={[styles.th, styles.colNum]}>Quantity</Text>
            </View>
            <View style={styles.tableRowLast}>
              <Text style={[styles.td, styles.colDesc]}>{boxSpecName ?? jobOrder.joNumber}</Text>
              <Text style={[styles.td, styles.colNum]}>{delivery.quantity.toLocaleString()} pcs</Text>
            </View>
          </View>
        </View>

        <View style={[styles.row, styles.section]}>
          <View>
            <Text style={styles.sectionTitle}>Scheduled</Text>
            <Text>{formatDate(delivery.scheduledDate)}</Text>
          </View>
          <View>
            <Text style={styles.sectionTitle}>Delivered</Text>
            <Text>{delivery.deliveredAt ? formatDateTime(delivery.deliveredAt) : "Pending"}</Text>
          </View>
          <View>
            <Text style={styles.sectionTitle}>Driver / vehicle</Text>
            <Text>{[delivery.driverName, delivery.vehicle].filter(Boolean).join(" / ") || "—"}</Text>
          </View>
        </View>

        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine}>
            <Text>{delivery.receivedByName ?? " "}</Text>
            <Text style={styles.muted}>Received by (print name &amp; sign)</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text> </Text>
            <Text style={styles.muted}>Date</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
