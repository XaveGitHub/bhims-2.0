import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from '@/components/ui/field'
import { CheckCircle2, Loader2, ScanLine, UserPlus, Calendar, X } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/kiosk')({
  component: KioskPage,
})

type Mode = 'select' | 'lookup' | 'manual'

// Zod Schemas
const serviceItemSchema = z.object({
  documentTypeId: z.string().min(1, 'Document type is required'),
  purpose: z.string(),
})

function KioskPage() {
  const [mode, setMode] = useState<Mode>('select')
  const [queueNumber, setQueueNumber] = useState<string | null>(null)
  const [manualStep, setManualStep] = useState<1 | 2>(1)
  const [lookupStep, setLookupStep] = useState<1 | 2>(1) // Add lookup step state
  const [searchResidentId, setSearchResidentId] = useState<string>('') // Only query when this is set
  const residentIdInputRef = useRef<HTMLInputElement>(null)

  // Queries
  const activeDocumentTypes = useQuery(api.documentTypes.getActive)
  const submitRequest = useMutation(api.kiosk.submitRequest)

  // Lookup Form (Step 1: Resident ID only)
  const lookupForm = useForm({
    defaultValues: {
      residentId: '',
    },
    onSubmit: async () => {
      // Move to step 2 after resident is found
      if (resident && resident._id) {
        setLookupStep(2)
      }
    },
  })

  // Guest Form (Step 1)
  const guestForm = useForm({
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      suffix: '',
      purok: '',
      birthdate: '',
      sex: 'male' as 'male' | 'female' | 'other',
      seniorOrPwd: 'none' as 'none' | 'senior' | 'pwd' | 'both',
    },
    validators: {
      onSubmit: ({ value }) => {
        const errors: Record<string, string> = {}
        if (!value.firstName?.trim()) errors.firstName = 'First name is required'
        if (!value.lastName?.trim()) errors.lastName = 'Last name is required'
        if (!value.birthdate) errors.birthdate = 'Birthdate is required'
        if (!value.purok?.trim()) errors.purok = 'Purok is required'
        if (!value.sex || (value.sex !== 'male' && value.sex !== 'female' && value.sex !== 'other')) {
          errors.sex = 'Sex is required'
        }
        return Object.keys(errors).length > 0 ? errors : undefined
      },
    },
    onSubmit: async () => {
      // Move to step 2
      setManualStep(2)
    },
  })

  // Service Selection Form (shared for lookup and manual step 2)
  const serviceForm = useForm({
    defaultValues: {
      services: [] as Array<{ documentTypeId: string; purpose: string }>,
    },
    validators: {
      onSubmit: z.object({
        services: z
          .array(serviceItemSchema)
          .min(1, 'Please select at least one service'),
      }),
    },
    onSubmit: async () => {
      // Submit will be handled separately in handleManualSubmit
    },
  })

  // Get resident based on search button click (saves queries - only searches when user clicks)
  const residentIdToSearch = searchResidentId.trim().toUpperCase()
  const isValidFormat = /^BH-\d+$/.test(residentIdToSearch)
  const shouldQuery = isValidFormat && residentIdToSearch.length >= 7 // BH-00001 is minimum (7 chars: BH-00001)
  
  // Only query when searchResidentId is set (after clicking Search button)
  const resident = useQuery(
    api.residents.getByResidentId,
    shouldQuery ? { residentId: residentIdToSearch } : 'skip'
  )
  
  // Handle search button click
  const handleSearch = () => {
    const currentId = lookupForm.state.values.residentId.trim().toUpperCase()
    const currentIsValid = /^BH-\d+$/.test(currentId) && currentId.length >= 7
    
    if (!currentId) {
      toast.error('Please enter a Resident ID')
      return
    }
    
    if (!currentIsValid) {
      toast.error('Invalid Resident ID format. Please use format: BH-00001')
      return
    }
    
    // Set the search ID to trigger the query
    setSearchResidentId(currentId)
  }

  // Auto-focus resident ID input on mount (for barcode scanner)
  useEffect(() => {
    if (mode === 'lookup' && residentIdInputRef.current) {
      residentIdInputRef.current.focus()
    }
  }, [mode])

  // Reset forms when mode changes
  useEffect(() => {
    lookupForm.reset()
    guestForm.reset()
    serviceForm.reset()
    setManualStep(1)
    setLookupStep(1)
    setSearchResidentId('') // Reset search when mode changes
  }, [mode])

  // Calculate total price (for both lookup and manual flows)
  const totalPrice =
    activeDocumentTypes?.reduce((total, docType) => {
      const cert = serviceForm.state.values.services.find(
        (c) => c.documentTypeId === docType._id
      )
      if (cert) {
        return total + docType.price
      }
      return total
    }, 0) || 0

  const handleLookupSubmit = async () => {
    // Validate service form
    await serviceForm.handleSubmit()
    if (!serviceForm.state.isValid) return

    // Check if resident was searched and found
    if (!searchResidentId || !resident || !resident._id) {
      toast.error('Please search for a resident first')
      return
    }

    // Validate purposes for services that require them
    const selectedServices = serviceForm.state.values.services
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service')
      return
    }

    for (const cert of selectedServices) {
      const docType = activeDocumentTypes?.find((dt) => dt._id === cert.documentTypeId)
      if (docType?.requiresPurpose && !cert.purpose.trim()) {
        toast.error(`Purpose is required for ${docType.name}`)
        return
      }
    }

    try {
      const items = selectedServices.map((cert) => ({
        documentTypeId: cert.documentTypeId as any,
        purpose: cert.purpose.trim(),
      }))

      const result = await submitRequest({
        residentId: resident._id,
        items,
      })

      setQueueNumber(result.queueNumber)

      // Auto-return after 15 seconds
      setTimeout(() => {
        setQueueNumber(null)
        lookupForm.reset()
        serviceForm.reset()
        setLookupStep(1)
        setSearchResidentId('') // Reset search
        if (residentIdInputRef.current) {
          residentIdInputRef.current.focus()
        }
      }, 15000)
    } catch (error) {
      console.error('Error submitting request:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to submit request'}`)
    }
  }

  const handleManualSubmit = async () => {
    await serviceForm.handleSubmit()
    if (!serviceForm.state.isValid) return

    // Validate purposes for services that require them
    const selectedServices = serviceForm.state.values.services
    for (const cert of selectedServices) {
      const docType = activeDocumentTypes?.find((dt) => dt._id === cert.documentTypeId)
      if (docType?.requiresPurpose && !cert.purpose.trim()) {
        return // Error will be shown in UI
      }
    }

    try {
      const guestData = guestForm.state.values
      const birthdateTimestamp = new Date(guestData.birthdate).getTime()

      const items = selectedServices.map((cert) => ({
        documentTypeId: cert.documentTypeId as any,
        purpose: cert.purpose.trim(),
      }))

      const result = await submitRequest({
        guestResident: {
          firstName: guestData.firstName,
          middleName: guestData.middleName || '',
          lastName: guestData.lastName,
          suffix: guestData.suffix || undefined,
          sex: guestData.sex,
          birthdate: birthdateTimestamp,
          purok: guestData.purok,
          seniorOrPwd: guestData.seniorOrPwd || 'none',
        },
        items,
      })

      setQueueNumber(result.queueNumber)

      // Auto-return after 15 seconds
      setTimeout(() => {
        setQueueNumber(null)
        guestForm.reset()
        serviceForm.reset()
        setManualStep(1)
      }, 15000)
    } catch (error) {
      console.error('Error submitting request:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to submit request'}`)
    }
  }

  const handleReset = () => {
    setQueueNumber(null)
    setMode('select')
    lookupForm.reset()
    guestForm.reset()
    serviceForm.reset()
    setManualStep(1)
    setLookupStep(1)
    setSearchResidentId('')
  }

  // Calculate age from birthdate
  const calculateAge = (birthdate: string): number | null => {
    if (!birthdate) return null
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Success screen (queue number displayed)
  if (queueNumber) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl">Request Submitted!</CardTitle>
            <CardDescription className="text-lg">Your queue number is:</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="text-6xl font-bold text-blue-600 py-8">{queueNumber}</div>
            <p className="text-gray-600">Please wait for your number to be called.</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={handleReset} size="lg" variant="outline">
                New Request
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              This page will automatically return in a few seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Initial selection screen
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-5xl font-bold text-gray-800 mb-2">Barangay Handumanan</h1>
            <p className="text-xl text-gray-600">Document Request Kiosk</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setMode('lookup')}>
              <CardContent className="p-12 text-center">
                <div className="mb-6">
                  <div className="mx-auto w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <ScanLine className="w-10 h-10 text-blue-600" />
                  </div>
                  <CardTitle className="text-2xl mb-2">Scan/Enter ID</CardTitle>
                  <CardDescription className="text-base">
                    I have a Resident ID
                  </CardDescription>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setMode('manual')}>
              <CardContent className="p-12 text-center">
                <div className="mb-6">
                  <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <UserPlus className="w-10 h-10 text-green-600" />
                  </div>
                  <CardTitle className="text-2xl mb-2">New Resident</CardTitle>
                  <CardDescription className="text-base">
                    I don't have a Resident ID
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 relative">
      {/* Close button - top right corner */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMode('select')}
        className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full hover:bg-gray-200"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </Button>

      <div className="max-w-4xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Barangay Handumanan</h1>
          <p className="text-gray-600">
            {mode === 'lookup' ? 'Resident ID Lookup' : 'New Resident Entry'}
          </p>
        </div>

        {mode === 'lookup' && (
          <Card>
            <CardHeader>
              <CardTitle>Resident ID Lookup</CardTitle>
              <CardDescription>
                {lookupStep === 1
                  ? 'Scan barcode or manually enter your Resident ID (BH-00001)'
                  : 'Select services'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lookupStep === 1 ? (
                // STEP 1: Resident ID Lookup
                <form
                  id="lookup-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSearch() // Search on Enter key
                  }}
                >
                  <FieldGroup>
                    {/* Resident ID Input */}
                    <lookupForm.Field
                      name="residentId"
                      validators={{
                        onChange: ({ value }) => {
                          const trimmed = value.trim().toUpperCase()
                          if (!trimmed) {
                            return undefined // Don't show error while typing
                          }
                          // Only validate format if user has typed enough characters
                          if (trimmed.length >= 3 && !/^BH-\d+$/.test(trimmed)) {
                            return { message: 'Invalid format. Use BH-00001 format' }
                          }
                          return undefined
                        },
                        onBlur: ({ value }) => {
                          const trimmed = value.trim().toUpperCase()
                          if (!trimmed) {
                            return { message: 'Resident ID is required' }
                          }
                          if (!/^BH-\d+$/.test(trimmed)) {
                            return { message: 'Invalid format. Use BH-00001 format' }
                          }
                          if (trimmed.length < 7) { // BH-00001 is 7 characters minimum
                            return { message: 'Invalid format. Use BH-00001 format' }
                          }
                          return undefined
                        },
                      }}
                      children={(field) => {
                        const fieldValue = field.state.value.trim().toUpperCase()
                        const fieldIsValidFormat = /^BH-\d+$/.test(fieldValue) && fieldValue.length >= 7
                        const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                        const showFormatError = fieldValue && !fieldIsValidFormat && fieldValue.length >= 3 && field.state.meta.isTouched
                        
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>Resident ID</FieldLabel>
                            <div className="flex gap-2">
                              <Input
                                id={field.name}
                                ref={residentIdInputRef}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => {
                                  field.handleChange(e.target.value.toUpperCase())
                                  setSearchResidentId('') // Clear search result when typing
                                }}
                                placeholder="BH-00001"
                                className="text-xl text-center h-14 font-mono flex-1"
                                autoFocus
                                aria-invalid={isInvalid}
                              />
                              <Button
                                type="button"
                                onClick={handleSearch}
                                disabled={!fieldIsValidFormat}
                                className="h-14 px-6"
                              >
                                <ScanLine className="w-5 h-5 mr-2" />
                                Search
                              </Button>
                            </div>
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            {showFormatError && !isInvalid && (
                              <p className="text-sm text-amber-600 font-medium mt-1">Invalid format. Use BH-00001 format</p>
                            )}
                            {shouldQuery && resident === null && (
                              <p className="text-sm text-red-600 font-medium mt-1">Resident not found</p>
                            )}
                          </Field>
                        )
                      }}
                    />

                    {/* Loading State - Centered Spinner */}
                    {shouldQuery && resident === undefined && (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-16 h-16 animate-spin" />
                      </div>
                    )}

                    {/* Resident Info Display - Clickable card to proceed */}
                    {resident && (
                      <Card 
                        className="bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors border-2 border-blue-200"
                        onClick={() => setLookupStep(2)}
                      >
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span>Resident Information</span>
                            <span className="text-sm font-normal text-blue-600">Click to continue</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <span className="font-semibold">Resident ID:</span> {resident.residentId}
                          </div>
                          <div>
                            <span className="font-semibold">Name:</span>{' '}
                            {resident.firstName} {resident.middleName} {resident.lastName}
                            {(resident as any).suffix && ` ${(resident as any).suffix}`}
                          </div>
                          <div>
                            <span className="font-semibold">Purok:</span> {resident.purok}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </FieldGroup>
                </form>
              ) : (
                // STEP 2: Service Selection
                <form
                  id="service-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleLookupSubmit()
                  }}
                >
                  <FieldGroup>
                    {/* Resident Info Reminder */}
                    {resident && (
                      <Card className="bg-blue-50 mb-6">
                        <CardContent className="pt-4">
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-700">
                              <span className="font-semibold">Resident ID:</span> {resident.residentId}
                            </p>
                            <p className="text-gray-700">
                              <span className="font-semibold">Name:</span>{' '}
                              {resident.firstName} {resident.middleName} {resident.lastName}
                              {(resident as any).suffix && ` ${(resident as any).suffix}`}
                            </p>
                            <p className="text-gray-700">
                              <span className="font-semibold">Purok:</span> {resident.purok}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Service Selection */}
                    {activeDocumentTypes && (
                      <serviceForm.Field
                        name="services"
                        mode="array"
                        children={(field) => {
                          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                          return (
                            <FieldSet>
                              <FieldLegend variant="label">Select Services</FieldLegend>
                              {isInvalid && <FieldError errors={field.state.meta.errors} />}
                              <FieldGroup data-slot="checkbox-group" className="space-y-4 mt-4">
                                {activeDocumentTypes.map((docType) => {
                                  const certIndex = field.state.value.findIndex(
                                    (c: any) => c.documentTypeId === docType._id
                                  )
                                  const isChecked = certIndex !== -1
                                  const cert = isChecked ? field.state.value[certIndex] : null

                                  return (
                                    <div 
                                      key={docType._id} 
                                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                      <Checkbox
                                        id={`cert-${docType._id}`}
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                          const currentCerts = [...field.state.value]
                                          if (checked) {
                                            currentCerts.push({
                                              documentTypeId: docType._id,
                                              purpose: '',
                                            })
                                          } else {
                                            currentCerts.splice(certIndex, 1)
                                          }
                                          field.handleChange(currentCerts)
                                        }}
                                        className="mt-1"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <label
                                          htmlFor={`cert-${docType._id}`}
                                          className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer block mb-1"
                                        >
                                          {docType.name}
                                        </label>
                                        {docType.requiresPurpose && isChecked && (
                                          <Textarea
                                            placeholder="Enter purpose (required)"
                                            value={cert?.purpose || ''}
                                            onChange={(e) => {
                                              const updatedCerts = [...field.state.value]
                                              updatedCerts[certIndex] = {
                                                ...updatedCerts[certIndex],
                                                purpose: e.target.value,
                                              }
                                              field.handleChange(updatedCerts)
                                            }}
                                            className="mt-2"
                                            rows={2}
                                          />
                                        )}
                                      </div>
                                      <div className="text-lg font-bold text-blue-600 whitespace-nowrap">
                                        ₱{(docType.price / 100).toFixed(2)}
                                      </div>
                                    </div>
                                  )
                                })}
                              </FieldGroup>
                            </FieldSet>
                          )
                        }}
                      />
                    )}

                    {/* Total Price */}
                    {serviceForm.state.values.services.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-6 text-center border-2 border-blue-200">
                        <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                        <p className="text-4xl font-bold text-blue-600">
                          ₱{(totalPrice / 100).toFixed(2)}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons - Back and Submit side by side */}
                    <div className="flex gap-4 mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => setLookupStep(1)}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        size="lg"
                        className="flex-1"
                        disabled={serviceForm.state.values.services.length === 0}
                      >
                        {serviceForm.state.isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Request'
                        )}
                      </Button>
                    </div>
                  </FieldGroup>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {mode === 'manual' && (
          <Card>
            <CardHeader>
              <CardTitle>New Resident Entry</CardTitle>
              <CardDescription>
                {manualStep === 1
                  ? 'Enter your personal information'
                  : 'Select services'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {manualStep === 1 ? (
                // STEP 1: Personal Information
                <form
                  id="guest-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    guestForm.handleSubmit()
                  }}
                >
                  <FieldGroup>
                    {/* Date of Request - Auto-filled, not editable */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <FieldLabel className="text-sm text-gray-600">Date of Request</FieldLabel>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">
                          {new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Personal Information */}
                    <FieldSet>
                      <FieldLegend variant="label">Personal Information</FieldLegend>
                      {/* Row 1: First Name, Middle Name, Last Name, Suffix */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <guestForm.Field
                          name="firstName"
                          validators={{
                            onChange: ({ value }) => {
                              if (!value?.trim()) {
                                return { message: 'First name is required' }
                              }
                              return undefined
                            },
                          }}
                          children={(field) => {
                            const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                            return (
                              <Field data-invalid={isInvalid} className="md:col-span-4">
                                <FieldLabel htmlFor={field.name}>
                                  First Name <span className="text-red-500">*</span>
                                </FieldLabel>
                                <Input
                                  id={field.name}
                                  name={field.name}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  className="h-11"
                                  aria-invalid={isInvalid}
                                />
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                              </Field>
                            )
                          }}
                        />
                        <guestForm.Field
                          name="middleName"
                          children={(field) => {
                            return (
                              <Field className="md:col-span-3">
                                <FieldLabel htmlFor={field.name}>Middle Name</FieldLabel>
                                <Input
                                  id={field.name}
                                  name={field.name}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  className="h-11"
                                />
                              </Field>
                            )
                          }}
                        />
                        <guestForm.Field
                          name="lastName"
                          validators={{
                            onChange: ({ value }) => {
                              if (!value?.trim()) {
                                return { message: 'Last name is required' }
                              }
                              return undefined
                            },
                          }}
                          children={(field) => {
                            const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                            return (
                              <Field data-invalid={isInvalid} className="md:col-span-3">
                                <FieldLabel htmlFor={field.name}>
                                  Last Name <span className="text-red-500">*</span>
                                </FieldLabel>
                                <Input
                                  id={field.name}
                                  name={field.name}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  className="h-11"
                                  aria-invalid={isInvalid}
                                />
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                              </Field>
                            )
                          }}
                        />
                        <guestForm.Field
                          name="suffix"
                          children={(field) => (
                            <Field className="md:col-span-2">
                              <FieldLabel htmlFor={field.name}>Suffix</FieldLabel>
                              <select
                                id={field.name}
                                name={field.name}
                                value={field.state.value || ''}
                                onBlur={field.handleBlur}
                                onChange={(e) => {
                                  const value = e.target.value
                                  field.handleChange(value === '' ? '' : value)
                                }}
                                className="mt-1 flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="">None</option>
                                <option value="Jr.">Jr.</option>
                                <option value="Sr.">Sr.</option>
                                <option value="II">II</option>
                                <option value="III">III</option>
                                <option value="IV">IV</option>
                                <option value="V">V</option>
                              </select>
                            </Field>
                          )}
                        />
                      </div>

                      {/* Row 2: Birthday, Sex, Purok */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <guestForm.Field
                          name="birthdate"
                          validators={{
                            onChange: ({ value }) => {
                              if (!value) {
                                return { message: 'Birthday is required' }
                              }
                              return undefined
                            },
                          }}
                          children={(field) => {
                            const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                            return (
                              <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>
                                  Birthday <span className="text-red-500">*</span>
                                </FieldLabel>
                                <Input
                                  id={field.name}
                                  name={field.name}
                                  type="date"
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  className="h-11"
                                  max={new Date().toISOString().split('T')[0]}
                                  aria-invalid={isInvalid}
                                />
                                {field.state.value && (
                                  <FieldDescription>
                                    Age: {calculateAge(field.state.value)} years old
                                  </FieldDescription>
                                )}
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                              </Field>
                            )
                          }}
                        />
                        <guestForm.Field
                          name="sex"
                          validators={{
                            onChange: ({ value }) => {
                              if (!value || (value !== 'male' && value !== 'female' && value !== 'other')) {
                                return { message: 'Sex is required' }
                              }
                              return undefined
                            },
                          }}
                          children={(field) => {
                            const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                            return (
                              <Field data-invalid={isInvalid}>
                                <FieldLabel>
                                  Sex <span className="text-red-500">*</span>
                                </FieldLabel>
                                <RadioGroup
                                  name={field.name}
                                  value={field.state.value}
                                  onValueChange={(val: string) => {
                                    field.handleChange(val as 'male' | 'female' | 'other')
                                  }}
                                  className="flex gap-6 mt-2"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="male" id="sex-male" aria-invalid={isInvalid} />
                                    <FieldLabel htmlFor="sex-male" className="cursor-pointer">Male</FieldLabel>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="female" id="sex-female" aria-invalid={isInvalid} />
                                    <FieldLabel htmlFor="sex-female" className="cursor-pointer">Female</FieldLabel>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="other" id="sex-other" aria-invalid={isInvalid} />
                                    <FieldLabel htmlFor="sex-other" className="cursor-pointer">Other</FieldLabel>
                                  </div>
                                </RadioGroup>
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                              </Field>
                            )
                          }}
                        />
                        <guestForm.Field
                          name="purok"
                          validators={{
                            onChange: ({ value }) => {
                              if (!value?.trim()) {
                                return { message: 'Purok is required' }
                              }
                              return undefined
                            },
                          }}
                          children={(field) => {
                            const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                            return (
                              <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>
                                  Purok <span className="text-red-500">*</span>
                                </FieldLabel>
                                <Input
                                  id={field.name}
                                  name={field.name}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  className="h-11"
                                  aria-invalid={isInvalid}
                                />
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                              </Field>
                            )
                          }}
                        />
                      </div>

                      {/* Row 3: Senior or PWD */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <guestForm.Field
                          name="seniorOrPwd"
                          children={(field) => {
                            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                            return (
                              <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>
                                  Senior or PWD
                                </FieldLabel>
                                <select
                                  id={field.name}
                                  name={field.name}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(e) => field.handleChange(e.target.value as any)}
                                  className="mt-1 flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  aria-invalid={isInvalid}
                                >
                                  <option value="none">None</option>
                                  <option value="senior">Senior</option>
                                  <option value="pwd">PWD</option>
                                  <option value="both">Both (Senior & PWD)</option>
                                </select>
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                              </Field>
                            )
                          }}
                        />
                      </div>
                    </FieldSet>

                    {/* Next Button */}
                    <Button type="submit" form="guest-form" size="lg" className="w-full">
                      Next: Select Services
                    </Button>
                  </FieldGroup>
                </form>
              ) : (
                // STEP 2: Service Selection (same as lookup mode)
                <form
                  id="service-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleManualSubmit()
                  }}
                >
                  <FieldGroup>
                    {activeDocumentTypes && (
                      <serviceForm.Field
                        name="services"
                        mode="array"
                        children={(field) => {
                          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                          return (
                            <FieldSet>
                              <FieldLegend variant="label">Select Services</FieldLegend>
                              {isInvalid && <FieldError errors={field.state.meta.errors} />}
                              <FieldGroup data-slot="checkbox-group" className="space-y-3">
                                {activeDocumentTypes.map((docType) => {
                                  const certIndex = field.state.value.findIndex(
                                    (c) => c.documentTypeId === docType._id
                                  )
                                  const isChecked = certIndex !== -1

                                  return (
                                    <div key={docType._id} className="border rounded-lg p-4 space-y-2">
                                      <Field orientation="horizontal">
                                        <Checkbox
                                          id={`manual-${docType._id}`}
                                          checked={isChecked}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              field.pushValue({
                                                documentTypeId: docType._id,
                                                purpose: '',
                                              })
                                            } else {
                                              if (certIndex > -1) {
                                                field.removeValue(certIndex)
                                              }
                                            }
                                          }}
                                        />
                                        <FieldLabel htmlFor={`manual-${docType._id}`} className="flex-1 cursor-pointer font-medium">
                                          {docType.name}
                                        </FieldLabel>
                                        <span className="text-blue-600 font-semibold">
                                          ₱{(docType.price / 100).toFixed(2)}
                                        </span>
                                      </Field>

                                      {isChecked && certIndex !== -1 && (
                                        <serviceForm.Field
                                          name={`services[${certIndex}].purpose`}
                                          children={(purposeField) => {
                                            const isPurposeInvalid =
                                              purposeField.state.meta.isTouched &&
                                              !purposeField.state.meta.isValid
                                            const docType = activeDocumentTypes?.find(
                                              (dt) => dt._id === field.state.value[certIndex]?.documentTypeId
                                            )
                                            return (
                                              <div className="ml-8">
                                                <Field data-invalid={isPurposeInvalid}>
                                                  <FieldLabel htmlFor={purposeField.name} className="text-sm">
                                                    Purpose {docType?.requiresPurpose && <span className="text-red-500">*</span>}
                                                  </FieldLabel>
                                                  <Textarea
                                                    id={purposeField.name}
                                                    name={purposeField.name}
                                                    value={purposeField.state.value}
                                                    onBlur={purposeField.handleBlur}
                                                    onChange={(e) => purposeField.handleChange(e.target.value)}
                                                    placeholder="Enter purpose for this service..."
                                                    rows={2}
                                                    aria-invalid={isPurposeInvalid}
                                                  />
                                                  {isPurposeInvalid && (
                                                    <FieldError errors={purposeField.state.meta.errors} />
                                                  )}
                                                </Field>
                                              </div>
                                            )
                                          }}
                                        />
                                      )}
                                    </div>
                                  )
                                })}
                              </FieldGroup>
                            </FieldSet>
                          )
                        }}
                      />
                    )}

                    {/* Total Price */}
                    {serviceForm.state.values.services.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-3xl font-bold text-blue-600">
                          ₱{(totalPrice / 100).toFixed(2)}
                        </p>
                      </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="flex-1"
                        onClick={() => setManualStep(1)}
                      >
                        Previous
                      </Button>
                      <Button
                        type="submit"
                        form="service-form"
                        size="lg"
                        className="flex-1"
                        disabled={serviceForm.state.values.services.length === 0}
                      >
                        {serviceForm.state.isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Request'
                        )}
                      </Button>
                    </div>
                  </FieldGroup>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
