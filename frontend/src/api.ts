import type { AdminLogin, CreateOrder, ParcelOrder, Status } from './types'
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5169'
async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('X-Admin-Token', token)
  const response = await fetch(`${API}${path}`, { ...options, headers })
  if (!response.ok) {
    let message = `Gabim (${response.status})`
    try { message = (await response.json()).message ?? message } catch { /* përgjigje bosh */ }
    throw new Error(response.status === 401 ? 'Fjalëkalimi ose sesioni i adminit nuk është valid.' : message)
  }
  return response.json() as Promise<T>
}
export const loginAdmin = (password: string) => request<AdminLogin>('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) })
export const createOrder = (data: CreateOrder) => request<ParcelOrder>('/api/orders', { method: 'POST', body: JSON.stringify(data) })
export const trackOrder = (number: string) => request<ParcelOrder>(`/api/orders/track/${encodeURIComponent(number)}`)
export const findAdminOrder = (number: string, token: string) => request<ParcelOrder>(`/api/admin/orders/${encodeURIComponent(number)}`, {}, token)
export const updateStatus = (number: string, status: Status, note: string, token: string) => request<ParcelOrder>(`/api/admin/orders/${encodeURIComponent(number)}/status`, { method: 'PUT', body: JSON.stringify({ status, note }) }, token)
