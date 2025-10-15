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
    console.log("[v0] Received quote generation request")
    const data = await request.json()

    console.log("[v0] Starting PDF generation for quote:", data.quote.number)
    console.log("[v0] Environment check - SENDGRID_API_KEY:", !!process.env.SENDGRID_API_KEY)
    console.log("[v0] Environment check - DROPBOX_ACCESS_TOKEN:", !!process.env.DROPBOX_ACCESS_TOKEN)

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
            ".tag": "namespace_id",
            "namespace_id": dropboxRootNamespace
          })
        }
        
        const dbx = new Dropbox(dbxConfig)
        const dropboxPath = `/Quotes/quote-${data.quote.number}.pdf`
        
        console.log("[v0] Uploading PDF to Dropbox:", dropboxPath)
        console.log("[v0] Dropbox config - Team Member ID:", dropboxTeamMemberId)
        console.log("[v0] Dropbox config - Root Namespace:", dropboxRootNamespace)
        
        const dropboxResult = await dbx.filesUpload({
          path: dropboxPath,
          contents: pdfBuffer,
          mode: { ".tag": "overwrite" }, // Overwrite if file exists
          autorename: false,
        })
        
        console.log("[v0] PDF uploaded to Dropbox successfully:", dropboxResult.result.path_display)
      } catch (dropboxError: any) {
        console.error("[v0] Error uploading to Dropbox:", dropboxError)
        console.error("[v0] Dropbox error details:", dropboxError.error || dropboxError.message)
        console.error("[v0] Dropbox error status:", dropboxError.status)
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

      // Parse CC emails from comma-separated string and add hardcoded dennis email
      const userCcEmails = data.ccEmails 
        ? data.ccEmails.split(',').map((email: string) => email.trim()).filter((email: string) => email.length > 0)
        : []
      const ccEmailList = ["dennis@splitroadmedia.com", ...userCcEmails]

      // Send to client and accounting (as primary recipients), with CC to dennis and user-specified emails
      console.log("[v0] Sending email to:", data.client.email, "and accounting@splitroadmedia.com")
      console.log("[v0] CC:", ccEmailList.join(", "))

      // Convert PDF buffer to base64 for SendGrid
      const base64PDF = pdfBuffer.toString("base64")

      const msg = {
        to: [data.client.email, "accounting@splitroadmedia.com"],
        cc: ccEmailList,
        from: "hello@splitroadmedia.com",
        subject: `Quote ${data.quote.number} for ${data.client.company}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff;">
              <!-- Logo Header -->
              <div style="text-align: center; padding: 40px 20px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <img src="${logoBase64}" alt="Split Road Media" style="max-width: 220px; height: auto; display: block; margin: 0 auto;" />
              </div>
              
              <!-- Main Content -->
              <div style="padding: 40px 30px;">
                <!-- Title -->
                <h1 style="color: #333333; font-size: 28px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.3;">
                  Quote for ${data.client.company}
                </h1>
                <p style="color: #666666; font-size: 16px; margin: 0 0 30px 0; line-height: 1.5;">
                  Thank you for your interest in our services. Please find your personalized quote below.
                </p>
                
                <!-- Quote Details Box -->
                <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px 25px; margin-bottom: 30px; border-radius: 4px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666666; font-size: 14px; font-weight: 600;">Quote Number:</td>
                      <td style="padding: 8px 0; color: #333333; font-size: 14px; text-align: right; font-weight: 700;">${data.quote.number}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666666; font-size: 14px; font-weight: 600;">Date:</td>
                      <td style="padding: 8px 0; color: #333333; font-size: 14px; text-align: right;">${data.quote.date}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666666; font-size: 14px; font-weight: 600;">Client:</td>
                      <td style="padding: 8px 0; color: #333333; font-size: 14px; text-align: right;">${data.client.name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666666; font-size: 14px; font-weight: 600;">Company:</td>
                      <td style="padding: 8px 0; color: #333333; font-size: 14px; text-align: right;">${data.client.company}</td>
                    </tr>
                  </table>
                </div>
                
                <!-- Project Summary -->
                <h2 style="color: #333333; font-size: 20px; font-weight: 700; margin: 0 0 20px 0;">
                  Project Overview
                </h2>
                <div style="background-color: #ffffff; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                  ${data.tables.map((table, index) => `
                    <div style="margin-bottom: ${index < data.tables.length - 1 ? '25px' : '0'};">
                      <h3 style="color: #667eea; font-size: 16px; font-weight: 700; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e9ecef;">
                        ${table.department}
                      </h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        ${table.lineItems.map(item => `
                          <tr style="border-bottom: 1px solid #f1f3f5;">
                            <td style="padding: 12px 0; color: #333333; font-size: 14px; vertical-align: top;">
                              ${item.project ? `<strong>${item.project}</strong><br/>` : ''}
                              <span style="color: #666666; font-size: 13px;">${item.description.split('\n').slice(0, 2).join(' ').substring(0, 100)}${item.description.length > 100 ? '...' : ''}</span>
                            </td>
                            <td style="padding: 12px 0; color: #333333; font-size: 14px; text-align: right; white-space: nowrap; vertical-align: top;">
                              <strong>Qty: ${item.qty}</strong>
                            </td>
                          </tr>
                        `).join('')}
                      </table>
                    </div>
                  `).join('')}
                </div>
                
                <!-- Attachment Notice -->
                <div style="background-color: #f8f9fa; border: 2px solid #667eea; border-radius: 8px; padding: 25px; text-align: center; margin-bottom: 30px;">
                  <p style="color: #000000; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">
                    📎 Complete Quote Details
                  </p>
                  <p style="color: #000000; font-size: 14px; margin: 0;">
                    Please see the attached PDF for the complete itemized quote with pricing and terms.
                  </p>
                </div>
                
                <!-- Contact Section -->
                <div style="text-align: center; padding-top: 20px; border-top: 2px solid #e9ecef;">
                  <p style="color: #000000; font-size: 14px; margin: 0 0 15px 0;">
                    Questions about your quote? We're here to help!
                  </p>
                  <p style="color: #333333; font-size: 14px; margin: 0 0 5px 0;">
                    <strong>📧 Email:</strong> <a href="mailto:hello@splitroadmedia.com" style="color: #667eea; text-decoration: none;">hello@splitroadmedia.com</a>
                  </p>
                  <p style="color: #333333; font-size: 14px; margin: 0;">
                    <strong>📞 Phone:</strong> <a href="tel:${data.company.phone}" style="color: #667eea; text-decoration: none;">${data.company.phone}</a>
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="color: #999999; font-size: 12px; margin: 0 0 8px 0;">
                  ${data.company.address.split('\n').join(' • ')}
                </p>
                <p style="color: #999999; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} Split Road Media. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
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
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      {
        error: "Failed to generate quote",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
