import { type NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { QuotePDF } from "@/components/quote-pdf"
import sgMail from "@sendgrid/mail"
import { Dropbox } from "dropbox"
import fetch from "node-fetch"
import * as fs from "fs"
import * as path from "path"

// Force Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    // Upload PDF to Dropbox
    const dropboxToken = process.env.DROPBOX_ACCESS_TOKEN
    const dropboxTeamMemberId = process.env.DROPBOX_TEAM_MEMBER_ID
    const dropboxRootNamespace = process.env.DROPBOX_ROOT_NAMESPACE
    
    if (dropboxToken) {
      try {
        const dbxConfig: any = { 
          accessToken: dropboxToken,
          fetch: fetch as any // Provide fetch implementation for Node.js
        }
        
        // For Dropbox Business teams, use selectUser with team_member_id
        if (dropboxTeamMemberId) {
          dbxConfig.selectUser = dropboxTeamMemberId
        }
        
        // Use team root namespace to access team space folders
        if (dropboxRootNamespace) {
          dbxConfig.pathRoot = JSON.stringify({
            ".tag": "root",
            "root": dropboxRootNamespace
          })
        }
        
        const dbx = new Dropbox(dbxConfig)
        const dropboxPath = `/Jobs/Quotes/quote-${data.quote.number}.pdf`
        
        console.log("[v0] Uploading PDF to Dropbox:", dropboxPath)
        
        const dropboxResult = await dbx.filesUpload({
          path: dropboxPath,
          contents: pdfBuffer,
          mode: { ".tag": "overwrite" }, // Overwrite if file exists
          autorename: false,
        })
        
        console.log("[v0] PDF uploaded to Dropbox successfully:", dropboxResult.result.path_display)
      } catch (dropboxError) {
        console.error("[v0] Error uploading to Dropbox:", dropboxError)
        // Continue with email sending even if Dropbox upload fails
      }
    } else {
      console.log("[v0] No DROPBOX_ACCESS_TOKEN found, skipping Dropbox upload")
    }

    // Check if SendGrid API key is loaded
    const apiKey = process.env.SENDGRID_API_KEY
    console.log("[v0] SENDGRID_API_KEY exists:", !!apiKey)

    if (apiKey) {
      // Configure SendGrid
      sgMail.setApiKey(apiKey)

      // Send to dennis@splitroadmedia.com and dwang0816@gmail.com
      const recipients = ["dennis@splitroadmedia.com", "dwang0816@gmail.com"]
      console.log("[v0] Sending email to:", recipients.join(", "))

      // Convert PDF buffer to base64 for SendGrid
      const base64PDF = pdfBuffer.toString("base64")

      const msg = {
        to: recipients,
        from: "hello@splitroadmedia.com",
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
            content: base64PDF,
            filename: `quote-${data.quote.number}.pdf`,
            type: "application/pdf",
            disposition: "attachment",
          },
        ],
      }

      const emailResult = await sgMail.send(msg)

      console.log("[v0] Email sent successfully:", emailResult[0].statusCode)

      return NextResponse.json({
        success: true,
        message: "Quote generated and sent successfully",
        emailStatusCode: emailResult[0].statusCode,
      })
    } else {
      console.log("[v0] No SENDGRID_API_KEY found, returning PDF as download")

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
