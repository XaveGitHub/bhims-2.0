import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useAuth } from '@clerk/tanstack-react-start'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { RouteGuard } from '@/lib/route-guards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { Plus, Edit, Trash2, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from '@tanstack/react-form'
import { SuperadminSidebarLayout } from '@/components/SuperadminSidebar'
import { SuperadminHeader } from '@/components/SuperadminHeader'

export const Route = createFileRoute('/superadmin/settings')({
  component: SuperadminSettingsPage,
  pendingComponent: () => (
    <SuperadminSidebarLayout>
      <SuperadminHeader />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
            </div>
          </div>
        </div>
      </div>
    </SuperadminSidebarLayout>
  ),
})

function SuperadminSettingsPage() {
  return (
    <RouteGuard allowedRoles={['superadmin']}>
      <SuperadminSidebarLayout>
        <SuperadminHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <SuperadminSettingsContent />
            </div>
          </div>
        </div>
      </SuperadminSidebarLayout>
    </RouteGuard>
  )
}

function SuperadminSettingsContent() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentTypeToEdit, setDocumentTypeToEdit] = useState<Doc<'documentTypes'> | null>(null)
  const [documentTypeToDelete, setDocumentTypeToDelete] = useState<Doc<'documentTypes'> | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ✅ OPTIMIZED: Only skip query when auth is loaded AND user is not signed in
  // This allows Convex to use cached data during navigation transitions
  const shouldSkipQuery = authLoaded && !isSignedIn

  // Get all document types (including inactive)
  const documentTypes = useQuery(
    api.documentTypes.list,
    shouldSkipQuery ? 'skip' : { includeInactive: true }
  )

  const createDocumentType = useMutation(api.documentTypes.create)
  const updateDocumentType = useMutation(api.documentTypes.update)
  const deleteDocumentType = useMutation(api.documentTypes.remove)
  const toggleActive = useMutation(api.documentTypes.toggleActive)

  const refreshQueries = () => {
    // Force refetch by updating a dependency
    // Convex queries will automatically refetch when mutations complete
  }

  const handleToggleActive = async (id: any, currentStatus: boolean) => {
    try {
      await toggleActive({ id, isActive: !currentStatus })
      toast.success(`Document type ${!currentStatus ? 'activated' : 'deactivated'}`)
      refreshQueries()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update document type')
    }
  }

  const handleDelete = async () => {
    if (!documentTypeToDelete || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteDocumentType({ id: documentTypeToDelete._id })
      toast.success('Document type deleted successfully')
      setDeleteDialogOpen(false)
      setDocumentTypeToDelete(null)
      refreshQueries()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete document type')
    } finally {
      setIsDeleting(false)
    }
  }

  // Only show loading spinner on true initial load (when auth is not loaded AND no cached data)
  // This prevents showing loading spinner on every navigation
  const isInitialLoad = !authLoaded && documentTypes === undefined
  
  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage document types and system configuration</p>
      </div>

          {/* Document Types Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Document Types / Services
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage available services
                  </p>
                </div>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document Type
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documentTypes && documentTypes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">No document types configured</p>
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Document Type
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Template File</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Requires Purpose</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documentTypes?.map((docType) => (
                        <TableRow key={docType._id}>
                          <TableCell className="font-medium">{docType.name}</TableCell>
                          <TableCell className="font-mono text-sm">{docType.templateKey}</TableCell>
                          <TableCell>
                            ₱{(docType.price / 100).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>
                            {docType.requiresPurpose ? (
                              <Badge variant="default">Required</Badge>
                            ) : (
                              <Badge variant="outline">Optional</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={docType.isActive}
                                onCheckedChange={() =>
                                  handleToggleActive(docType._id, docType.isActive)
                                }
                              />
                              <Badge variant={docType.isActive ? 'default' : 'secondary'}>
                                {docType.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDocumentTypeToEdit(docType)
                                  setEditDialogOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDocumentTypeToDelete(docType)
                                  setDeleteDialogOpen(true)
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Document Type Dialog */}
          <AddDocumentTypeDialog
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            onCreate={async (args) => {
              try {
                await createDocumentType(args)
                toast.success('Document type created successfully')
                refreshQueries()
              } catch (error: any) {
                toast.error(error.message || 'Failed to create document type')
                throw error // Re-throw to prevent dialog from closing
              }
            }}
          />

          {/* Edit Document Type Dialog */}
          {documentTypeToEdit && (
            <EditDocumentTypeDialog
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              documentType={documentTypeToEdit}
              onUpdate={async (args) => {
                try {
                  await updateDocumentType(args)
                  toast.success('Document type updated successfully')
                  refreshQueries()
                } catch (error: any) {
                  toast.error(error.message || 'Failed to update document type')
                  throw error // Re-throw to prevent dialog from closing
                }
              }}
              onClose={() => setDocumentTypeToEdit(null)}
            />
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Document Type</DialogTitle>
                <DialogDescription>
                  {documentTypeToDelete && (
                    <>
                      Are you sure you want to delete{' '}
                      <strong>{documentTypeToDelete.name}</strong>? This action cannot be undone.
                      <br />
                      <br />
                      <span className="text-sm text-amber-600">
                        Note: Document types that are used in existing requests cannot be deleted.
                        Deactivate them instead.
                      </span>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false)
                    setDocumentTypeToDelete(null)
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
    </>
  )
}

// Add Document Type Dialog Component
function AddDocumentTypeDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (args: {
    name: string
    templateKey: string
    price: number
    requiresPurpose: boolean
    isActive: boolean
  }) => Promise<void>
}) {
  const form = useForm({
    defaultValues: {
      name: '',
      templateKey: '',
      price: '',
      requiresPurpose: false,
      isActive: true,
    },
    onSubmit: async ({ value }) => {
      try {
        const priceInCents = Math.round(parseFloat(value.price) * 100)
        if (isNaN(priceInCents) || priceInCents <= 0) {
          throw new Error('Invalid price')
        }
        await onCreate({
          name: value.name.trim(),
          templateKey: value.templateKey.trim(),
          price: priceInCents,
          requiresPurpose: value.requiresPurpose,
          isActive: value.isActive,
        })
        form.reset()
        onOpenChange(false)
      } catch (error) {
        // Error handling is done in parent component
        throw error
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Document Type</DialogTitle>
          <DialogDescription>
            Create a new document type/service that will be available in the kiosk.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <div className="space-y-4 py-4">
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  if (!value?.trim()) {
                    return { message: 'Document type name is required' }
                  }
                  return undefined
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Document Type Name <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., Barangay Clearance"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            <form.Field
              name="templateKey"
              validators={{
                onChange: ({ value }) => {
                  if (!value?.trim()) {
                    return { message: 'Template file name is required' }
                  }
                  if (!value.trim().endsWith('.pdf')) {
                    return { message: 'Template file must be a PDF (e.g., clearance.pdf)' }
                  }
                  return undefined
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Template File Name <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., clearance.pdf"
                      aria-invalid={isInvalid}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF template file name (stored in /public/templates/services/)
                    </p>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            <form.Field
              name="price"
              validators={{
                onChange: ({ value }) => {
                  if (!value?.trim()) {
                    return { message: 'Price is required' }
                  }
                  const num = parseFloat(value)
                  if (isNaN(num) || num <= 0) {
                    return { message: 'Price must be a positive number' }
                  }
                  return undefined
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Price (₱) <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      type="number"
                      step="0.01"
                      min="0"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="50.00"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            <form.Field
              name="requiresPurpose"
              children={(field) => (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <FieldLabel>Requires Purpose</FieldLabel>
                    <p className="text-xs text-muted-foreground mt-1">
                      If enabled, users must provide a purpose when requesting this document
                    </p>
                  </div>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={field.handleChange}
                  />
                </div>
              )}
            />

            <form.Field
              name="isActive"
              children={(field) => (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <FieldLabel>Active</FieldLabel>
                    <p className="text-xs text-muted-foreground mt-1">
                      Inactive document types won't appear in the kiosk
                    </p>
                  </div>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={field.handleChange}
                  />
                </div>
              )}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset()
                onOpenChange(false)
              }}
              disabled={form.state.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Document Type
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Edit Document Type Dialog Component
function EditDocumentTypeDialog({
  open,
  onOpenChange,
  documentType,
  onUpdate,
  onClose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentType: Doc<'documentTypes'>
  onUpdate: (args: {
    id: any
    name?: string
    templateKey?: string
    price?: number
    requiresPurpose?: boolean
    isActive?: boolean
  }) => Promise<void>
  onClose: () => void
}) {
  const form = useForm({
    defaultValues: {
      name: documentType.name,
      templateKey: documentType.templateKey,
      price: (documentType.price / 100).toFixed(2),
      requiresPurpose: documentType.requiresPurpose,
      isActive: documentType.isActive,
    },
    onSubmit: async ({ value }) => {
      try {
        const priceInCents = Math.round(parseFloat(value.price) * 100)
        if (isNaN(priceInCents) || priceInCents <= 0) {
          throw new Error('Invalid price')
        }
        await onUpdate({
          id: documentType._id,
          name: value.name.trim(),
          templateKey: value.templateKey.trim(),
          price: priceInCents,
          requiresPurpose: value.requiresPurpose,
          isActive: value.isActive,
        })
        onClose()
        onOpenChange(false)
      } catch (error) {
        // Error handling is done in parent component
        throw error
      }
    },
  })

  // Update form when documentType changes
  useEffect(() => {
    form.setFieldValue('name', documentType.name)
    form.setFieldValue('templateKey', documentType.templateKey)
    form.setFieldValue('price', (documentType.price / 100).toFixed(2))
    form.setFieldValue('requiresPurpose', documentType.requiresPurpose)
    form.setFieldValue('isActive', documentType.isActive)
  }, [documentType, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Document Type</DialogTitle>
          <DialogDescription>
            Update document type details and configuration.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <div className="space-y-4 py-4">
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  if (!value?.trim()) {
                    return { message: 'Document type name is required' }
                  }
                  return undefined
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Document Type Name <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., Barangay Clearance"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            <form.Field
              name="templateKey"
              validators={{
                onChange: ({ value }) => {
                  if (!value?.trim()) {
                    return { message: 'Template file name is required' }
                  }
                  if (!value.trim().endsWith('.pdf')) {
                    return { message: 'Template file must be a PDF (e.g., clearance.pdf)' }
                  }
                  return undefined
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Template File Name <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., clearance.pdf"
                      aria-invalid={isInvalid}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF template file name (stored in /public/templates/services/)
                    </p>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            <form.Field
              name="price"
              validators={{
                onChange: ({ value }) => {
                  if (!value?.trim()) {
                    return { message: 'Price is required' }
                  }
                  const num = parseFloat(value)
                  if (isNaN(num) || num <= 0) {
                    return { message: 'Price must be a positive number' }
                  }
                  return undefined
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Price (₱) <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      id={field.name}
                      type="number"
                      step="0.01"
                      min="0"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="50.00"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            <form.Field
              name="requiresPurpose"
              children={(field) => (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <FieldLabel>Requires Purpose</FieldLabel>
                    <p className="text-xs text-muted-foreground mt-1">
                      If enabled, users must provide a purpose when requesting this document
                    </p>
                  </div>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={field.handleChange}
                  />
                </div>
              )}
            />

            <form.Field
              name="isActive"
              children={(field) => (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <FieldLabel>Active</FieldLabel>
                    <p className="text-xs text-muted-foreground mt-1">
                      Inactive document types won't appear in the kiosk
                    </p>
                  </div>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={field.handleChange}
                  />
                </div>
              )}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose()
                onOpenChange(false)
              }}
              disabled={form.state.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Update Document Type
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
