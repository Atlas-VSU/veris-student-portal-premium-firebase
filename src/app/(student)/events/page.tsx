import { EventsCatalogView } from '@/features/events/components/events-catalog-view'

export const metadata = {
  title: 'University & Org Events | VERIS Student Portal',
  description: 'Browse scheduled, ongoing, and past events across all university organizations.',
}

export default function EventsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <EventsCatalogView />
    </div>
  )
}
