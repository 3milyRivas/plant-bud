import { DateTime } from 'luxon'
import Follow from '#models/follow'
import GardenerProfile from '#models/gardener_profile'
import NurseryProfile from '#models/nursery_profile'
import PostComment from '#models/post_comment'
import PostReaction from '#models/post_reaction'
import ProfileReview from '#models/profile_review'
import ServiceRequest from '#models/service_request'
import User from '#models/user'

type NotificationActor = {
  displayName: string
  username: string
  avatarUrl: string | null
  initial: string
}

export type NotificationItem = {
  type: string
  title: string
  body: string
  actor: NotificationActor | null
  href: string
  thumbnailUrl: string | null
  postPreview?: string
  createdAtHuman: string
  timestamp: number
  isUnread: boolean
}

function formatActor(user: User): NotificationActor {
  const displayName = user.accountProfile?.displayName || user.fullName || user.username

  return {
    displayName,
    username: user.username,
    avatarUrl: user.accountProfile?.avatarUrl || user.profilePicture || null,
    initial: user.initials,
  }
}

function relativeTime(date: DateTime) {
  return date.toRelative({ style: 'short' }) || date.toFormat('MMM d')
}

function serviceCopy(status: ServiceRequest['status'], viewerRole: 'client' | 'gardener') {
  if (viewerRole === 'gardener') {
    return {
      title: 'New service request',
      body: 'A client is waiting for your response.',
    }
  }

  const copy: Record<string, { title: string; body: string }> = {
    accepted: {
      title: 'Request accepted',
      body: 'Your gardener accepted the service request.',
    },
    scheduled: {
      title: 'Service scheduled',
      body: 'Your gardening service now has a scheduled visit.',
    },
    completed: {
      title: 'Service completed',
      body: 'The gardening service was completed successfully.',
    },
    cancelled: {
      title: 'Request cancelled',
      body: 'The gardening service request was cancelled.',
    },
  }

  return (
    copy[status] || {
      title: 'Service request updated',
      body: 'There is a new update on your gardening service.',
    }
  )
}

export async function getNotificationItems(user: User, limit = 30): Promise<NotificationItem[]> {
  await user.load('accountProfile')
  const seenTimestamp = user.accountProfile?.notificationsSeenAt?.toMillis() || 0
  const clearedTimestamp = user.accountProfile?.notificationsClearedAt?.toMillis() || 0

  const [follows, comments, reactions, gardenerProfile, nurseryProfile] = await Promise.all([
    Follow.query()
      .where('followingId', user.id)
      .preload('follower', (query) => query.preload('accountProfile'))
      .orderBy('createdAt', 'desc')
      .limit(12),
    PostComment.query()
      .whereNot('userId', user.id)
      .whereHas('post', (query) => query.where('userId', user.id))
      .preload('user', (query) => query.preload('accountProfile'))
      .preload('post')
      .orderBy('createdAt', 'desc')
      .limit(12),
    PostReaction.query()
      .whereNot('userId', user.id)
      .whereHas('post', (query) => query.where('userId', user.id))
      .preload('user', (query) => query.preload('accountProfile'))
      .preload('post')
      .orderBy('createdAt', 'desc')
      .limit(12),
    GardenerProfile.query().where('userId', user.id).first(),
    NurseryProfile.query().where('userId', user.id).first(),
  ])

  const reviewQuery = gardenerProfile
    ? ProfileReview.query().where('gardenerProfileId', gardenerProfile.id)
    : nurseryProfile
      ? ProfileReview.query().where('nurseryProfileId', nurseryProfile.id)
      : null

  const [reviews, clientRequests, gardenerRequests] = await Promise.all([
    reviewQuery
      ? reviewQuery
          .preload('reviewer', (query) => query.preload('accountProfile'))
          .orderBy('createdAt', 'desc')
          .limit(10)
      : [],
    ServiceRequest.query()
      .where('clientUserId', user.id)
      .whereNot('status', 'pending')
      .preload('gardenerProfile', (query) =>
        query.preload('user', (userQuery) => userQuery.preload('accountProfile'))
      )
      .orderBy('updatedAt', 'desc')
      .limit(10),
    gardenerProfile
      ? ServiceRequest.query()
          .where('gardenerProfileId', gardenerProfile.id)
          .where('status', 'pending')
          .preload('client', (query) => query.preload('accountProfile'))
          .orderBy('createdAt', 'desc')
          .limit(10)
      : [],
  ])

  const notifications: NotificationItem[] = []
  const add = (item: Omit<NotificationItem, 'isUnread'>) => {
    notifications.push({ ...item, isUnread: item.timestamp > seenTimestamp })
  }

  for (const follow of follows) {
    const actor = formatActor(follow.follower)
    add({
      type: 'follow',
      title: 'New follower',
      body: `${actor.displayName} started following you.`,
      actor,
      href: `/users/${actor.username}`,
      thumbnailUrl: null,
      createdAtHuman: relativeTime(follow.createdAt),
      timestamp: follow.createdAt.toMillis(),
    })
  }

  for (const comment of comments) {
    const actor = formatActor(comment.user)
    add({
      type: 'comment',
      title: 'New comment',
      body: `${actor.displayName} commented on your post.`,
      actor,
      href: `/community#post-${comment.communityPostId}`,
      thumbnailUrl: comment.post.mediaUrl,
      postPreview: comment.body,
      createdAtHuman: relativeTime(comment.createdAt),
      timestamp: comment.createdAt.toMillis(),
    })
  }

  for (const reaction of reactions) {
    const actor = formatActor(reaction.user)
    const saved = reaction.type === 'favorite'
    add({
      type: saved ? 'favorite' : 'like',
      title: saved ? 'Post saved' : 'New like',
      body: `${actor.displayName} ${saved ? 'saved' : 'liked'} your post.`,
      actor,
      href: `/community#post-${reaction.communityPostId}`,
      thumbnailUrl: reaction.post.mediaUrl,
      createdAtHuman: relativeTime(reaction.createdAt),
      timestamp: reaction.createdAt.toMillis(),
    })
  }

  for (const review of reviews) {
    const actor = review.reviewer ? formatActor(review.reviewer) : null
    const reviewerName = actor?.displayName || review.reviewerName || 'A client'
    add({
      type: 'review',
      title: 'New profile review',
      body: `${reviewerName} left you a ${review.rating}-star review.`,
      actor,
      href: '/profile',
      thumbnailUrl: null,
      postPreview: review.comment || undefined,
      createdAtHuman: relativeTime(review.createdAt),
      timestamp: review.createdAt.toMillis(),
    })
  }

  for (const request of clientRequests) {
    const gardener = request.gardenerProfile?.user
    const copy = serviceCopy(request.status, 'client')
    add({
      type: 'service',
      title: copy.title,
      body: copy.body,
      actor: gardener ? formatActor(gardener) : null,
      href: '/requested',
      thumbnailUrl: null,
      createdAtHuman: relativeTime(request.updatedAt),
      timestamp: request.updatedAt.toMillis(),
    })
  }

  for (const request of gardenerRequests) {
    const actor = formatActor(request.client)
    const copy = serviceCopy(request.status, 'gardener')
    add({
      type: 'service',
      title: copy.title,
      body: copy.body,
      actor,
      href: '/requested',
      thumbnailUrl: null,
      createdAtHuman: relativeTime(request.createdAt),
      timestamp: request.createdAt.toMillis(),
    })
  }

  return notifications
    .filter((notification) => notification.timestamp > clearedTimestamp)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}

