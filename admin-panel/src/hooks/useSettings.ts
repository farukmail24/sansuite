import { useQuery } from '@tanstack/react-query'
import { saFetch } from '../App'

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await saFetch('/api/system-admin/settings')
      if (!res.ok) throw new Error('Failed to fetch settings')
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  })
}

export function usePaginationLimit() {
  const { data } = useSettings()
  const limit = data?.pagination_limit ? parseInt(data.pagination_limit, 10) : 10
  return isNaN(limit) ? 10 : limit
}
