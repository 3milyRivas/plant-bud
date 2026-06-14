import AccountProfile, {
  DEFAULT_PROFILE_AVATAR_URL,
  DEFAULT_PROFILE_BANNER_URL,
} from '#models/account_profile'
import AdminAuditLog from '#models/admin_audit_log'
import CommunityPost from '#models/community_post'
import GardenerProfile from '#models/gardener_profile'
import NurseryProfile from '#models/nursery_profile'
import User from '#models/user'
import { FREE_SCANNER_MONTHLY_LIMIT } from '#services/subscription_service'
import app from '@adonisjs/core/services/app'
import hash from '@adonisjs/core/services/hash'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import fs from 'node:fs/promises'

const ownerEmail = 'davidalfredomenjivar@gmail.com'
const validRoles = new Set(['client', 'gardener', 'nursery'])
const usernamePattern = /^[a-z0-9](?:[a-z0-9._]{1,28}[a-z0-9])?$/

export default class AdminController {
  async index({ auth, request, view, session }: HttpContext) {
    const search = this.clean(request.input('q'), 80)
    const userQuery = User.query()
      .preload('accountProfile')
      .orderByRaw("case access_level when 'owner' then 0 when 'admin' then 1 else 2 end")
      .orderBy('createdAt', 'desc')
      .limit(60)

    if (search) {
      userQuery.where((query) => {
        query
          .where('email', 'like', `%${search}%`)
          .orWhere('username', 'like', `%${search}%`)
          .orWhere('firstName', 'like', `%${search}%`)
          .orWhere('lastName', 'like', `%${search}%`)
      })
    }

    const [users, posts, logs, userCount, postCount, adminCount] = await Promise.all([
      userQuery,
      CommunityPost.query()
        .preload('user', (query) => query.preload('accountProfile'))
        .orderBy('createdAt', 'desc')
        .limit(40),
      AdminAuditLog.query().orderBy('createdAt', 'desc').limit(25),
      db.from('users').count('* as total').first(),
      db.from('community_posts').count('* as total').first(),
      db.from('users').whereIn('access_level', ['admin', 'owner']).count('* as total').first(),
    ])

    return view.render('pages/PC/admin/index', {
      adminUser: auth.user!,
      users,
      posts,
      logs,
      search,
      adminSuccess: session.flashMessages.get('adminSuccess'),
      adminError: session.flashMessages.get('adminError'),
      stats: {
        users: Number(userCount?.total || 0),
        posts: Number(postCount?.total || 0),
        admins: Number(adminCount?.total || 0),
      },
    })
  }

  async createUser({ auth, request, response, session }: HttpContext) {
    const actor = auth.user!
    const firstName = this.clean(request.input('first_name'), 50)
    const lastName = this.clean(request.input('last_name'), 50)
    const username = this.clean(request.input('username'), 30).toLowerCase()
    const email = this.clean(request.input('email'), 254).toLowerCase()
    const password = String(request.input('password') || '')
    const role = this.clean(request.input('role'), 16)
    const requestedAccess = this.clean(request.input('access_level'), 16)
    const accessLevel = actor.isOwner && requestedAccess === 'admin' ? 'admin' : 'member'

    if (
      !firstName ||
      !lastName ||
      !usernamePattern.test(username) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 10 ||
      !validRoles.has(role)
    ) {
      session.flash(
        'adminError',
        'Review the account fields. Passwords need at least 10 characters.'
      )
      return response.redirect('/admin')
    }

    const existing = await User.query().where('email', email).orWhere('username', username).first()
    if (existing) {
      session.flash('adminError', 'That email or username is already registered.')
      return response.redirect('/admin')
    }

    await db.transaction(async (trx) => {
      const user = await User.create(
        {
          first_name: firstName,
          last_name: lastName,
          username,
          email,
          password,
          role: role as 'client' | 'gardener' | 'nursery',
          accessLevel,
        },
        { client: trx }
      )
      await AccountProfile.create(
        {
          userId: user.id,
          displayName: `${firstName} ${lastName}`,
          avatarUrl: DEFAULT_PROFILE_AVATAR_URL,
          bannerUrl: DEFAULT_PROFILE_BANNER_URL,
          subscriptionPlan: 'free',
          rewardPoints: 0,
          scannerMonthlyLimit: FREE_SCANNER_MONTHLY_LIMIT,
        },
        { client: trx }
      )

      if (role === 'gardener') {
        await GardenerProfile.create(
          {
            userId: user.id,
            headline: 'Gardening professional',
            availabilitySchedule: '',
            servicesOffered: '',
            isAvailable: true,
          },
          { client: trx }
        )
      } else if (role === 'nursery') {
        await NurseryProfile.create(
          {
            userId: user.id,
            nurseryName: `${firstName} ${lastName}`,
            nurserySlug: `${username.replace(/[._]+/g, '-')}-${user.id}`,
            ownerName: `${firstName} ${lastName}`,
            publicEmail: email,
            isActive: true,
          },
          { client: trx }
        )
      }

      await this.audit(
        actor,
        'user.created',
        'user',
        String(user.id),
        `Created ${email} as ${role}/${accessLevel}`,
        request.ip(),
        trx
      )
    })

    session.flash('adminSuccess', `Account ${email} created.`)
    return response.redirect('/admin')
  }

