export type Status = 'Processing' | 'Dispatched' | 'InTransit' | 'Arrived' | 'Delivered' | 'Cancelled'
export type StatusUpdate = { status: Status; note: string; updatedAtUtc: string }
export type ParcelOrder = {
  trackingNumber: string; customerName: string; customerEmail: string; productDescription: string
  originAddress: string; destinationAddress: string
  originLatitude: number; originLongitude: number; destinationLatitude: number; destinationLongitude: number
  status: Status; createdAtUtc: string; updates: StatusUpdate[]
}
export type CreateOrder = Pick<ParcelOrder, 'customerName' | 'customerEmail' | 'productDescription' | 'originAddress' | 'destinationAddress'>
export type AdminLogin = { token: string }
export const statuses: Status[] = ['Processing', 'Dispatched', 'InTransit', 'Arrived', 'Delivered', 'Cancelled']
export const statusLabels: Record<Status, string> = {
  Processing: 'Në përpunim', Dispatched: 'E nisur', InTransit: 'Në transport', Arrived: 'Ka arritur', Delivered: 'E dorëzuar', Cancelled: 'E anuluar',
}
export const statusProgress: Record<Status, number> = { Processing: 0, Dispatched: .12, InTransit: .52, Arrived: .9, Delivered: 1, Cancelled: .35 }
