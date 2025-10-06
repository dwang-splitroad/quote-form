# Split Road Media - Quote Form

An internal quote generation system for Split Road Media that creates professional PDF quotes and automatically emails them to accounting and clients.

## Features

✨ **Professional Quote Generation**
- Beautiful, branded PDF quotes with Split Road Media logo
- Multiple line items with detailed descriptions
- Department-specific categorization
- Automatic total calculations

📧 **Automated Email Distribution**
- Sends quotes to `accounting@splitroadmedia.com`
- Automatically emails clients with their quote
- PDF attachment with professional formatting

🎨 **Modern UI**
- Clean, intuitive form interface
- Real-time total calculations
- Support for multiple project sections
- Responsive design

## Tech Stack

- **Framework**: Next.js 15.2.4
- **UI Components**: Radix UI + Custom Components
- **PDF Generation**: @react-pdf/renderer
- **Email Service**: Resend
- **Styling**: Tailwind CSS
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm package manager
- Resend API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/dwang-splitroad/quote-form.git
cd quote-form
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env.local` file in the root directory:
```env
RESEND_API_KEY=your_resend_api_key_here
```

4. Run the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Fill in Company Information** (pre-populated with Split Road Media details)
2. **Enter Client Information**:
   - Name
   - Company
   - Address
   - Phone
   - Email (important - quote will be sent here)
   - Reference Number
3. **Add Project Details**:
   - Select department
   - Add line items with descriptions, quantities, and totals
   - Optionally add a second project section
4. **Generate & Send**:
   - Click the "Generate & Send Quote" button
   - PDF is automatically generated and emailed to accounting and the client

## Department Categories

- Sales
- Sales: Apparel
- Sales: Graphic Design
- Sales: Labor
- Sales: Mail Processing
- Sales: Other
- Sales: Photography
- Sales: Postage
- Sales: Print
- Sales: Returns
- Sales: Shipping
- Sales: Sign Installation
- Sales: Signs
- Sales: Videography
- Sales: Vinyl
- Sales: Vinyl Installation
- Sales: Web Development

## Email Configuration

The system uses Resend for email delivery. By default, it sends from `onboarding@resend.dev`. To use a custom domain:

1. Verify your domain in the Resend dashboard
2. Update the `from` address in `app/api/generate-quote/route.tsx`:
```typescript
from: "quotes@splitroadmedia.com"
```

## Project Structure

```
quote-form/
├── app/
│   ├── api/
│   │   └── generate-quote/
│   │       └── route.tsx          # API endpoint for PDF generation & email
│   ├── page.tsx                    # Main quote form
│   ├── layout.tsx                  # App layout
│   └── globals.css                 # Global styles
├── components/
│   ├── quote-pdf.tsx               # PDF template component
│   ├── theme-provider.tsx          # Theme configuration
│   └── ui/                         # Reusable UI components
├── public/
│   └── splitroadmedia.png          # Company logo
├── .env.local                      # Environment variables (not in repo)
└── package.json
```

## Building for Production

```bash
pnpm build
pnpm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RESEND_API_KEY` | API key from Resend for email sending | Yes |

## License

Internal use only - Split Road Media

## Support

For issues or questions, contact the development team at Split Road Media.

---

**Built with ❤️ for Split Road Media**

