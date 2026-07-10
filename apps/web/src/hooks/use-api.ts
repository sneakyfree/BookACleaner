import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ==================== CLEANERS ====================

export function useSearchCleaners(params: {
  location?: string
  service?: string
  minRating?: number
  page?: number
}) {
  return useQuery({
    queryKey: ['cleaners', 'search', params],
    queryFn: () => api.cleaners.search(params),
  })
}

export function useCleaner(id: string) {
  return useQuery({
    queryKey: ['cleaners', id],
    queryFn: () => api.cleaners.getById(id),
    enabled: !!id,
  })
}

export function useCleanerAvailability(id: string, date?: string) {
  return useQuery({
    queryKey: ['cleaners', id, 'availability', date],
    queryFn: () => api.cleaners.getAvailability(id, date),
    enabled: !!id,
  })
}

export function useCleanerReviews(id: string, page = 1) {
  return useQuery({
    queryKey: ['cleaners', id, 'reviews', page],
    queryFn: () => api.cleaners.getReviews(id, page),
    enabled: !!id,
  })
}

// ==================== PROPERTIES ====================

export function useProperties() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: () => api.properties.list(),
  })
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: ['properties', id],
    queryFn: () => api.properties.getById(id),
    enabled: !!id,
  })
}

export function useCreateProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => api.properties.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}

export function useUpdateProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.properties.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['properties', id] })
    },
  })
}

export function useDeleteProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.properties.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}

// ==================== JOBS ====================

export function useJobs(status?: string) {
  return useQuery({
    queryKey: ['jobs', status],
    queryFn: () => api.jobs.list(status),
  })
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: () => api.jobs.getById(id),
    enabled: !!id,
  })
}

export function useCreateJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => api.jobs.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export function useJobEstimate() {
  return useMutation({
    mutationFn: (data: { propertyId: string; services: string[]; addOns?: string[] }) =>
      api.jobs.estimate(data),
  })
}

export function useAcceptJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.jobs.accept(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['jobs', id] })
    },
  })
}

export function useDeclineJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.jobs.decline(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['jobs', id] })
    },
  })
}

export function useCompleteJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.jobs.complete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['jobs', id] })
    },
  })
}

// ==================== REVIEWS ====================

export function useReviews() {
  return useQuery({
    queryKey: ['reviews'],
    queryFn: () => api.reviews.list(),
  })
}

export function useCreateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => api.reviews.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
    },
  })
}

export function useRespondToReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      api.reviews.respond(id, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
    },
  })
}

// ==================== MESSAGES ====================

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.messages.getConversations(),
  })
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: () => api.messages.getConversation(id),
    enabled: !!id,
    refetchInterval: 5000, // Poll for new messages
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversationId,
      content,
      attachments,
    }: {
      conversationId: string
      content: string
      attachments?: string[]
    }) => api.messages.send(conversationId, content, attachments),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] })
    },
  })
}

// ==================== NOTIFICATIONS ====================

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: ['notifications', page],
    queryFn: () => api.notifications.list(page),
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.notifications.unreadCount(),
    refetchInterval: 30_000, // Poll every 30s
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.notifications.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// ==================== FEED ====================

export function useFeed(page = 1) {
  return useQuery({
    queryKey: ['feed', page],
    queryFn: () => api.feed.list(page),
  })
}

export function useLikeFeedItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.feed.like(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

export function useCreateFeedItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => api.feed.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

export function useDeleteFeedItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.feed.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

// ==================== PAYMENTS ====================

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: (data: { amount: number; jobId: string; capture_method?: string }) =>
      api.payments.createIntent(data),
  })
}

export function useReleasePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (jobId: string) => api.payments.release(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export function useCreateConnectedAccount() {
  return useMutation({
    mutationFn: (data: { email: string; businessName?: string }) =>
      api.payments.createConnectedAccount(data),
  })
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: (plan: string) => api.payments.createCheckoutSession(plan),
  })
}

// ==================== ADMIN ====================

export function useAdminStats(timeRange?: string) {
  return useQuery({
    queryKey: ['admin', 'stats', timeRange],
    queryFn: () => api.admin.stats(timeRange),
  })
}

export function useAdminUsers(page = 1, role?: string, status?: string, q?: string) {
  return useQuery({
    queryKey: ['admin', 'users', page, role, status, q],
    queryFn: () => api.admin.users(page, role, status, q),
  })
}

export function useAdminTimeseries(range = '30d') {
  return useQuery({
    queryKey: ['admin', 'timeseries', range],
    queryFn: () => api.admin.timeseries(range),
  })
}

