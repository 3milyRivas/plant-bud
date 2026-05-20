import AccountProfile from '#models/account_profile'
import CommunityPost from '#models/community_post'
import Follow from '#models/follow'
import PostComment from '#models/post_comment'
import PostHashtag from '#models/post_hashtag'
import PostPoll from '#models/post_poll'
import PostPollOption from '#models/post_poll_option'
import PostPollVote from '#models/post_poll_vote'
import PostReaction from '#models/post_reaction'
import User from '#models/user'
import { communityCommentValidator, communityPostValidator } from '#validators/community'
import {
  redirectBackWithFormErrors,
  validationExceptionToFieldErrors,
  type FieldErrors,
} from '#services/form_errors'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const communityImageOptions = {
  size: '8mb',
  extnames: ['jpg', 'jpeg', 'png', 'webp'],
}
const communityImageHeaderBytes = 256 * 1024
const maxCommunityImageDimension = 9000
const maxCommunityImagePixels = 40_000_000
const communityMediaFilePattern = /^post-\d+-[0-9a-f-]+\.(jpg|png|webp)$/i

type CommunityImageFile = ReturnType<HttpContext['request']['file']>
type DetectedCommunityImage = {
  extension: 'jpg' | 'png' | 'webp'
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
}
type AuthUser = NonNullable<HttpContext['auth']['user']>

export default class CommunityController {
  async index({ auth, view, session }: HttpContext) {
    const user = auth.user!
    const viewer = await this.getViewerProfile(user)
    const posts = await this.getFeedPosts(user)

    return view.render('pages/community', {
      viewer,
      posts,
      suggestions: await this.getSuggestedUsers(user),
      searchError: session.flashMessages.get('communitySearchError'),
      formErrors: session.flashMessages.get('errors') || {},
      old: session.flashMessages.get('old') || {},
    })
  }

  async favorites({ auth, view }: HttpContext) {
    const user = auth.user!
    const favoritePosts = await this.getFavoritePosts(user)

    return view.render('pages/favorites', {
      viewer: await this.getViewerProfile(user),
      posts: favoritePosts,
      suggestions: await this.getSuggestedUsers(user),
    })
  }

  async showUser({ auth, params, response, view }: HttpContext) {
    const currentUser = auth.user!
    const username = this.normalizeUsernameSearch(params.username)
    const profileUser = await User.query()
      .where('username', username)
      .preload('accountProfile')
      .first()

    if (!profileUser) {
      return response.notFound('Profile not found')
    }

    const isOwnProfile = currentUser.id === profileUser.id
    const [profilePosts, savedPosts, isFollowing, stats] = await Promise.all([
      this.getUserPosts(profileUser, currentUser),
      isOwnProfile ? this.getFavoritePosts(profileUser, currentUser) : [],
      this.isFollowing(currentUser.id, profileUser.id),
      this.getUserStats(profileUser.id),
    ])

    return view.render('pages/community_profile', {
      viewer: await this.getViewerProfile(currentUser),
      profileUser: this.formatUser(profileUser),
      profileStats: stats,
      posts: profilePosts,
      savedPosts,
      isOwnProfile,
      isFollowing,
    })
  }

