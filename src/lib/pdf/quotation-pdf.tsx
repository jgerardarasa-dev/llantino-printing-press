import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatCentavos, formatDate } from "@/lib/format";

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
  totalsBlock: { marginTop: 12, alignSelf: "flex-end", width: 220 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderColor: "#1c1917" },
  grandTotalLabel: { fontSize: 11, fontWeight: 700 },
  grandTotalValue: { fontSize: 11, fontWeight: 700 },
  termsText: { fontSize: 9, lineHeight: 1.5, color: "#44403c" },
  signatureBlock: { marginTop: 40, flexDirection: "row", justifyContent: "space-between" },
  signatureLine: { borderTopWidth: 1, borderColor: "#1c1917", width: 180, paddingTop: 4, fontSize: 8 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: "#a8a29e", textAlign: "center" },
});

export type QuotationPdfProps = {
  company: { name: string; address: string; tin: string; phone: string; email: string };
  quotation: {
    quoteNumber: string;
    createdAt: string | Date;
    validUntil: string | Date | null;
    notes: string | null;
    terms: string | null;
    version: number;
  };
  client: { companyName: string; addressLine1: string | null; city: string | null; tin: string | null } | null;
  item: {
    description: string;
    quantity: number;
    unitPriceCentavos: number;
    lineTotalCentavos: number;
    leadTimeDays: number | null;
  } | null;
  tiers: { quantity: number; unitPriceCentavos: number }[];
  vatCentavos: number;
  totalCentavos: number;
  preparedByName: string;
  approvedByName?: string | null;
};

export function QuotationPdfDocument({
  company,
  quotation,
  client,
  item,
  tiers,
  vatCentavos,
  totalCentavos,
  preparedByName,
  approvedByName,
}: QuotationPdfProps) {
  return (
    <Document title={`Quotation ${quotation.quoteNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.address && <Text style={styles.muted}>{company.address}</Text>}
            {(company.phone || company.email) && (
              <Text style={styles.muted}>{[company.phone, company.email].filter(Boolean).join(" · ")}</Text>
            )}
            {company.tin && <Text style={styles.muted}>TIN {company.tin}</Text>}
          </View>
          <View>
            <Text style={styles.title}>QUOTATION</Text>
            <Text style={{ textAlign: "right", marginTop: 4 }}>{quotation.quoteNumber}</Text>
            {quotation.version > 1 && <Text style={[styles.muted, { textAlign: "right" }]}>Revision v{quotation.version}</Text>}
          </View>
        </View>

        <View style={[styles.row, styles.section]}>
          <View>
            <Text style={styles.sectionTitle}>Prepared for</Text>
            <Text>{client?.companyName ?? "—"}</Text>
            {client?.addressLine1 && <Text style={styles.muted}>{client.addressLine1}</Text>}
            {client?.city && <Text style={styles.muted}>{client.city}</Text>}
            {client?.tin && <Text style={styles.muted}>TIN {client.tin}</Text>}
          </View>
          <View>
            <Text style={styles.sectionTitle}>Date</Text>
            <Text>{formatDate(quotation.createdAt)}</Text>
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Valid until</Text>
            <Text>{formatDate(quotation.validUntil)}</Text>
          </View>
        </View>

        {item && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Item</Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={[styles.th, styles.colDesc]}>Description</Text>
                <Text style={[styles.th, styles.colNum]}>Qty</Text>
                <Text style={[styles.th, styles.colNum]}>Unit price</Text>
                <Text style={[styles.th, styles.colNum]}>Line total</Text>
              </View>
              <View style={styles.tableRowLast}>
                <Text style={[styles.td, styles.colDesc]}>{item.description}</Text>
                <Text style={[styles.td, styles.colNum]}>{item.quantity.toLocaleString()}</Text>
                <Text style={[styles.td, styles.colNum]}>{formatCentavos(item.unitPriceCentavos)}</Text>
                <Text style={[styles.td, styles.colNum]}>{formatCentavos(item.lineTotalCentavos)}</Text>
              </View>
            </View>
            {item.leadTimeDays != null && (
              <Text style={[styles.muted, { marginTop: 4 }]}>Lead time: {item.leadTimeDays} days</Text>
            )}
          </View>
        )}

        {tiers.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity tiers</Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={[styles.th, styles.colDesc]}>Quantity</Text>
                <Text style={[styles.th, styles.colNum]}>Unit price</Text>
              </View>
              {tiers.map((t, i) => (
                <View key={t.quantity} style={i === tiers.length - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={[styles.td, styles.colDesc]}>{t.quantity.toLocaleString()} pcs</Text>
                  <Text style={[styles.td, styles.colNum]}>{formatCentavos(t.unitPriceCentavos)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{formatCentavos(totalCentavos - vatCentavos)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.muted}>VAT</Text>
            <Text>{formatCentavos(vatCentavos)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCentavos(totalCentavos)}</Text>
          </View>
        </View>

        {quotation.terms && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms</Text>
            <Text style={styles.termsText}>{quotation.terms}</Text>
          </View>
        )}

        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine}>
            <Text>{preparedByName}</Text>
            <Text style={styles.muted}>Prepared by</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text>{approvedByName ?? " "}</Text>
            <Text style={styles.muted}>Approved by</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text> </Text>
            <Text style={styles.muted}>Client acceptance</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This quotation is valid until {formatDate(quotation.validUntil)}. Prices are in Philippine Pesos (PHP).
        </Text>
      </Page>
    </Document>
  );
}