export function useAdminJobs(page = 1, status?: string) {
  return useQuery({
    queryKey: ['admin', 'jobs', page, status],
    queryFn: () => api.admin.jobs(page, status),
  })
}

export function useAdminDisputes(page = 1, status?: string) {
  return useQuery({
    queryKey: ['admin', 'disputes', page, status],
    queryFn: () => api.admin.disputes(page, status),
  })
}

export function useResolveDispute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.admin.resolveDispute(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] })
    },
  })
}

export function useAdminVerifications(page = 1, status?: string) {
  return useQuery({
    queryKey: ['admin', 'verifications', page, status],
    queryFn: () => api.admin.verifications(page, status),
  })
}

export function useAdminApprovals(page = 1, status?: string) {
  return useQuery({
    queryKey: ['admin', 'approvals', page, status],
    queryFn: () => api.admin.approvals(page, status),
  })
}

export function useApproveItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => api.admin.approveItem(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'approvals'] })
    },
  })
}

export function useRejectItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.admin.rejectItem(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'approvals'] })
    },
  })
}

export function useAdminAuditLog(page = 1, action?: string) {
  return useQuery({
    queryKey: ['admin', 'audit', page, action],
    queryFn: () => api.admin.auditLog(page, action),
  })
}

export function useAdminModeration(page = 1, status?: string) {
  return useQuery({
    queryKey: ['admin', 'moderation', page, status],
    queryFn: () => api.admin.moderation(page, status),
  })
}

// ==================== VERIFICATION ====================

export function useVerificationStatus() {
  return useQuery({
    queryKey: ['verification', 'status'],
    queryFn: () => api.verification.getStatus(),
  })
}

export function useSubmitVerification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { type: string; document_url: string }) => api.verification.submit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification'] })
    },
  })
}

export function useSendPhoneCode() {
  return useMutation({
    mutationFn: (phone: string) => api.verification.sendPhoneCode(phone),
  })
}

export function useVerifyPhone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (code: string) => api.verification.verifyPhone(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification'] })
    },
  })
}

// ==================== BIDS ====================

export function useBids(status?: string) {
  return useQuery({
    queryKey: ['bids', status],
    queryFn: () => api.bids.list(status),
  })
}

export function useCreateBid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { job_id: string; amount: number; message?: string }) =>
      api.bids.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export function useAcceptBid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.bids.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export function useWithdrawBid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.bids.withdraw(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] })
    },
  })
}

// ==================== CLEANER PROFILE ====================

export function useMyCleanerProfile() {
  return useQuery({
    queryKey: ['cleaner', 'me'],
    queryFn: () => api.cleanerProfile.getMe(),
  })
}

export function useUpdateCleanerProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => api.cleanerProfile.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaner', 'me'] })
    },
  })
}

export function useMyAvailability() {
  return useQuery({
    queryKey: ['cleaner', 'availability'],
    queryFn: () => api.cleanerProfile.getAvailability(),
  })
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (schedule: any[]) => api.cleanerProfile.updateAvailability(schedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaner', 'availability'] })
    },
  })
}

export function useMyPortfolio() {
  return useQuery({
    queryKey: ['cleaner', 'portfolio'],
    queryFn: () => api.cleanerProfile.getPortfolio(),
  })
}

export function useAddPortfolioPhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ url, caption }: { url: string; caption?: string }) =>
      api.cleanerProfile.addPhoto(url, caption),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaner', 'portfolio'] })
    },
  })
}

export function useDeletePortfolioPhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (photoId: string) => api.cleanerProfile.deletePhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaner', 'portfolio'] })
    },
  })
}

// ==================== SCHEDULING ====================

export function useOptimizeRoute() {
  return useMutation({
    mutationFn: (date?: string) => api.scheduling.optimizeRoute(date),
  })
}

export function useScheduleGaps(startDate?: string) {
  return useQuery({
    queryKey: ['schedule', 'gaps', startDate],
    queryFn: () => api.scheduling.getGaps(startDate),
    enabled: !!startDate,
  })
}

export function useSyncCalendar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (propertyId: string) => api.scheduling.syncCalendar(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

// ==================== SPONSORED ====================

export function useSponsoredListings() {
  return useQuery({
    queryKey: ['sponsored'],
    queryFn: () => api.sponsored.list(),
  })
}

export function useCreateSponsoredListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => api.sponsored.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsored'] })
    },
  })
}

// ==================== AGREEMENTS ====================

export function useAgreements() {
  return useQuery({
    queryKey: ['agreements'],
    queryFn: () => api.agreements.list(),
  })
}

export function useAcceptAgreement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (jobId: string) => api.agreements.accept(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreements'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}
