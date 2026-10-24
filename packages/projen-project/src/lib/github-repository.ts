export interface GitHubRepository {
  readonly owner: string
  readonly repo: string
}

const PATTERNS = [
  /^(?:github:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/,
  /^(?:git\+)?(?:https?|ssh|git):\/\/(?:[^@/]+@)?github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/,
  /^git@github\.com:([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/,
]

/**
 * The owner and name of a GitHub repository, from a `package.json`
 * `repository` as npm spells it: `owner/repo`, `github:owner/repo` or a Git
 * URL. Anything else, including other hosts, is not a GitHub repository.
 */
export const parseGitHubRepository = (
  repository: string | undefined,
): GitHubRepository | undefined => {
  for (const pattern of PATTERNS) {
    const match = pattern.exec(repository?.trim() ?? '')

    if (match) {
      return { owner: match[1]!, repo: match[2]! }
    }
  }

  return undefined
}
