import { AttendanceLedgerView } from '@/features/attendance/components/attendance-ledger-view'

export const metadata = {
  title: 'Attendance Ledger & Statistics | VERIS Student Portal',
  description: 'View your university event attendance history, check-in records, and participation statistics.',
}

export default function AttendancePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AttendanceLedgerView />
    </div>
  )
}