export async function getUnreadNotificationCount(user: User) {
  const notifications = await getNotificationItems(user, 40)
  return notifications.filter((notification) => notification.isUnread).length
}

export async function getNowBarRequestSummary(user: User) {
  const activeStatuses: ServiceRequest['status'][] = ['pending', 'accepted', 'scheduled']
  let requests: ServiceRequest[] = []

  if (user.role === 'gardener') {
    const profile = await GardenerProfile.query().where('userId', user.id).first()
    requests = profile
      ? await ServiceRequest.query()
          .where('gardenerProfileId', profile.id)
          .whereIn('status', activeStatuses)
          .whereNull('gardenerHiddenAt')
          .orderBy('updatedAt', 'desc')
      : []
  } else if (user.role === 'nursery') {
    const profile = await NurseryProfile.query().where('userId', user.id).first()
    requests = profile
      ? await ServiceRequest.query()
          .where('nurseryProfileId', profile.id)
          .whereIn('status', activeStatuses)
          .whereNull('gardenerHiddenAt')
          .orderBy('updatedAt', 'desc')
      : []
  } else {
    requests = await ServiceRequest.query()
      .where('clientUserId', user.id)
      .whereIn('status', activeStatuses)
      .whereNull('clientHiddenAt')
      .orderBy('updatedAt', 'desc')
  }

  const latest = requests[0] || null
  const labels: Record<ServiceRequest['status'], string> = {
    pending: user.role === 'client' ? 'Waiting for gardener' : 'Needs your response',
    accepted: 'Request accepted',
    scheduled: latest?.scheduledFor
      ? `Visit ${latest.scheduledFor.toFormat('MMM d')}`
      : 'Visit scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }

  return {
    count: requests.length,
    label: latest ? labels[latest.status] : 'No active requests',
    status: latest?.status || 'empty',
    href: '/requested',
  }
}

export async function markNotificationsSeen(user: User) {
  await user.load('accountProfile')
  if (!user.accountProfile) return

  user.accountProfile.notificationsSeenAt = DateTime.now()
  await user.accountProfile.save()
}

export async function clearNotifications(user: User) {
  await user.load('accountProfile')
  if (!user.accountProfile) return

  const now = DateTime.now()
  user.accountProfile.notificationsSeenAt = now
  user.accountProfile.notificationsClearedAt = now
  await user.accountProfile.save()
}
