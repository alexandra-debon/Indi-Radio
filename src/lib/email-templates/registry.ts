import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
import { template as userBanTemplate } from './user-ban'
import { template as userQuarantineTemplate } from './user-quarantine'
import { template as contactTemplate } from './contact'
import { template as contactConfirmationTemplate } from './contact-confirmation'
import { template as albumReportNewTemplate } from './album-report-new'
import { template as albumReportResolvedTemplate } from './album-report-resolved'
import { template as mentionNotificationTemplate } from './mention-notification'
import { template as adminMessageTemplate } from './admin-message'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'user-ban': userBanTemplate,
  'user-quarantine': userQuarantineTemplate,
  'contact': contactTemplate,
  'contact-confirmation': contactConfirmationTemplate,
  'album-report-new': albumReportNewTemplate,
  'album-report-resolved': albumReportResolvedTemplate,
  'mention-notification': mentionNotificationTemplate,
  'admin-message': adminMessageTemplate,
}
