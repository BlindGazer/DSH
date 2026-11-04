import { AREA_CONTEXT, RULE_CONTEXT } from '../shared/constants.js'

export function roughTokenEstimate(text) {
  let tokens = 0
  for (const character of text) tokens += character.codePointAt(0) < 128 ? 0.25 : 0.7
  return Math.ceil(tokens)
}

export function computeRuleMetrics(state) {
  const text = [state.text, state.areaText].filter(Boolean).join('\n')
  return { characters: state.text.length, estTokens: roughTokenEstimate(text) }
}

export function computeContextMetrics(state, availableSkills, modelSkills, messages) {
  const invoked = messages.filter((message) => message.source?.kind === 'skill-invocation')
  const loadedNames = [...new Set(invoked.map((message) => message.source.name).filter((name) => typeof name === 'string'))]
  const loadedSkillCharacters = invoked.reduce((total, message) => total + messageCharacters(message), 0)
  const uniqueLoadedTexts = [...new Set(invoked.map(messageText))]
  const uniqueLoadedCharacters = uniqueLoadedTexts.reduce((total, text) => total + text.length, 0)
  const skillCatalogCharacters = modelSkills.reduce((total, skill) => total + skill.name.length + skill.description.length, 0)
  let runtimeSections = []
  for (const message of messages) {
    const source = message.source
    if (source?.kind === 'runtime-context') runtimeSections = source.form === 'snapshot' && Array.isArray(source.sections) ? source.sections : []
  }
  const currentSections = runtimeSections.filter((section) => section.name === AREA_CONTEXT || section.name === RULE_CONTEXT)
  const catalogMessages = messages.filter((message) => message.source?.kind === 'skill-catalog')
  const currentSetText = [state.text, state.areaText, ...modelSkills.map((skill) => `/${skill.name} ${skill.description}`)].filter(Boolean).join('\n')
  const uniqueCurrentSetCharacters = currentSetText.length
  const visiblePieces = [
    ...currentSections.map((section) => typeof section.text === 'string' ? section.text : ''),
    ...(catalogMessages.length ? [messageText(catalogMessages.at(-1))] : []),
    ...invoked.map(messageText),
  ].filter(Boolean)
  const visibleKnownPluginCharacters = visiblePieces.reduce((total, text) => total + text.length, 0)
  const estimatedTokens = roughTokenEstimate(visiblePieces.length ? visiblePieces.join('\n') : currentSetText)
  return {
    rules: { count: state.rules.length, characters: state.text.length },
    areaCatalog: { count: [...state.snapshot.areas.values()].filter((area) => area.enabled && area.available).length, characters: state.areaText.length },
    skillCatalog: { count: modelSkills.length, characters: skillCatalogCharacters },
    ownSkills: { count: availableSkills.length, userCommands: availableSkills.filter((skill) => skill.invocation?.userInvocable !== false).length },
    loadedSkills: { count: loadedNames.length, names: loadedNames, characters: loadedSkillCharacters, scope: 'visible skill-invocation-tagged messages only' },
    uniqueCurrentSetCharacters,
    uniqueRecognizedSkillBodyCharacters: uniqueLoadedCharacters,
    visibleKnownPluginCharacters,
    estimatedTokens,
    estimatedOverSoftBudget: estimatedTokens > state.settings.tokenBudget,
    unit: 'characters plus rough token heuristic',
    note: 'Current-set characters include the latest rules, areas and model-callable catalog, not skill bodies that are not re-read for metrics. Visible characters cover recognized runtime snapshots, the latest skill catalog and skill-invocation messages only. Before those messages exist, the estimate falls back to the current set. Token estimate is a rough script-sensitive heuristic, not the selected provider tokenizer; hidden tool results and context overhead may be absent. Treat the soft-budget flag as advisory.',
    tokenBudget: state.settings.tokenBudget,
  }
}

function messageText(message) {
  return (message.content ?? []).filter((block) => block.type === 'text').map((block) => block.text).join('')
}

function messageCharacters(message) {
  return messageText(message).length
}