  async store({ auth, request, response, session, view }: HttpContext) {
    const user = auth.user!

    try {
      const payload = await request.validateUsing(communityPostValidator)
      const imageFile = request.file('image', communityImageOptions)
      const uploadValidation = await this.validateImageUpload(imageFile)
      const pollQuestion = this.cleanOptional(payload.poll_question)
      const pollOptions = this.normalizePollOptions(payload.poll_options)
      const hasPoll = Boolean(pollQuestion || pollOptions.length)
      const body = this.cleanOptional(payload.body) || ''
      const errors: FieldErrors = { ...uploadValidation.errors }

      if (hasPoll && (!pollQuestion || pollOptions.length < 2)) {
        errors.poll_options = ['Add a poll question and at least two options']
      }

      if (hasPoll && imageFile) {
        errors.image = ['Use either an image or a poll, not both in the same post']
      }

      if (!body && !imageFile && !hasPoll) {
        errors.body = ['Write something, add an image, or create a poll']
      }

      if (Object.keys(errors).length) {
        if (this.wantsJson(request)) {
          return response.unprocessableEntity({ ok: false, errors })
        }

        return redirectBackWithFormErrors({ request, response, session }, errors)
      }

      const mediaUrl = await this.storeCommunityImage(imageFile, {
        userId: user.id,
        detectedImage: uploadValidation.detectedImage,
      })
      const post = await CommunityPost.create({
        userId: user.id,
        body: body || pollQuestion || '',
        mediaUrl,
        mediaType: mediaUrl ? 'image' : 'none',
        visibility: payload.visibility || 'public',
      })

      await this.createPostHashtags(post.id, this.extractHashtags(body, payload.hashtags))

      if (pollQuestion && pollOptions.length >= 2) {
        const poll = await PostPoll.create({
          communityPostId: post.id,
          question: pollQuestion,
        })

        await PostPollOption.createMany(
          pollOptions.map((label, index) => ({
            postPollId: poll.id,
            label,
            sortOrder: index + 1,
          }))
        )
      }

      if (this.wantsJson(request)) {
        const [formattedPost, viewer] = await Promise.all([
          this.getSinglePost(post.id, user),
          this.getViewerProfile(user),
        ])

        return response.json({
          ok: true,
          html: await view.render('components/community-post-card', {
            post: formattedPost,
            viewer,
          }),
        })
      }

      session.flash('success', 'Post published')
      return response.redirect().toRoute('community.index')
    } catch (error) {
      const validationErrors = validationExceptionToFieldErrors(error)

      if (validationErrors) {
        if (this.wantsJson(request)) {
          return response.unprocessableEntity({ ok: false, errors: validationErrors })
        }

        return redirectBackWithFormErrors({ request, response, session }, validationErrors)
      }

      throw error
    }
  }