  async updateAccess({ auth, params, request, response, session }: HttpContext) {
    const actor = auth.user!
    if (!actor.isOwner) {
      return response.forbidden('Only the owner can change administrator access.')
    }

    const target = await User.findOrFail(params.id)
    const accessLevel = request.input('access_level') === 'admin' ? 'admin' : 'member'

    if (target.isOwner || target.id === actor.id || target.email.toLowerCase() === ownerEmail) {
      session.flash('adminError', 'The protected owner account cannot be changed.')
      return response.redirect('/admin')
    }

    if (!(await this.passwordMatches(actor, request.input('current_password')))) {
      session.flash('adminError', 'Owner password confirmation failed.')
      return response.redirect('/admin')
    }

    target.accessLevel = accessLevel
    await target.save()
    await this.audit(
      actor,
      'user.access_changed',
      'user',
      String(target.id),
      `${target.email} changed to ${accessLevel}`,
      request.ip()
    )
    session.flash('adminSuccess', `Access updated for ${target.email}.`)
    return response.redirect('/admin')
  }

  async deleteUser({ auth, params, request, response, session }: HttpContext) {
    const actor = auth.user!
    const target = await User.findOrFail(params.id)

    if (
      target.id === actor.id ||
      target.isOwner ||
      target.email.toLowerCase() === ownerEmail ||
      (target.isAdmin && !actor.isOwner)
    ) {
      session.flash('adminError', 'That protected account cannot be deleted by this administrator.')
      return response.redirect('/admin')
    }

    if (!(await this.passwordMatches(actor, request.input('current_password')))) {
      session.flash('adminError', 'Administrator password confirmation failed.')
      return response.redirect('/admin')
    }

    const targetEmail = target.email
    const targetId = target.id
    await db.transaction(async (trx) => {
      await this.audit(
        actor,
        'user.deleted',
        'user',
        String(targetId),
        `Deleted account ${targetEmail}`,
        request.ip(),
        trx
      )
      await trx.from('sessions').where('user_id', String(targetId)).delete()
      target.useTransaction(trx)
      await target.delete()
    })

    await this.removeUserFiles(targetId)
    session.flash('adminSuccess', `Account ${targetEmail} deleted.`)
    return response.redirect('/admin')
  }

  async deletePost({ auth, params, request, response, session }: HttpContext) {
    const actor = auth.user!
    const post = await CommunityPost.query().where('id', params.id).preload('user').firstOrFail()
    const mediaUrl = post.mediaUrl

    await db.transaction(async (trx) => {
      await this.audit(
        actor,
        'post.deleted',
        'community_post',
        String(post.id),
        `Deleted post ${post.id} by ${post.user.email}`,
        request.ip(),
        trx
      )
      post.useTransaction(trx)
      await post.delete()
    })

    await this.removeCommunityMedia(mediaUrl)
    session.flash('adminSuccess', 'Post deleted.')
    return response.redirect('/admin#recent-posts')
  }

  private async audit(
    actor: User,
    action: string,
    targetType: string,
    targetId: string,
    summary: string,
    ipAddress: string,
    client?: any
  ) {
    await AdminAuditLog.create(
      {
        actorUserId: actor.id,
        actorEmail: actor.email,
        action,
        targetType,
        targetId,
        summary,
        ipAddress,
      },
      client ? { client } : undefined
    )
  }

  private async passwordMatches(user: User, password: unknown) {
    const candidate = String(password || '')
    return candidate.length > 0 && hash.verify(user.password, candidate)
  }

  private clean(value: unknown, maxLength: number) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength)
  }

  private async removeUserFiles(userId: number) {
    const directories = [
      app.makePath('storage/community_uploads', String(userId)),
      app.makePath('storage/profile_uploads', String(userId)),
      app.makePath('storage/nursery_catalog', String(userId)),
    ]
    await Promise.all(
      directories.map((directory) => fs.rm(directory, { recursive: true, force: true }))
    )
  }

  private async removeCommunityMedia(mediaUrl: string | null) {
    const match = mediaUrl?.match(/^\/community\/media\/(\d+)\/([^/]+)$/)
    if (!match) return
    await fs.rm(app.makePath('storage/community_uploads', match[1], match[2]), { force: true })
  }
}
