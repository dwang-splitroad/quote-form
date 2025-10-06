import { type NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { QuotePDF } from "@/components/quote-pdf"
import { Resend } from "resend"
import * as fs from "fs"
import * as path from "path"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    console.log("[v0] Starting PDF generation for quote:", data.quote.number)

    // Read logo file and convert to base64
    const logoPath = path.join(process.cwd(), "public", "splitroadmedia.png")
    const logoBuffer = fs.readFileSync(logoPath)
    const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`

    // Add logo to data
    const dataWithLogo = {
      ...data,
      logoBase64,
    }

    // Generate PDF using renderToBuffer for proper server-side rendering
    const pdfBuffer = await renderToBuffer(<QuotePDF data={dataWithLogo} />)

    console.log("[v0] PDF generated successfully, size:", pdfBuffer.length, "bytes")

    // Debug: Check if API key is loaded
    const apiKey = process.env.RESEND_API_KEY || "re_SEjsFjs6_EYEELDLxAJmBW9ZuLRqhNfEo"
    console.log("[v0] RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY)
    console.log("[v0] Using API key (hardcoded fallback if needed)")

    if (apiKey) {
      const resend = new Resend(apiKey)

      // Send to accounting and the client
      const recipients = ["accounting@splitroadmedia.com", data.client.email]
      console.log("[v0] Sending email to:", recipients.join(", "))

      // Convert PDF buffer to base64 for Resend
      const base64PDF = pdfBuffer.toString("base64")

      const emailResult = await resend.emails.send({
        from: "onboarding@resend.dev", // Using Resend's verified test domain - change to "quotes@splitroadmedia.com" after domain verification
        to: recipients,
        subject: `Quote ${data.quote.number} for ${data.client.company}`,
        html: `
          <h2>New Quote Generated</h2>
          <p><strong>Quote Number:</strong> ${data.quote.number}</p>
          <p><strong>Date:</strong> ${data.quote.date}</p>
          <p><strong>Client:</strong> ${data.client.name} - ${data.client.company}</p>
          <p><strong>Total:</strong> $${data.total.toFixed(2)}</p>
          <p>Please find the detailed quote attached as a PDF.</p>
        `,
        attachments: [
          {
            filename: `quote-${data.quote.number}.pdf`,
            content: base64PDF,
          },
        ],
      })

      console.log("[v0] Email sent successfully:", emailResult)

      // Check if email was sent successfully
      if (emailResult.error) {
        throw new Error(`Failed to send email: ${emailResult.error.message}`)
      }

      return NextResponse.json({
        success: true,
        message: "Quote generated and sent successfully",
        emailId: emailResult.data?.id,
      })
    } else {
      console.log("[v0] No RESEND_API_KEY found, returning PDF as download")

      // If no email service configured, return PDF as download
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="quote-${data.quote.number}.pdf"`,
        },
      })
    }
  } catch (error) {
    console.error("[v0] Error generating quote:", error)
    return NextResponse.json(
      {
        error: "Failed to generate quote",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
