import hostedGitInfo from 'hosted-git-info'

/**
 * Spells a `package.json` repository URL the way `npm pkg fix` does, so
 * running it afterwards finds nothing to change. URLs npm leaves alone are
 * returned as given.
 */
export const normalizeRepository = (
  repository: string | undefined,
): string | undefined => {
  const hosted = repository ? hostedGitInfo.fromUrl(repository) : undefined

  if (!hosted) {
    return repository
  }

  return hosted.getDefaultRepresentation() === 'shortcut'
    ? hosted.https()
    : hosted.toString()
}
