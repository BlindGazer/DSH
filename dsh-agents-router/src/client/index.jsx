import { setHostLocale } from './locale-context.js'
import { RouterView } from './components/RouterView.jsx'
import { PluginSettingsAction } from './components/PluginSettings.jsx'
import { GlobalSettingsCard } from './components/GlobalSettingsCard.jsx'
import { CLIENT_PLUGIN_ID, PACKAGE_ID } from '../shared/constants.js'

export const name = CLIENT_PLUGIN_ID
export const inject = ['slots', 'locale']

export function apply(ctx) {
  setHostLocale(ctx.locale?.preference)
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view', id: 'agents-router', order: 30, label: () => 'Router',
    inject: (sessionId) => ({ sessionId }),
  }, RouterView))
  ctx.slots.inject('plugins.detail.actions', () => ctx.slots.register({
    name: 'plugins.detail.actions', id: 'agents-router-settings-action', order: 30,
  }, PluginSettingsAction))
  ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
    name: 'plugins.bundle.config', key: PACKAGE_ID, id: 'agents-router-global-settings', order: 30,
  }, GlobalSettingsCard))
}