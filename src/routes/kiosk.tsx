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

export const Route = createFileRoute('/kiosk')({
  component: KioskPage,
})

type Mode = 'select' | 'lookup' | 'manual'

// Zod Schemas
const certificateItemSchema = z.object({
  documentTypeId: z.string().min(1, 'Document type is required'),
  purpose: z.string(),
})

const lookupFormSchema = z.object({
  residentId: z.string().min(1, 'Resident ID is required'),
  certificates: z
    .array(certificateItemSchema)
    .min(1, 'Please select at least one certificate type')
    .refine(
      (items) => {
        // This will be validated dynamically based on documentType requirements
        return items.length > 0
      },
      { message: 'Please select at least one certificate type' }
    ),
})

const guestFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string(),
  lastName: z.string().min(1, 'Last name is required'),
  zone: z.string().min(1, 'Zone is required'),
  purok: z.string().min(1, 'Purok is required'),
  birthdate: z.string().min(1, 'Birthdate is required'),
  sex: z.enum(['male', 'female', 'other'], {
    message: 'Please select sex',
  }),
  address: z.string().min(1, 'Address is required'),
  disability: z.boolean(),
})

function KioskPage() {
  const [mode, setMode] = useState<Mode>('select')
  const [queueNumber, setQueueNumber] = useState<string | null>(null)
  const [manualStep, setManualStep] = useState<1 | 2>(1)
  const residentIdInputRef = useRef<HTMLInputElement>(null)

  // Queries
  const activeDocumentTypes = useQuery(api.documentTypes.getActive)
  const submitRequest = useMutation(api.kiosk.submitRequest)

  // Lookup Form
  const lookupForm = useForm({
    defaultValues: {
      residentId: '',
      certificates: [] as Array<{ documentTypeId: string; purpose: string }>,
    },
    validators: {
      onSubmit: lookupFormSchema,
    },
    onSubmit: async () => {
      // Submit will be handled separately in handleLookupSubmit
    },
  })

  // Guest Form (Step 1)
  const guestForm = useForm({
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      zone: '',
      purok: '',
      birthdate: '',
      sex: 'male' as 'male' | 'female' | 'other',
      address: '',
      disability: false,
    },
    validators: {
      onSubmit: guestFormSchema,
    },
    onSubmit: async () => {
      // Move to step 2
      setManualStep(2)
    },
  })

  // Certificate Selection Form (shared for lookup and manual step 2)
  const certificateForm = useForm({
    defaultValues: {
      certificates: [] as Array<{ documentTypeId: string; purpose: string }>,
    },
    validators: {
      onSubmit: z.object({
        certificates: z
          .array(certificateItemSchema)
          .min(1, 'Please select at least one certificate type'),
      }),
    },
    onSubmit: async () => {
      // Submit will be handled separately in handleManualSubmit
    },
  })

  // Get resident based on lookup form value
  const resident = useQuery(
    api.residents.getByResidentId,
    lookupForm.state.values.residentId.trim()
      ? { residentId: lookupForm.state.values.residentId.trim().toUpperCase() }
      : 'skip'
  )

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
    certificateForm.reset()
    setManualStep(1)
  }, [mode])

  // Calculate total price
  const totalPrice =
    activeDocumentTypes?.reduce((total, docType) => {
      const cert = certificateForm.state.values.certificates.find(
        (c) => c.documentTypeId === docType._id
      )
      if (cert) {
        return total + docType.price
      }
      return total
    }, 0) || 0

  const handleLookupSubmit = async () => {
    await lookupForm.handleSubmit()
    if (!lookupForm.state.isValid) return

    if (!resident?._id) {
      return // Error will be shown in UI
    }

    // Validate certificates with document type requirements
    const selectedCertificates = lookupForm.state.values.certificates
    if (selectedCertificates.length === 0) {
      return
    }

    // Validate purposes for certificates that require them
    for (const cert of selectedCertificates) {
      const docType = activeDocumentTypes?.find((dt) => dt._id === cert.documentTypeId)
      if (docType?.requiresPurpose && !cert.purpose.trim()) {
        return // Error will be shown in UI
      }
    }

    try {
      const items = selectedCertificates.map((cert) => ({
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
    await certificateForm.handleSubmit()
    if (!certificateForm.state.isValid) return

    // Validate purposes for certificates that require them
    const selectedCertificates = certificateForm.state.values.certificates
    for (const cert of selectedCertificates) {
      const docType = activeDocumentTypes?.find((dt) => dt._id === cert.documentTypeId)
      if (docType?.requiresPurpose && !cert.purpose.trim()) {
        return // Error will be shown in UI
      }
    }

    try {
      const guestData = guestForm.state.values
      const birthdateTimestamp = new Date(guestData.birthdate).getTime()

      const items = selectedCertificates.map((cert) => ({
        documentTypeId: cert.documentTypeId as any,
        purpose: cert.purpose.trim(),
      }))

      const result = await submitRequest({
        guestResident: {
          firstName: guestData.firstName,
          middleName: guestData.middleName || '',
          lastName: guestData.lastName,
          sex: guestData.sex,
          birthdate: birthdateTimestamp,
          zone: guestData.zone,
          purok: guestData.purok,
          address: guestData.address,
          disability: guestData.disability,
        },
        items,
      })

      setQueueNumber(result.queueNumber)

      // Auto-return after 15 seconds
      setTimeout(() => {
        setQueueNumber(null)
        guestForm.reset()
        certificateForm.reset()
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
    certificateForm.reset()
    setManualStep(1)
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
                Scan barcode or manually enter your Resident ID (BH-00001)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                id="lookup-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleLookupSubmit()
                }}
              >
                <FieldGroup>
                  {/* Resident ID Input */}
                  <lookupForm.Field
                    name="residentId"
                    children={(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Resident ID</FieldLabel>
                          <Input
                            id={field.name}
                            ref={residentIdInputRef}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                            placeholder="BH-00001"
                            className="text-xl text-center h-14"
                            autoFocus
                            aria-invalid={isInvalid}
                          />
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                          {field.state.value && !resident && (
                            <p className="text-sm text-red-600">Resident not found</p>
                          )}
                        </Field>
                      )
                    }}
                  />

                  {/* Resident Info Display */}
                  {resident && (
                    <Card className="bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-lg">Resident Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <span className="font-semibold">Name:</span>{' '}
                          {resident.firstName} {resident.middleName} {resident.lastName}
                        </div>
                        <div>
                          <span className="font-semibold">Zone:</span> {resident.zone} |{' '}
                          <span className="font-semibold">Purok:</span> {resident.purok}
                        </div>
                        <div>
                          <span className="font-semibold">Address:</span> {resident.address}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Certificate Selection */}
                  {resident && activeDocumentTypes && (
                    <lookupForm.Field
                      name="certificates"
                      mode="array"
                      children={(field) => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                        return (
                          <FieldSet>
                            <FieldLegend variant="label">Select Certificate Types</FieldLegend>
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
                                        id={docType._id}
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
                                      <FieldLabel htmlFor={docType._id} className="flex-1 cursor-pointer font-medium">
                                        {docType.name}
                                      </FieldLabel>
                                      <span className="text-blue-600 font-semibold">
                                        ₱{(docType.price / 100).toFixed(2)}
                                      </span>
                                    </Field>

                                    {isChecked && certIndex !== -1 && (
                                      <lookupForm.Field
                                        name={`certificates[${certIndex}].purpose`}
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
                                                  placeholder="Enter purpose for this certificate..."
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
                  {lookupForm.state.values.certificates.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-3xl font-bold text-blue-600">
                        ₱{(totalPrice / 100).toFixed(2)}
                      </p>
                    </div>
                  )}

                  {/* Submit Button */}
                  {resident && (
                    <Button
                      type="submit"
                      form="lookup-form"
                      size="lg"
                      className="w-full"
                      disabled={lookupForm.state.values.certificates.length === 0}
                    >
                      {lookupForm.state.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Request'
                      )}
                    </Button>
                  )}
                </FieldGroup>
              </form>
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
                  : 'Select certificate types'}
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <guestForm.Field
                          name="firstName"
                          children={(field) => {
                            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                            return (
                              <Field data-invalid={isInvalid}>
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
                              <Field>
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
                          children={(field) => {
                            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                            return (
                              <Field data-invalid={isInvalid}>
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
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <guestForm.Field
                          name="birthdate"
                          children={(field) => {
                            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
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
                          children={(field) => {
                            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
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
                      </div>
                    </FieldSet>

                    {/* Location Information */}
                    <FieldSet>
                      <FieldLegend variant="label">Location Information</FieldLegend>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <guestForm.Field
                          name="zone"
                          children={(field) => {
                            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                            return (
                              <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>
                                  Zone <span className="text-red-500">*</span>
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
                          name="purok"
                          children={(field) => {
                            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
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

                      <guestForm.Field
                        name="address"
                        children={(field) => {
                          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                Complete Address <span className="text-red-500">*</span>
                              </FieldLabel>
                              <Textarea
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                                rows={2}
                                placeholder="Enter your complete address..."
                                aria-invalid={isInvalid}
                              />
                              {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                          )
                        }}
                      />

                      <guestForm.Field
                        name="disability"
                        children={(field) => {
                          return (
                            <Field orientation="horizontal">
                              <Checkbox
                                id={field.name}
                                name={field.name}
                                checked={field.state.value}
                                onCheckedChange={(checked) => field.handleChange(checked === true)}
                              />
                              <FieldLabel htmlFor={field.name} className="cursor-pointer">
                                Person with Disability (PWD)
                              </FieldLabel>
                            </Field>
                          )
                        }}
                      />
                    </FieldSet>

                    {/* Next Button */}
                    <Button type="submit" form="guest-form" size="lg" className="w-full">
                      Next: Select Certificates
                    </Button>
                  </FieldGroup>
                </form>
              ) : (
                // STEP 2: Certificate Selection (same as lookup mode)
                <form
                  id="certificate-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleManualSubmit()
                  }}
                >
                  <FieldGroup>
                    {activeDocumentTypes && (
                      <certificateForm.Field
                        name="certificates"
                        mode="array"
                        children={(field) => {
                          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                          return (
                            <FieldSet>
                              <FieldLegend variant="label">Select Certificate Types</FieldLegend>
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
                                        <certificateForm.Field
                                          name={`certificates[${certIndex}].purpose`}
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
                                                    placeholder="Enter purpose for this certificate..."
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
                    {certificateForm.state.values.certificates.length > 0 && (
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
                        form="certificate-form"
                        size="lg"
                        className="flex-1"
                        disabled={certificateForm.state.values.certificates.length === 0}
                      >
                        {certificateForm.state.isSubmitting ? (
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
