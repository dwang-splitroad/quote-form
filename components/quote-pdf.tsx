import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"

// Define styles for the PDF matching the Split Road Media design
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingBottom: 20,
  },
  logoSection: {
    flexDirection: "column",
  },
  logo: {
    width: 180,
    height: 50,
    marginBottom: 15,
    objectFit: "contain",
  },
  companyInfo: {
    fontSize: 9,
    lineHeight: 1.6,
    color: "#333333",
  },
  quoteButton: {
    backgroundColor: "#4A90E2",
    color: "#ffffff",
    padding: "10 40",
    borderRadius: 8,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  referenceInfo: {
    fontSize: 9,
    lineHeight: 1.6,
    textAlign: "right",
  },
  referenceLabel: {
    fontWeight: "bold",
    color: "#333333",
  },
  quoteFor: {
    marginBottom: 25,
  },
  quoteForTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333333",
  },
  clientInfo: {
    fontSize: 10,
    lineHeight: 1.6,
    color: "#333333",
  },
  table: {
    marginBottom: 0,
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#4A90E2",
    padding: 12,
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 10,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    padding: 12,
    fontSize: 9,
    backgroundColor: "#ffffff",
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    padding: 12,
    fontSize: 9,
    backgroundColor: "#f9f9f9",
  },
  descriptionCol: {
    width: "65%",
    paddingRight: 15,
  },
  qtyCol: {
    width: "15%",
    textAlign: "center",
  },
  totalCol: {
    width: "20%",
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    padding: 12,
    marginTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#333333",
  },
  totalAmount: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#333333",
    textAlign: "right",
  },
  remarks: {
    marginTop: 40,
  },
  remarksTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333333",
  },
  remarksText: {
    fontSize: 9,
    lineHeight: 1.6,
    color: "#333333",
  },
  bullet: {
    marginLeft: 12,
    marginTop: 2,
  },
  departmentTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 5,
    color: "#4A90E2",
  },
})

interface QuotePDFProps {
  data: {
    company: {
      address: string
      phone: string
      email: string
    }
    client: {
      name: string
      company: string
      address: string
      phone: string
      email: string
    }
    quote: {
      number: string
      date: string
    }
    tables: Array<{
      department: string
      lineItems: Array<{
        project: string
        description: string
        qty: string
        total: string
      }>
    }>
    total: number
    logoBase64?: string
  }
}

export function QuotePDF({ data }: QuotePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          {/* Left side: Logo and Company Info */}
          <View style={styles.logoSection}>
            {data.logoBase64 && (
              <Image 
                style={styles.logo}
                src={data.logoBase64}
              />
            )}
            <View style={styles.companyInfo}>
              <Text>{data.company.address.split("\n")[0]}</Text>
              <Text>{data.company.address.split("\n")[1] || data.company.address.split("\n")[0]}</Text>
              <Text>{data.company.phone}</Text>
              <Text>{data.company.email}</Text>
            </View>
          </View>

          {/* Right side: Quote Button and Reference Info */}
          <View style={{ alignItems: "flex-end" }}>
            <View style={styles.quoteButton}>
              <Text>QUOTE</Text>
            </View>
            <View style={styles.referenceInfo}>
              <Text>
                <Text style={styles.referenceLabel}>REFERENCE NO.    </Text>
                {data.quote.number}
              </Text>
              <Text>
                <Text style={styles.referenceLabel}>DATE:    </Text>
                {data.quote.date}
              </Text>
            </View>
          </View>
        </View>

        {/* Quote For Section */}
        <View style={styles.quoteFor}>
          <Text style={styles.quoteForTitle}>Quote for</Text>
          <View style={styles.clientInfo}>
            <Text>{data.client.name}</Text>
            <Text>{data.client.company}</Text>
            <Text>{data.client.address}</Text>
            <Text>{data.client.phone}</Text>
          </View>
        </View>

        {/* Table Section */}
        {data.tables.map((table, tableIndex) => (
          <View key={tableIndex} style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.descriptionCol}>DESCRIPTION</Text>
              <Text style={styles.qtyCol}>QTY</Text>
              <Text style={styles.totalCol}>TOTAL</Text>
            </View>

            {/* Table Rows with alternating backgrounds */}
            {table.lineItems.map((item, itemIndex) => (
              <View key={itemIndex} style={itemIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <View style={styles.descriptionCol}>
                  {item.project && <Text style={{ fontWeight: "bold", marginBottom: 3 }}>{item.project}</Text>}
                  {item.description.split("\n").map((line, i) => (
                    <Text key={i} style={line.trim().startsWith("•") ? styles.bullet : {}}>
                      {line}
                    </Text>
                  ))}
                </View>
                <Text style={styles.qtyCol}>{item.qty}</Text>
                <Text style={styles.totalCol}>{Number.parseFloat(item.total || "0").toFixed(2)}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Total Row */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{data.total.toFixed(2)}</Text>
        </View>

        {/* Remarks Section */}
        <View style={styles.remarks}>
          <Text style={styles.remarksTitle}>Remarks / Payment Instructions:</Text>
          <Text style={styles.remarksText}>
            A 50% deposit is required upfront with the remainder to be paid at the projects completion.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