  async toggleReaction({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const type = params.type as 'like' | 'favorite'

    if (type !== 'like' && type !== 'favorite') {
      return response.notFound('Reaction not found')
    }

    const post = await CommunityPost.findOrFail(params.id)
    const existingReaction = await PostReaction.query()
      .where('communityPostId', post.id)
      .where('userId', user.id)
      .where('type', type)
      .first()

    let active = false

    if (existingReaction) {
      await existingReaction.delete()
    } else {
      await PostReaction.create({
        communityPostId: post.id,
        userId: user.id,
        type,
      })
      active = true
    }

    if (this.wantsJson(request)) {
      return response.json({
        ok: true,
        type,
        active,
        counts: await this.getPostReactionCounts(post.id),
      })
    }

    return response.redirect().back()
  }

  async comment({ auth, params, request, response, session }: HttpContext) {
    const user = auth.user!

    try {
      const payload = await request.validateUsing(communityCommentValidator)
      const post = await CommunityPost.findOrFail(params.id)

      const comment = await PostComment.create({
        communityPostId: post.id,
        userId: user.id,
        body: payload.body,
      })

      if (this.wantsJson(request)) {
        const author = await this.getViewerProfile(user)

        return response.json({
          ok: true,
          comment: {
            id: comment.id,
            body: comment.body,
            author: {
              username: author.username,
              displayName: author.displayName,
              avatarUrl: author.avatarUrl,
              initial: author.initial,
            },
          },
          count: await this.countRows('post_comments', 'community_post_id', post.id),
        })
      }

      return response.redirect().back()
    } catch (error) {
      const validationErrors = validationExceptionToFieldErrors(error)

      if (validationErrors) {
        return redirectBackWithFormErrors({ request, response, session }, validationErrors)
      }

      throw error
    }
  }

  async votePoll({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const poll = await PostPoll.findOrFail(params.pollId)
    const option = await PostPollOption.query()
      .where('id', params.optionId)
      .where('postPollId', poll.id)
      .firstOrFail()
    const existingVote = await PostPollVote.query()
      .where('postPollId', poll.id)
      .where('userId', user.id)
      .first()

    if (existingVote) {
      existingVote.postPollOptionId = option.id
      await existingVote.save()
    } else {
      await PostPollVote.create({
        postPollId: poll.id,
        postPollOptionId: option.id,
        userId: user.id,
      })
    }

    if (this.wantsJson(request)) {
      await poll.load('options', (optionQuery) => {
        optionQuery.orderBy('sortOrder', 'asc').preload('votes')
      })

      return response.json({
        ok: true,
        poll: this.formatPoll(poll, user.id),
      })
    }

    return response.redirect().back()
  }

  async search({ request, response, session }: HttpContext) {
    const username = this.normalizeUsernameSearch(request.input('username'))

    if (!username) {
      session.flash('communitySearchError', 'Write a username to search')
      return response.redirect().toRoute('community.index')
    }

    const user =
      (await User.findBy('username', username)) ||
      (await User.query().where('username', 'like', `${username}%`).orderBy('username').first())

    if (!user) {
      session.flash('communitySearchError', `No profile found for @${username}`)
      return response.redirect().toRoute('community.index')
    }

    return response.redirect(`/users/${user.username}`)
  }

  async toggleFollow({ auth, params, request, response }: HttpContext) {
    const currentUser = auth.user!
    const targetUser = await User.findByOrFail(
      'username',
      this.normalizeUsernameSearch(params.username)
    )

    if (targetUser.id === currentUser.id) {
      return response.redirect().back()
    }

    const existingFollow = await Follow.query()
      .where('followerId', currentUser.id)
      .where('followingId', targetUser.id)
      .first()

    let following = false

    if (existingFollow) {
      await existingFollow.delete()
    } else {
      await Follow.create({
        followerId: currentUser.id,
        followingId: targetUser.id,
      })
      following = true
    }

    if (this.wantsJson(request)) {
      return response.json({
        ok: true,
        following,
        followers: await this.countRows('follows', 'following_id', targetUser.id),
      })
    }

    return response.redirect().back()
  }

  async media({ params, response }: HttpContext) {
    const userId = Number(params.userId)
    const fileName = params.fileName as string

    if (!Number.isInteger(userId) || !this.isValidCommunityMediaRequest(fileName)) {
      return response.notFound('Image not found')
    }

    const directory = this.communityImageDirectory(userId)
    const filePath = path.resolve(directory, fileName)

    if (!filePath.startsWith(`${directory}${path.sep}`)) {
      return response.notFound('Image not found')
    }

    response
      .header('Cache-Control', 'private, max-age=300')
      .header('X-Content-Type-Options', 'nosniff')
      .download(filePath, false, (error) => {
        if (error.code === 'ENOENT') return ['Image not found', 404]
        return ['Unable to read image', 500]
      })
  }

  private async getFeedPosts(user: AuthUser) {
    const posts = await this.basePostQuery()
      .where((query) => {
        query.where('visibility', 'public').orWhere('userId', user.id)
      })
      .orderBy('createdAt', 'desc')
      .limit(30)

    return posts.map((post) => this.formatPost(post, user.id))
  }

  private async getUserPosts(profileUser: User, currentUser: AuthUser) {
    const query = this.basePostQuery().where('userId', profileUser.id)

    if (profileUser.id !== currentUser.id) {
      query.where('visibility', 'public')
    }

    const posts = await query.orderBy('createdAt', 'desc').limit(30)

    return posts.map((post) => this.formatPost(post, currentUser.id))
  }

  private async getSinglePost(postId: number, currentUser: AuthUser) {
    const post = await this.basePostQuery().where('id', postId).firstOrFail()

    return this.formatPost(post, currentUser.id)
  }

  private async getFavoritePosts(
    owner: User | AuthUser,
    currentUser: AuthUser = owner as AuthUser
  ) {
    const favoriteReactions = await PostReaction.query()
      .where('userId', owner.id)
      .where('type', 'favorite')
      .orderBy('createdAt', 'desc')
      .preload('post', (postQuery) => {
        postQuery
          .preload('user', (userQuery) => userQuery.preload('accountProfile'))
          .preload('hashtags', (hashtagQuery) => hashtagQuery.orderBy('tag', 'asc'))
          .preload('reactions')
          .preload('comments', (commentQuery) => {
            commentQuery
              .orderBy('createdAt', 'asc')
              .limit(6)
              .preload('user', (userQuery) => userQuery.preload('accountProfile'))
          })
          .preload('poll', (pollQuery) => {
            pollQuery.preload('options', (optionQuery) => {
              optionQuery.orderBy('sortOrder', 'asc').preload('votes')
            })
          })

        if (owner.id !== currentUser.id) {
          postQuery.where('visibility', 'public')
        }
      })
      .limit(30)

    return favoriteReactions
      .map((reaction) => reaction.post)
      .filter(Boolean)
      .map((post) => this.formatPost(post, currentUser.id))
  }

  private basePostQuery() {
    const query = CommunityPost.query()
    this.applyPostPreloads(query)

    return query
  }

  private applyPostPreloads(query: ModelQueryBuilderContract<typeof CommunityPost>) {
    query
      .preload('user', (userQuery) => userQuery.preload('accountProfile'))
      .preload('hashtags', (hashtagQuery) => hashtagQuery.orderBy('tag', 'asc'))
      .preload('reactions')
      .preload('comments', (commentQuery) => {
        commentQuery
          .orderBy('createdAt', 'asc')
          .limit(6)
          .preload('user', (userQuery) => userQuery.preload('accountProfile'))
      })
      .preload('poll', (pollQuery) => {
        pollQuery.preload('options', (optionQuery) => {
          optionQuery.orderBy('sortOrder', 'asc').preload('votes')
        })
      })
  }

  private formatPost(post: CommunityPost, currentUserId: number) {
    const reactions = post.reactions || []
    const comments = post.comments || []
    const likesCount = reactions.filter((reaction) => reaction.type === 'like').length
    const favoritesCount = reactions.filter((reaction) => reaction.type === 'favorite').length
    const poll = post.poll as PostPoll | undefined

    return {
      id: post.id,
      body: post.body,
      mediaUrl: post.mediaUrl,
      mediaType: post.mediaType,
      visibility: post.visibility,
      createdAtHuman: post.createdAt?.toRelative() || 'Recently',
      author: this.formatUser(post.user),
      hashtags: (post.hashtags || []).map((hashtag) => hashtag.tag),
      comments: comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAtHuman: comment.createdAt?.toRelative() || 'Recently',
        author: this.formatUser(comment.user),
      })),
      counts: {
        likes: likesCount,
        favorites: favoritesCount,
        comments: comments.length,
      },
      liked: reactions.some(
        (reaction) => reaction.type === 'like' && reaction.userId === currentUserId
      ),
      favorited: reactions.some(
        (reaction) => reaction.type === 'favorite' && reaction.userId === currentUserId
      ),
      poll: poll ? this.formatPoll(poll, currentUserId) : null,
    }
  }

  private formatPoll(poll: PostPoll, currentUserId: number) {
    const options = poll.options || []
    const totalVotes = options.reduce((total, option) => total + (option.votes?.length || 0), 0)
    const selectedOptionId =
      options.find((option) => option.votes?.some((vote) => vote.userId === currentUserId))?.id ||
      null

    return {
      id: poll.id,
      question: poll.question,
      totalVotes,
      selectedOptionId,
      options: options.map((option) => {
        const voteCount = option.votes?.length || 0

        return {
          id: option.id,
          label: option.label,
          votes: voteCount,
          percent: totalVotes ? Math.round((voteCount / totalVotes) * 100) : 0,
          selected: option.id === selectedOptionId,
        }
      }),
    }
  }

  private async getViewerProfile(user: AuthUser) {
    const accountProfile = await this.ensureAccountProfile(user)
    const stats = await this.getUserStats(user.id)

    return {
      ...this.formatUser(user, accountProfile),
      stats,
    }
  }

  private formatUser(user: User | AuthUser, accountProfile?: AccountProfile | null) {
    const profile = accountProfile || user.accountProfile || null
    const displayName = profile?.displayName || user.fullName || user.username
    const initial = Array.from((displayName || user.username || 'P').trim())[0] || 'P'
    const avatarUrl = this.profileMediaUrl(user.id, profile?.avatarUrl || user.profilePicture)
    const bannerUrl = this.profileMediaUrl(user.id, profile?.bannerUrl)

    return {
      id: user.id,
      username: user.username,
      displayName,
      role: user.role,
      roleLabel: this.roleLabel(user.role),
      avatarUrl,
      bannerUrl,
      bio: profile?.bio || null,
      location: profile?.location || null,
      initial: initial.toLocaleUpperCase('en'),
    }
  }

  private async ensureAccountProfile(user: AuthUser) {
    return AccountProfile.firstOrCreate(
      { userId: user.id },
      {
        userId: user.id,
        displayName: user.fullName || user.username,
      }
    )
  }

  private profileMediaUrl(userId: number, url?: string | null) {
    if (!url) return null

    const legacySecureUrl = url.match(/^\/profile\/media\/(avatar|banner)\/([^/]+)$/)

    if (legacySecureUrl) {
      return `/profile/media/${userId}/${legacySecureUrl[1]}/${legacySecureUrl[2]}`
    }

    return url
  }

  private roleLabel(role: string) {
    if (role === 'gardener') return 'Gardener'
    if (role === 'nursery') return 'Nursery'

    return 'Client'
  }

  private async getSuggestedUsers(user: AuthUser) {
    const followingRows = await Follow.query().where('followerId', user.id).select('followingId')
    const followingIds = followingRows.map((row) => row.followingId)
    const query = User.query()
      .whereNot('id', user.id)
      .preload('accountProfile')
      .orderBy('createdAt', 'desc')

    if (followingIds.length) {
      query.whereNotIn('id', followingIds)
    }

    const users = await query.limit(5)

    return users.map((suggestedUser) => this.formatUser(suggestedUser))
  }

  private async getUserStats(userId: number) {
    const [posts, followers, following, saved] = await Promise.all([
      this.countRows('community_posts', 'user_id', userId),
      this.countRows('follows', 'following_id', userId),
      this.countRows('follows', 'follower_id', userId),
      db
        .from('post_reactions')
        .where('user_id', userId)
        .where('type', 'favorite')
        .count('* as total')
        .first(),
    ])

    return {
      posts,
      followers,
      following,
      saved: Number((saved as { total?: number | string } | null)?.total || 0),
    }
  }

  private async getPostReactionCounts(postId: number) {
    const [likes, favorites] = await Promise.all([
      db
        .from('post_reactions')
        .where('community_post_id', postId)
        .where('type', 'like')
        .count('* as total')
        .first(),
      db
        .from('post_reactions')
        .where('community_post_id', postId)
        .where('type', 'favorite')
        .count('* as total')
        .first(),
    ])

    return {
      likes: Number((likes as { total?: number | string } | null)?.total || 0),
      favorites: Number((favorites as { total?: number | string } | null)?.total || 0),
    }
  }

  private async isFollowing(followerId: number, followingId: number) {
    const follow = await Follow.query()
      .where('followerId', followerId)
      .where('followingId', followingId)
      .first()

    return Boolean(follow)
  }

  private async countRows(tableName: string, columnName: string, value: number) {
    const result = (await db
      .from(tableName)
      .where(columnName, value)
      .count('* as total')
      .first()) as { total?: number | string } | null

    return Number(result?.total || 0)
  }

  private async createPostHashtags(postId: number, hashtags: string[]) {
    if (!hashtags.length) return

    await PostHashtag.createMany(
      hashtags.map((tag) => ({
        communityPostId: postId,
        tag,
      }))
    )
  }

  private extractHashtags(body?: string | null, explicitTags?: string | null) {
    const tags = new Map<string, string>()
    const addTag = (value: string) => {
      const clean = value
        .trim()
        .replace(/^#+/, '')
        .replace(/[^\p{L}\p{N}_-]/gu, '')
        .toLowerCase()
        .slice(0, 40)

      if (clean && !tags.has(clean)) {
        tags.set(clean, clean)
      }
    }

    for (const match of body?.matchAll(/#([\p{L}\p{N}_-]{1,40})/gu) || []) {
      addTag(match[1])
    }

    for (const tag of explicitTags?.split(/[,\s]+/) || []) {
      addTag(tag)
    }

    return Array.from(tags.values()).slice(0, 12)
  }

  private normalizePollOptions(value?: string | null) {
    const options = new Map<string, string>()

    for (const option of value?.split(/[\n;]+/) || []) {
      const clean = option.replace(/\s+/g, ' ').trim().slice(0, 120)
      const key = clean.toLowerCase()

      if (clean && !options.has(key)) {
        options.set(key, clean)
      }
    }

    return Array.from(options.values()).slice(0, 6)
  }

  private async validateImageUpload(file: CommunityImageFile) {
    const errors: FieldErrors = {}
    let detectedImage: DetectedCommunityImage | undefined

    if (!file) return { errors, detectedImage }

    if (!file.isValid) {
      errors.image = ['Image must be JPG, PNG, or WEBP and smaller than 8MB']
      return { errors, detectedImage }
    }

    detectedImage = (await this.detectCommunityImage(file)) || undefined

    if (!detectedImage) {
      errors.image = ['Upload a real JPG, PNG, or WEBP image']
    }

    return { errors, detectedImage }
  }

  private async storeCommunityImage(
    file: CommunityImageFile,
    options: { userId: number; detectedImage?: DetectedCommunityImage }
  ) {
    if (!file || !file.isValid || !options.detectedImage) return null

    const directory = this.communityImageDirectory(options.userId)
    const extension = options.detectedImage.extension

    await fs.mkdir(directory, { recursive: true })
    await file.move(directory, {
      name: `post-${Date.now()}-${randomUUID()}.${extension}`,
      overwrite: true,
    })

    return file.fileName ? `/community/media/${options.userId}/${file.fileName}` : null
  }

  private communityImageDirectory(userId: number) {
    return app.makePath('storage/community_uploads', String(userId))
  }

  private isValidCommunityMediaRequest(fileName?: string) {
    return Boolean(fileName && communityMediaFilePattern.test(fileName))
  }

  private async detectCommunityImage(
    file: CommunityImageFile
  ): Promise<DetectedCommunityImage | null> {
    if (!file?.tmpPath) return null

    return this.detectCommunityImageFromPath(file.tmpPath, file.size)
  }

  private async detectCommunityImageFromPath(
    filePath: string,
    fileSize = communityImageHeaderBytes
  ): Promise<DetectedCommunityImage | null> {
    const bytesToRead = Math.min(Math.max(fileSize || 32, 32), communityImageHeaderBytes)
    const header = Buffer.alloc(bytesToRead)
    const handle = await fs.open(filePath, 'r')

    try {
      const { bytesRead } = await handle.read(header, 0, header.length, 0)
      const signature = header.subarray(0, bytesRead)

      return (
        this.detectJpegImage(signature) ||
        this.detectPngImage(signature) ||
        this.detectWebpImage(signature)
      )
    } finally {
      await handle.close()
    }
  }

  private detectJpegImage(header: Buffer): DetectedCommunityImage | null {
    if (header.length < 4 || header[0] !== 0xff || header[1] !== 0xd8 || header[2] !== 0xff) {
      return null
    }

    const dimensions = this.readJpegDimensions(header)

    if (!dimensions || !this.hasSafeImageDimensions(dimensions.width, dimensions.height)) {
      return null
    }

    return { extension: 'jpg', mimeType: 'image/jpeg' }
  }

  private detectPngImage(header: Buffer): DetectedCommunityImage | null {
    const hasPngSignature =
      header.length >= 24 &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47 &&
      header[4] === 0x0d &&
      header[5] === 0x0a &&
      header[6] === 0x1a &&
      header[7] === 0x0a &&
      header.toString('ascii', 12, 16) === 'IHDR'

    if (!hasPngSignature) return null

    const width = header.readUInt32BE(16)
    const height = header.readUInt32BE(20)

    if (!this.hasSafeImageDimensions(width, height)) {
      return null
    }

    return { extension: 'png', mimeType: 'image/png' }
  }

  private detectWebpImage(header: Buffer): DetectedCommunityImage | null {
    if (
      header.length < 30 ||
      header.toString('ascii', 0, 4) !== 'RIFF' ||
      header.toString('ascii', 8, 12) !== 'WEBP'
    ) {
      return null
    }

    const dimensions = this.readWebpDimensions(header)

    if (!dimensions || !this.hasSafeImageDimensions(dimensions.width, dimensions.height)) {
      return null
    }

    return { extension: 'webp', mimeType: 'image/webp' }
  }

  private readJpegDimensions(header: Buffer) {
    let offset = 2

    while (offset + 3 < header.length) {
      if (header[offset] !== 0xff) {
        offset += 1
        continue
      }

      while (header[offset] === 0xff) {
        offset += 1
      }

      const marker = header[offset]
      offset += 1

      if (marker === 0xd9 || marker === 0xda) return null
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
      if (offset + 2 > header.length) return null

      const segmentLength = header.readUInt16BE(offset)

      if (segmentLength < 2) return null

      const segmentStart = offset + 2
      const segmentEnd = offset + segmentLength

      if (this.isJpegStartOfFrame(marker)) {
        if (segmentStart + 5 > header.length) return null

        return {
          height: header.readUInt16BE(segmentStart + 1),
          width: header.readUInt16BE(segmentStart + 3),
        }
      }

      if (segmentEnd <= offset) return null

      offset = segmentEnd
    }

    return null
  }

  private readWebpDimensions(header: Buffer) {
    const chunkType = header.toString('ascii', 12, 16)

    if (chunkType === 'VP8X') {
      return {
        width: 1 + header.readUIntLE(24, 3),
        height: 1 + header.readUIntLE(27, 3),
      }
    }

    if (chunkType === 'VP8L' && header[20] === 0x2f) {
      const b0 = header[21]
      const b1 = header[22]
      const b2 = header[23]
      const b3 = header[24]

      return {
        width: 1 + (((b1 & 0x3f) << 8) | b0),
        height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      }
    }

    if (chunkType === 'VP8 ' && header[23] === 0x9d && header[24] === 0x01 && header[25] === 0x2a) {
      return {
        width: header.readUInt16LE(26) & 0x3fff,
        height: header.readUInt16LE(28) & 0x3fff,
      }
    }

    return null
  }

  private isJpegStartOfFrame(marker: number) {
    return (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf
    )
  }

  private hasSafeImageDimensions(width: number, height: number) {
    return (
      Number.isInteger(width) &&
      Number.isInteger(height) &&
      width > 0 &&
      height > 0 &&
      width <= maxCommunityImageDimension &&
      height <= maxCommunityImageDimension &&
      width * height <= maxCommunityImagePixels
    )
  }

  private normalizeUsernameSearch(value?: string | null) {
    return (value || '')
      .toString()
      .trim()
      .replace(/^@+/, '')
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, '')
      .slice(0, 30)
  }

  private wantsJson(request: HttpContext['request']) {
    const headers = request.headers()
    const firstHeader = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value)
    const requestedWith = firstHeader(
      request.header('x-requested-with') || headers['x-requested-with']
    )
    const accept = firstHeader(request.header('accept') || headers.accept)

    return (
      request.input('_ajax') === '1' ||
      request.ajax() ||
      requestedWith?.toLowerCase() === 'xmlhttprequest' ||
      accept?.includes('application/json')
    )
  }

  private cleanOptional(value?: string | null) {
    const clean = value?.toString().trim()
    return clean ? clean : null
  }
}
