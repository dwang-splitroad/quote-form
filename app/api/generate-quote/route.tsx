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
    console.log("[v0] Current working directory:", process.cwd())

    // Read logo file and convert to base64
    const logoPath = path.join(process.cwd(), "public", "splitroadmedia.png")
    console.log("[v0] Looking for logo at:", logoPath)
    
    if (!fs.existsSync(logoPath)) {
      console.error("[v0] Logo file not found at:", logoPath)
      throw new Error(`Logo file not found at ${logoPath}`)
    }
    
    const logoBuffer = fs.readFileSync(logoPath)
    const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`
    console.log("[v0] Logo loaded successfully, size:", logoBuffer.length, "bytes")

    // Add logo to data
    const dataWithLogo = {
      ...data,
      logoBase64,
    }

    // Generate PDF using renderToBuffer for proper server-side rendering
    console.log("[v0] Starting PDF render...")
    let pdfBuffer
    try {
      pdfBuffer = await renderToBuffer(<QuotePDF data={dataWithLogo} />)
      console.log("[v0] PDF generated successfully, size:", pdfBuffer.length, "bytes")
    } catch (pdfError: any) {
      console.error("[v0] ========== PDF GENERATION ERROR ==========")
      console.error("[v0] PDF error:", pdfError)
      console.error("[v0] PDF error message:", pdfError.message)
      console.error("[v0] PDF error stack:", pdfError.stack)
      console.error("[v0] ==========================================")
      throw new Error(`PDF generation failed: ${pdfError.message || 'Unknown PDF error'}`)
    }

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
        
        try {
          const dropboxResult = await dbx.filesUpload({
            path: dropboxPath,
            contents: pdfBuffer,
            mode: { ".tag": "overwrite" }, // Overwrite if file exists
            autorename: false,
          })
          
          console.log("[v0] PDF uploaded to Dropbox successfully:", dropboxResult.result.path_display)
        } catch (dropboxError: any) {
          console.error("[v0] ========== DROPBOX ERROR ==========")
          console.error("[v0] Error uploading to Dropbox:", dropboxError)
          console.error("[v0] Dropbox error details:", dropboxError.error || dropboxError.message)
          console.error("[v0] Dropbox error status:", dropboxError.status)
          console.error("[v0] =====================================")
          // Continue with email sending even if Dropbox upload fails
        }
      } catch (dropboxConfigError: any) {
        console.error("[v0] ========== DROPBOX CONFIG ERROR ==========")
        console.error("[v0] Dropbox configuration error:", dropboxConfigError)
        console.error("[v0] ===========================================")
        // Continue with email sending even if Dropbox setup fails
      }
    } else {
      console.log("[v0] No DROPBOX_ACCESS_TOKEN found, skipping Dropbox upload")
    }

    // Check if SendGrid API key is loaded
    const apiKey = process.env.SENDGRID_API_KEY
    console.log("[v0] SENDGRID_API_KEY exists:", !!apiKey)
    console.log("[v0] SENDGRID_API_KEY value (first 10 chars):", apiKey ? apiKey.substring(0, 10) : 'NOT SET')

    if (apiKey && apiKey !== 'your_sendgrid_api_key_here') {
      // Configure SendGrid
      sgMail.setApiKey(apiKey)

      // Parse CC emails from comma-separated string and add hardcoded dennis email
      const userCcEmails = data.ccEmails 
        ? data.ccEmails.split(',').map((email: string) => email.trim().toLowerCase()).filter((email: string) => email.length > 0)
        : []
      
      // Add dennis email if not already in user's CC list, and remove any duplicates
      const allCcEmails = ["dennis@splitroadmedia.com", ...userCcEmails]
      const ccEmailList = [...new Set(allCcEmails)] // Remove duplicates
      
      // Also remove any emails that are already in the TO list
      const toEmails = [data.client.email.toLowerCase(), "accounting@splitroadmedia.com", "hello@splitroadmedia.com"]
      const filteredCcList = ccEmailList.filter(email => !toEmails.includes(email.toLowerCase()))

      // Send to client, accounting, and hello (as primary recipients), with CC to dennis and user-specified emails
      console.log("[v0] Sending email to:", data.client.email, "accounting@splitroadmedia.com, and hello@splitroadmedia.com")
      console.log("[v0] CC (before deduplication):", ccEmailList.join(", "))
      console.log("[v0] CC (after deduplication):", filteredCcList.join(", "))

      // Convert PDF buffer to base64 for SendGrid
      const base64PDF = pdfBuffer.toString("base64")

      // Validate all email addresses
      const allEmails = [data.client.email, "accounting@splitroadmedia.com", "hello@splitroadmedia.com", ...filteredCcList]
      console.log("[v0] All email addresses to send to:", allEmails)
      
      const msg = {
        to: [data.client.email, "accounting@splitroadmedia.com", "hello@splitroadmedia.com"],
        cc: filteredCcList.length > 0 ? filteredCcList : undefined,
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

      console.log("[v0] Attempting to send email with config:", {
        to: msg.to,
        cc: msg.cc,
        from: msg.from,
        subject: msg.subject,
        hasAttachment: !!msg.attachments && msg.attachments.length > 0
      })

      let emailResult
      try {
        emailResult = await sgMail.send(msg)
        console.log("[v0] Email sent successfully:", emailResult[0].statusCode)
        console.log("[v0] Email sent to:", allEmails.join(", "))
      } catch (emailError: any) {
        console.error("[v0] ========== SENDGRID ERROR ==========")
        console.error("[v0] SendGrid error:", emailError)
        console.error("[v0] SendGrid error message:", emailError.message)
        console.error("[v0] SendGrid error code:", emailError.code)
        console.error("[v0] SendGrid error status:", emailError.status)
        console.error("[v0] SendGrid error response:", JSON.stringify(emailError.response?.body, null, 2))
        console.error("[v0] Failed email addresses:", allEmails.join(", "))
        console.error("[v0] =======================================")
        
        // Return more detailed error to frontend
        return NextResponse.json(
          {
            error: "Email sending failed",
            details: emailError.response?.body?.errors?.[0]?.message || emailError.message || 'Unknown SendGrid error',
            code: emailError.code,
            status: emailError.status,
            failedEmails: allEmails,
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        message: "Quote generated and sent successfully",
        emailStatusCode: emailResult[0].statusCode,
      })
    } else {
      console.error("[v0] No valid SENDGRID_API_KEY found - cannot send email")
      console.error("[v0] Please set SENDGRID_API_KEY environment variable in production")
      console.error("[v0] Current API key value:", apiKey || 'NOT SET')
      
      // Return error instead of PDF download
      return NextResponse.json(
        {
          error: "Email service not configured",
          details: "SendGrid API key is missing or invalid. Please configure SENDGRID_API_KEY in environment variables.",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] ========== ERROR GENERATING QUOTE ==========")
    console.error("[v0] Error type:", error?.constructor?.name)
    console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    console.error("[v0] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    console.error("[v0] =============================================")
    
    return NextResponse.json(
      {
        error: "Failed to generate quote",
        details: error instanceof Error ? error.message : String(error),
        type: error?.constructor?.name || 'Unknown',
      },
      { status: 500 },
    )
  }
}
