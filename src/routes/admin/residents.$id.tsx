import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useAuth } from '@clerk/tanstack-react-start'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Edit, Save, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export const Route = createFileRoute('/admin/residents/$id')({
  component: ResidentProfilePage,
})

function ResidentProfilePage() {
  return <ResidentProfileContent />
}

function ResidentProfileContent() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  const shouldSkipQuery = !authLoaded || !isSignedIn
  const resident = useQuery(
    api.residents.get,
    shouldSkipQuery ? 'skip' : { id: id as any }
  )
  const transactions = useQuery(
    api.documentRequests.listByResident,
    shouldSkipQuery || !resident ? 'skip' : { residentId: resident._id, limit: 100 }
  )
  const updateResident = useMutation(api.residents.update)

  // Initialize edited data when resident loads
  useEffect(() => {
    if (resident && !editedData && !isEditing) {
      setEditedData({
        block: (resident as any).block || '',
        lot: (resident as any).lot || '',
        phase: (resident as any).phase || '',
        firstName: resident.firstName,
        middleName: resident.middleName,
        lastName: resident.lastName,
        suffix: (resident as any).suffix || '',
        sex: resident.sex,
        birthdate: format(new Date(resident.birthdate), 'yyyy-MM-dd'),
        purok: resident.purok,
        civilStatus: (resident as any).civilStatus || 'Single',
        educationalAttainment: (resident as any).educationalAttainment || 'No Grade',
        occupation: (resident as any).occupation || '',
        employmentStatus: (resident as any).employmentStatus || 'Unemployed',
        isResidentVoter: (resident as any).isResidentVoter ?? false,
        isRegisteredVoter: (resident as any).isRegisteredVoter ?? false,
        isOFW: (resident as any).isOFW ?? false,
        isPWD: (resident as any).isPWD ?? false,
        isOSY: (resident as any).isOSY ?? false,
        isSeniorCitizen: (resident as any).isSeniorCitizen ?? false,
        isSoloParent: (resident as any).isSoloParent ?? false,
        isIP: (resident as any).isIP ?? false,
        isMigrant: (resident as any).isMigrant ?? false,
        contactNumber: (resident as any).contactNumber || '',
        email: (resident as any).email || '',
        estimatedMonthlyIncome: (resident as any).estimatedMonthlyIncome || undefined,
        primarySourceOfLivelihood: (resident as any).primarySourceOfLivelihood || '',
        tenureStatus: (resident as any).tenureStatus || '',
        housingType: (resident as any).housingType || 'Owned',
        constructionType: (resident as any).constructionType || 'Light',
        sanitationMethod: (resident as any).sanitationMethod || '',
        religion: (resident as any).religion || '',
        debilitatingDiseases: (resident as any).debilitatingDiseases || '',
        isBedBound: (resident as any).isBedBound ?? undefined,
        isWheelchairBound: (resident as any).isWheelchairBound ?? false,
        isDialysisPatient: (resident as any).isDialysisPatient ?? false,
        isCancerPatient: (resident as any).isCancerPatient ?? false,
        isNationalPensioner: (resident as any).isNationalPensioner ?? false,
        isLocalPensioner: (resident as any).isLocalPensioner ?? false,
        status: resident.status,
      })
    }
  }, [resident, editedData, isEditing])

  const handleSave = async () => {
    if (!resident || !editedData || isSaving) return
    setIsSaving(true)
    try {
      const birthdateTimestamp = new Date(editedData.birthdate).getTime()
      await updateResident({
        id: resident._id,
        block: editedData.block,
        lot: editedData.lot,
        phase: editedData.phase,
        firstName: editedData.firstName,
        middleName: editedData.middleName,
        lastName: editedData.lastName,
        suffix: editedData.suffix || undefined,
        sex: editedData.sex,
        birthdate: birthdateTimestamp,
        purok: editedData.purok,
        civilStatus: editedData.civilStatus,
        educationalAttainment: editedData.educationalAttainment,
        occupation: editedData.occupation || undefined,
        employmentStatus: editedData.employmentStatus,
        isResidentVoter: editedData.isResidentVoter,
        isRegisteredVoter: editedData.isRegisteredVoter,
        isOFW: editedData.isOFW,
        isPWD: editedData.isPWD,
        isOSY: editedData.isOSY,
        isSeniorCitizen: editedData.isSeniorCitizen,
        isSoloParent: editedData.isSoloParent,
        isIP: editedData.isIP,
        isMigrant: editedData.isMigrant,
        contactNumber: editedData.contactNumber || undefined,
        email: editedData.email || undefined,
        estimatedMonthlyIncome: editedData.estimatedMonthlyIncome || undefined,
        primarySourceOfLivelihood: editedData.primarySourceOfLivelihood || undefined,
        tenureStatus: editedData.tenureStatus || undefined,
        housingType: editedData.housingType,
        constructionType: editedData.constructionType,
        sanitationMethod: editedData.sanitationMethod || undefined,
        religion: editedData.religion || undefined,
        debilitatingDiseases: editedData.debilitatingDiseases || undefined,
        isBedBound: editedData.isBedBound,
        isWheelchairBound: editedData.isWheelchairBound,
        isDialysisPatient: editedData.isDialysisPatient,
        isCancerPatient: editedData.isCancerPatient,
        isNationalPensioner: editedData.isNationalPensioner,
        isLocalPensioner: editedData.isLocalPensioner,
        status: editedData.status,
      })
      toast.success('Resident updated successfully')
      setIsEditing(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update resident')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (resident) {
      setEditedData({
        block: (resident as any).block || '',
        lot: (resident as any).lot || '',
        phase: (resident as any).phase || '',
        firstName: resident.firstName,
        middleName: resident.middleName,
        lastName: resident.lastName,
        suffix: (resident as any).suffix || '',
        sex: resident.sex,
        birthdate: format(new Date(resident.birthdate), 'yyyy-MM-dd'),
        purok: resident.purok,
        civilStatus: (resident as any).civilStatus || 'Single',
        educationalAttainment: (resident as any).educationalAttainment || 'No Grade',
        occupation: (resident as any).occupation || '',
        employmentStatus: (resident as any).employmentStatus || 'Unemployed',
        isResidentVoter: (resident as any).isResidentVoter ?? false,
        isRegisteredVoter: (resident as any).isRegisteredVoter ?? false,
        isOFW: (resident as any).isOFW ?? false,
        isPWD: (resident as any).isPWD ?? false,
        isOSY: (resident as any).isOSY ?? false,
        isSeniorCitizen: (resident as any).isSeniorCitizen ?? false,
        isSoloParent: (resident as any).isSoloParent ?? false,
        isIP: (resident as any).isIP ?? false,
        isMigrant: (resident as any).isMigrant ?? false,
        contactNumber: (resident as any).contactNumber || '',
        email: (resident as any).email || '',
        estimatedMonthlyIncome: (resident as any).estimatedMonthlyIncome || undefined,
        primarySourceOfLivelihood: (resident as any).primarySourceOfLivelihood || '',
        tenureStatus: (resident as any).tenureStatus || '',
        housingType: (resident as any).housingType || 'Owned',
        constructionType: (resident as any).constructionType || 'Light',
        sanitationMethod: (resident as any).sanitationMethod || '',
        religion: (resident as any).religion || '',
        debilitatingDiseases: (resident as any).debilitatingDiseases || '',
        isBedBound: (resident as any).isBedBound ?? undefined,
        isWheelchairBound: (resident as any).isWheelchairBound ?? false,
        isDialysisPatient: (resident as any).isDialysisPatient ?? false,
        isCancerPatient: (resident as any).isCancerPatient ?? false,
        isNationalPensioner: (resident as any).isNationalPensioner ?? false,
        isLocalPensioner: (resident as any).isLocalPensioner ?? false,
        status: resident.status,
      })
    }
    setIsEditing(false)
  }

  const calculateAge = (birthdate: number): number => {
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'resident':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'deceased':
        return 'destructive'
      case 'moved':
        return 'outline'
      default:
        return 'outline'
    }
  }

  if (!authLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (resident === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!resident) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <Card className="max-w-md">
                <CardContent className="pt-6">
                  <p className="text-center text-gray-600">Resident not found</p>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => navigate({ to: '/admin/dashboard' })}
                  >
                    Back to Dashboard
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
          <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate({ to: '/admin/dashboard' })}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Resident Profile</h1>
                <p className="text-gray-600 mt-1">Resident ID: {resident.residentId}</p>
              </div>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Resident Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resident Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* First Name */}
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      {isEditing ? (
                        <Input
                          id="firstName"
                          value={editedData?.firstName || ''}
                          onChange={(e) =>
                            setEditedData({ ...editedData, firstName: e.target.value })
                          }
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-sm font-medium">{resident.firstName}</p>
                      )}
                    </div>

                    {/* Middle Name */}
                    <div>
                      <Label htmlFor="middleName">Middle Name</Label>
                      {isEditing ? (
                        <Input
                          id="middleName"
                          value={editedData?.middleName || ''}
                          onChange={(e) =>
                            setEditedData({ ...editedData, middleName: e.target.value })
                          }
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-sm font-medium">{resident.middleName || "-"}</p>
                      )}
                    </div>

                    {/* Last Name */}
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      {isEditing ? (
                        <Input
                          id="lastName"
                          value={editedData?.lastName || ''}
                          onChange={(e) =>
                            setEditedData({ ...editedData, lastName: e.target.value })
                          }
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-sm font-medium">
                          {resident.lastName}
                          {(resident as any).suffix && ` ${(resident as any).suffix}`}
                        </p>
                      )}
                    </div>

                    {/* Suffix */}
                    <div>
                      <Label htmlFor="suffix">Suffix (Optional)</Label>
                      {isEditing ? (
                        <Input
                          id="suffix"
                          placeholder="e.g., Jr., Sr., III"
                          value={editedData?.suffix || ''}
                          onChange={(e) =>
                            setEditedData({ ...editedData, suffix: e.target.value })
                          }
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-sm font-medium">
                          {(resident as any).suffix || '-'}
                        </p>
                      )}
                    </div>

                    {/* Birthdate */}
                    <div>
                      <Label htmlFor="birthdate">Birthdate</Label>
                      {isEditing ? (
                        <Input
                          id="birthdate"
                          type="date"
                          value={editedData?.birthdate || ''}
                          onChange={(e) =>
                            setEditedData({ ...editedData, birthdate: e.target.value })
                          }
                          className="mt-1"
                          max={new Date().toISOString().split('T')[0]}
                        />
                      ) : (
                        <div className="mt-1">
                          <p className="text-sm font-medium">
                            {format(new Date(resident.birthdate), 'MMMM dd, yyyy')}
                          </p>
                          <p className="text-xs text-gray-500">
                            Age: {calculateAge(resident.birthdate)} years old
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Gender */}
                    <div>
                      <Label htmlFor="sex">Gender</Label>
                      {isEditing ? (
                        <select
                          id="sex"
                          value={editedData?.sex || 'male'}
                          onChange={(e) =>
                            setEditedData({ ...editedData, sex: e.target.value })
                          }
                          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      ) : (
                        <p className="mt-1 text-sm font-medium capitalize">{resident.sex}</p>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <Label htmlFor="status">Status</Label>
                      {isEditing ? (
                        <select
                          id="status"
                          value={editedData?.status || 'resident'}
                          onChange={(e) =>
                            setEditedData({ ...editedData, status: e.target.value })
                          }
                          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="resident">Resident</option>
                          <option value="pending">Pending</option>
                          <option value="deceased">Deceased</option>
                          <option value="moved">Moved</option>
                        </select>
                      ) : (
                        <div className="mt-1">
                          <Badge variant={getStatusBadgeVariant(resident.status)}>
                            {resident.status}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Block */}
                    <div>
                      <Label htmlFor="block">Block</Label>
                      {isEditing ? (
                        <Input
                          id="block"
                          value={editedData?.block || ''}
                          onChange={(e) =>
                            setEditedData({ ...editedData, block: e.target.value })
                          }
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-sm font-medium">{(resident as any).block || "-"}</p>
                      )}
                    </div>

                    {/* Lot */}
                    <div>
                      <Label htmlFor="lot">Lot</Label>
                      {isEditing ? (
                        <Input
                          id="lot"
                          value={editedData?.lot || ''}
                          onChange={(e) =>
                            setEditedData({ ...editedData, lot: e.target.value })
                          }
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-sm font-medium">{(resident as any).lot || "-"}</p>
                      )}
                    </div>

                    {/* Phase */}
                    <div>
                      <Label htmlFor="phase">Phase</Label>
                      {isEditing ? (
                        <Input
                          id="phase"
                          value={editedData?.phase || ''}
                          onChange={(e) =>
                            setEditedData({ ...editedData, phase: e.target.value })
                          }
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-sm font-medium">{(resident as any).phase || "-"}</p>
                      )}
                    </div>

                    {/* Purok */}
                    <div>
                      <Label htmlFor="purok">Purok</Label>
                      {isEditing ? (
                        <Input
                          id="purok"
                          value={editedData?.purok || ''}
                          onChange={(e) =>
                            setEditedData({ ...editedData, purok: e.target.value })
                          }
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-sm font-medium">{resident.purok}</p>
                      )}
                    </div>

                    {/* Senior Citizen */}
                    <div>
                      <Label htmlFor="isSeniorCitizen">Senior Citizen</Label>
                      {isEditing ? (
                        <select
                          id="isSeniorCitizen"
                          value={editedData?.isSeniorCitizen ? 'yes' : 'no'}
                          onChange={(e) =>
                            setEditedData({ ...editedData, isSeniorCitizen: e.target.value === 'yes' })
                          }
                          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      ) : (
                        <p className="mt-1 text-sm font-medium">
                          {(resident as any).isSeniorCitizen ? 'Yes' : 'No'}
                        </p>
                      )}
                    </div>

                    {/* PWD */}
                    <div>
                      <Label htmlFor="isPWD">PWD</Label>
                      {isEditing ? (
                        <select
                          id="isPWD"
                          value={editedData?.isPWD ? 'yes' : 'no'}
                          onChange={(e) =>
                            setEditedData({ ...editedData, isPWD: e.target.value === 'yes' })
                          }
                          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      ) : (
                        <p className="mt-1 text-sm font-medium">
                          {(resident as any).isPWD ? 'Yes' : 'No'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction History */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions === undefined ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No transactions found for this resident
                    </p>
                  ) : (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Request Number</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Total Price</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((transaction: Doc<'documentRequests'>) => (
                            <TableRow key={transaction._id}>
                              <TableCell className="font-mono text-sm">
                                {transaction.requestNumber}
                              </TableCell>
                              <TableCell>
                                {format(new Date(transaction.requestedAt), 'MMM dd, yyyy h:mm a')}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(transaction.status)}>
                                  {transaction.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                ₱{(transaction.totalPrice / 100).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Info Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Resident ID</Label>
                    <p className="font-mono text-sm font-medium">{resident.residentId}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Created</Label>
                    <p className="text-sm">
                      {format(new Date(resident.createdAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Last Updated</Label>
                    <p className="text-sm">
                      {format(new Date(resident.updatedAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Transactions</Label>
                    <p className="text-sm font-medium">
                      {transactions === undefined ? '-' : transactions.length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  )
}
