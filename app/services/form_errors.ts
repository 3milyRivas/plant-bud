import type { HttpContext } from '@adonisjs/core/http'

export type FieldErrors = Record<string, string[]>

type FormContext = Pick<HttpContext, 'request' | 'response' | 'session'>

type ValidationMessage = {
  field?: string
  pointer?: string
  message?: string
}

export function redirectBackWithFormErrors(ctx: FormContext, errors: FieldErrors) {
  ctx.session.flash('inputErrorsBag', errors)
  ctx.session.flash('errors', errors)
  const oldInput = safeOldInput(ctx.request.all())

  if (isAuthenticationForm(ctx.request)) {
    ctx.session.flash('authOld', oldInput)
  } else {
    ctx.session.flash('old', oldInput)
  }

  return ctx.response.redirect().back()
}

export function safeOldInput(input: Record<string, unknown>) {
  const oldInput = { ...input }

  delete oldInput.password
  delete oldInput.passwordConfirmation
  delete oldInput.card_number
  delete oldInput.card_cvc
  delete oldInput.payout_card_number

  return oldInput
}

export function validationExceptionToFieldErrors(error: unknown) {
  if (!isValidationException(error)) return null

  const messages = error.messages
  const errors: FieldErrors = {}

  if (Array.isArray(messages)) {
    for (const item of messages as ValidationMessage[]) {
      const field = item.field || item.pointer || 'auth'
      const message = item.message || 'This field is invalid'
      errors[field] = [...(errors[field] || []), message]
    }
  } else if (messages && typeof messages === 'object') {
    for (const [field, value] of Object.entries(messages)) {
      errors[field] = Array.isArray(value) ? value.map(String) : [String(value)]
    }
  }

  return Object.keys(errors).length ? errors : { auth: ['Please check the highlighted fields'] }
}

function isAuthenticationForm(request: FormContext['request']) {
  const path = request.url().split('?')[0]
  return path === '/login' || path === '/signup'
}

function isValidationException(error: unknown): error is { code: string; messages: unknown } {
  return !!(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'E_VALIDATION_ERROR'
  )
}
