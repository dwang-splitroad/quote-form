"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface LineItem {
  project: string
  description: string
  qty: string
  total: string
}

interface TableSection {
  department: string
  lineItems: LineItem[]
}

export default function QuoteForm() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Company Info
  const [companyAddress, setCompanyAddress] = useState("824 1/2 Main Street\nRochester, IN 46975")
  const [companyPhone, setCompanyPhone] = useState("844-775-4873")
  const [companyEmail, setCompanyEmail] = useState("hello@splitroadmedia.com")

  // Client Info
  const [clientName, setClientName] = useState("")
  const [clientCompany, setClientCompany] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientEmail, setClientEmail] = useState("")

  // Quote Info
  const [quoteNumber, setQuoteNumber] = useState("")
  const [quoteDate, setQuoteDate] = useState(new Date().toLocaleDateString("en-US"))

  // Function to calculate days since January 1, 1900
  const getDaysSince1900 = () => {
    const epochStart = new Date(1900, 0, 1) // January 1, 1900
    const today = new Date()
    const diffTime = today.getTime() - epochStart.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Auto-generate reference number when client name changes
  useEffect(() => {
    if (clientName.trim()) {
      // Get first 3 letters of client name (uppercase)
      const namePrefix = clientName.trim().substring(0, 3).toUpperCase()
      // Get epoch days
      const epochDays = getDaysSince1900()
      // Generate reference number
      const refNumber = `${namePrefix}${epochDays}`
      setQuoteNumber(refNumber)
    } else {
      setQuoteNumber("")
    }
  }, [clientName])

  // Tables
  const [tables, setTables] = useState<TableSection[]>([
    {
      department: "",
      lineItems: [{ project: "", description: "", qty: "", total: "" }],
    },
  ])

  const [addSecondTable, setAddSecondTable] = useState(false)

  const addLineItem = (tableIndex: number) => {
    const newTables = [...tables]
    newTables[tableIndex].lineItems.push({ project: "", description: "", qty: "", total: "" })
    setTables(newTables)
  }

  const removeLineItem = (tableIndex: number, itemIndex: number) => {
    const newTables = [...tables]
    if (newTables[tableIndex].lineItems.length > 1) {
      newTables[tableIndex].lineItems.splice(itemIndex, 1)
      setTables(newTables)
    }
  }

  const updateLineItem = (tableIndex: number, itemIndex: number, field: keyof LineItem, value: string) => {
    const newTables = [...tables]
    newTables[tableIndex].lineItems[itemIndex][field] = value
    setTables(newTables)
  }

  const updateDepartment = (tableIndex: number, value: string) => {
    const newTables = [...tables]
    newTables[tableIndex].department = value
    setTables(newTables)
  }

  const handleAddSecondTable = (checked: boolean) => {
    setAddSecondTable(checked)
    if (checked && tables.length === 1) {
      setTables([
        ...tables,
        {
          department: "",
          lineItems: [{ project: "", description: "", qty: "", total: "" }],
        },
      ])
    } else if (!checked && tables.length === 2) {
      setTables([tables[0]])
    }
  }

  const calculateTotal = () => {
    return tables.reduce((sum, table) => {
      return (
        sum +
        table.lineItems.reduce((tableSum, item) => {
          return tableSum + (Number.parseFloat(item.total) || 0)
        }, 0)
      )
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/generate-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company: {
            address: companyAddress,
            phone: companyPhone,
            email: companyEmail,
          },
          client: {
            name: clientName,
            company: clientCompany,
            address: clientAddress,
            phone: clientPhone,
            email: clientEmail,
          },
          quote: {
            number: quoteNumber,
            date: quoteDate,
          },
          tables,
          total: calculateTotal(),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success!",
          description: result.message || "Quote has been generated and sent to accounting@splitroadmedia.com and the client",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || "Failed to generate quote")
      }
    } catch (error) {
      console.error("[v0] Error submitting quote:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate quote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pt-4 md:pt-8 lg:pt-12 px-4 pb-8 md:px-8 md:pb-12 lg:px-12 lg:pb-16">
      <Card className="mx-auto max-w-6xl border-2 border-primary/20 shadow-2xl overflow-hidden pt-0">
        <div className="bg-primary text-primary-foreground space-y-2 pt-0 px-6 pb-6 md:px-8 md:pb-8">
          <h1 className="text-4xl font-bold tracking-tight text-balance">Quote Generator</h1>
          <p className="text-primary-foreground/80 text-sm font-medium">
            Create professional quotes for Split Road Media
          </p>
        </div>
        <div className="space-y-10 p-6 md:p-10 lg:p-12">
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Company Info Section */}
            <div className="space-y-6 rounded-xl bg-secondary/50 p-6 md:p-8 border border-primary/10">
              <div className="flex items-center gap-3 border-b border-primary/20 pb-3">
                <div className="h-8 w-1.5 bg-primary rounded-full" />
                <h2 className="text-2xl font-bold text-primary tracking-tight">Company Information</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2.5">
                  <Label htmlFor="companyAddress" className="text-sm font-bold text-primary uppercase tracking-wide">
                    Address
                  </Label>
                  <Textarea
                    id="companyAddress"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="border-2 border-primary/30 bg-card focus:border-primary transition-colors resize-none"
                    rows={3}
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="companyPhone" className="text-sm font-bold text-primary uppercase tracking-wide">
                    Phone
                  </Label>
                  <Input
                    id="companyPhone"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="border-2 border-primary/30 bg-card focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="companyEmail" className="text-sm font-bold text-primary uppercase tracking-wide">
                    Email
                  </Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className="border-2 border-primary/30 bg-card focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Client Info Section */}
            <div className="space-y-6 rounded-xl bg-secondary/50 p-6 md:p-8 border border-primary/10">
              <div className="flex items-center gap-3 border-b border-primary/20 pb-3">
                <div className="h-8 w-1.5 bg-primary rounded-full" />
                <h2 className="text-2xl font-bold text-primary tracking-tight">Client Information</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2.5">
                  <Label htmlFor="clientName" className="text-sm font-bold text-primary uppercase tracking-wide">
                    Name
                  </Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="border-2 border-primary/30 bg-card focus:border-primary transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="clientCompany" className="text-sm font-bold text-primary uppercase tracking-wide">
                    Company
                  </Label>
                  <Input
                    id="clientCompany"
                    value={clientCompany}
                    onChange={(e) => setClientCompany(e.target.value)}
                    className="border-2 border-primary/30 bg-card focus:border-primary transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="clientAddress" className="text-sm font-bold text-primary uppercase tracking-wide">
                    Address
                  </Label>
                  <Input
                    id="clientAddress"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="border-2 border-primary/30 bg-card focus:border-primary transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="clientPhone" className="text-sm font-bold text-primary uppercase tracking-wide">
                    Phone
                  </Label>
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="border-2 border-primary/30 bg-card focus:border-primary transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="clientEmail" className="text-sm font-bold text-primary uppercase tracking-wide">
                    Email
                  </Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="border-2 border-primary/30 bg-card focus:border-primary transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="quoteNumber" className="text-sm font-bold text-primary uppercase tracking-wide">
                    Reference No.
                  </Label>
                  <div
                    id="quoteNumber"
                    className="border-2 border-primary/30 bg-muted/50 px-3 py-2 rounded-md text-base font-mono font-semibold text-primary h-10 flex items-center"
                  >
                    {quoteNumber || "Auto-generated from name"}
                  </div>
                </div>
              </div>
            </div>

            {/* Tables Section */}
            {tables.map((table, tableIndex) => (
              <div
                key={tableIndex}
                className="space-y-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-6 md:p-8 border-2 border-primary/20 shadow-lg"
              >
                <div className="flex items-center gap-3 border-b border-primary/20 pb-3">
                  <div className="h-8 w-1.5 bg-accent rounded-full" />
                  <h2 className="text-2xl font-bold text-primary tracking-tight">
                    {tableIndex === 0 ? "Project Details" : "Additional Project Details"}
                  </h2>
                </div>

                <div className="space-y-2.5">
                  <Label
                    htmlFor={`department-${tableIndex}`}
                    className="text-sm font-bold text-primary uppercase tracking-wide"
                  >
                    Department
                  </Label>
                  <Select value={table.department} onValueChange={(value) => updateDepartment(tableIndex, value)}>
                    <SelectTrigger className="border-2 border-primary/30 bg-card focus:border-primary transition-colors h-12">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Sales:Apparel">Sales: Apparel</SelectItem>
                      <SelectItem value="Sales:Graphic Design">Sales: Graphic Design</SelectItem>
                      <SelectItem value="Sales:Labor">Sales: Labor</SelectItem>
                      <SelectItem value="Sales:Mail Processing">Sales: Mail Processing</SelectItem>
                      <SelectItem value="Sales:Other">Sales: Other</SelectItem>
                      <SelectItem value="Sales:Photography">Sales: Photography</SelectItem>
                      <SelectItem value="Sales:Postage">Sales: Postage</SelectItem>
                      <SelectItem value="Sales:Print">Sales: Print</SelectItem>
                      <SelectItem value="Sales:Returns">Sales: Returns</SelectItem>
                      <SelectItem value="Sales:Shipping">Sales: Shipping</SelectItem>
                      <SelectItem value="Sales:Sign Installation">Sales: Sign Installation</SelectItem>
                      <SelectItem value="Sales:Signs">Sales: Signs</SelectItem>
                      <SelectItem value="Sales:Videography">Sales: Videography</SelectItem>
                      <SelectItem value="Sales:Vinyl">Sales: Vinyl</SelectItem>
                      <SelectItem value="Sales:Vinyl Installation">Sales: Vinyl Installation</SelectItem>
                      <SelectItem value="Sales:Web Development">Sales: Web Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Line Items */}
                <div className="space-y-4">
                  {table.lineItems.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="space-y-4 rounded-lg border-2 border-primary/20 bg-card p-5 shadow-md hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-primary text-lg">Line Item {itemIndex + 1}</h3>
                        {table.lineItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(tableIndex, itemIndex)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-primary">Project</Label>
                          <Input
                            value={item.project}
                            onChange={(e) => updateLineItem(tableIndex, itemIndex, "project", e.target.value)}
                            className="border-2 border-primary/20 bg-background focus:border-primary transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-primary">Quantity</Label>
                          <Input
                            value={item.qty}
                            onChange={(e) => updateLineItem(tableIndex, itemIndex, "qty", e.target.value)}
                            className="border-2 border-primary/20 bg-background focus:border-primary transition-colors"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-primary">Description</Label>
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateLineItem(tableIndex, itemIndex, "description", e.target.value)}
                          className="border-2 border-primary/20 bg-background focus:border-primary transition-colors resize-none"
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-primary">Total ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.total}
                          onChange={(e) => updateLineItem(tableIndex, itemIndex, "total", e.target.value)}
                          className="border-2 border-primary/20 bg-background focus:border-primary transition-colors text-lg font-semibold"
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    onClick={() => addLineItem(tableIndex)}
                    className="w-full border-2 border-primary/30 bg-card text-primary hover:bg-primary hover:text-primary-foreground transition-all h-12 font-semibold"
                    variant="outline"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2"
                    >
                      <path d="M5 12h14" />
                      <path d="M12 5v14" />
                    </svg>
                    Add Line Item
                  </Button>
                </div>
              </div>
            ))}

            {/* Add Second Table Option */}
            <div className="flex items-center space-x-3 rounded-lg bg-secondary/50 p-5 border border-primary/10">
              <Checkbox
                id="addSecondTable"
                checked={addSecondTable}
                onCheckedChange={handleAddSecondTable}
                className="border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label htmlFor="addSecondTable" className="font-semibold text-primary cursor-pointer text-base">
                Add additional project section
              </Label>
            </div>

            {/* Total */}
            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-3 rounded-xl border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5 p-6 shadow-lg">
                <Label className="text-lg font-bold text-primary uppercase tracking-wide">Grand Total</Label>
                <div className="text-4xl font-bold text-primary">${calculateTotal().toFixed(2)}</div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-7 text-lg font-bold shadow-lg hover:shadow-xl transition-all border-2 border-accent/20"
            >
              {loading ? (
                "Generating Quote..."
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                  Generate & Send Quote
                </>
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
