/**
 * A form element. Mirrors the wire format of GitHub's form schema, so examples
 * from its documentation paste in unchanged.
 *
 * @see https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-githubs-form-schema
 */
export type IssueFormElement =
  | MarkdownElement
  | InputElement
  | TextareaElement
  | DropdownElement
  | CheckboxesElement
  | UploadElement

export interface Validations {
  /**
   * Prevents form submission until the element is completed.
   *
   * @remarks GitHub's form schema reference still says "only for public
   * repositories"; required fields shipped for private repositories on
   * 2025-02-18.
   * @see https://github.blog/changelog/2025-02-18-github-issues-projects-february-18th-update/
   * @default false
   */
  readonly required?: boolean
}

export interface TextValidations extends Validations {
  /**
   * Prevents form submission until the response has at least this many
   * characters. A non-negative integer.
   */
  readonly min_length?: number
}

export interface UploadValidations extends Validations {
  /**
   * Comma-separated file extensions to accept, such as `".png,.log,.zip"`.
   * Accepts every file type GitHub supports when omitted.
   */
  readonly accept?: string
}

/**
 * Static Markdown shown in the form. Not submitted, and cannot carry an `id`.
 */
export interface MarkdownElement {
  readonly type: 'markdown'
  readonly attributes: {
    /**
     * The Markdown to render.
     */
    readonly value: string
  }
}

/**
 * A single-line text field.
 */
export interface InputElement {
  readonly type: 'input'

  /**
   * Letters, digits, `-` and `_` only, and unique within the form. Prefills the
   * field from the `?<id>=` URL query parameter.
   */
  readonly id?: string

  readonly attributes: {
    /**
     * Unique within the form, unless an `id` tells the two elements apart.
     * Must not contain "password".
     */
    readonly label: string
    readonly description?: string
    readonly placeholder?: string
    /**
     * Text pre-filled in the field.
     */
    readonly value?: string
  }

  readonly validations?: TextValidations
}

/**
 * A multi-line text field.
 */
export interface TextareaElement {
  readonly type: 'textarea'

  /**
   * Letters, digits, `-` and `_` only, and unique within the form.
   */
  readonly id?: string

  readonly attributes: {
    /**
     * Unique within the form, unless an `id` tells the two elements apart.
     * Must not contain "password".
     */
    readonly label: string
    readonly description?: string
    readonly placeholder?: string
    /**
     * Text pre-filled in the field.
     */
    readonly value?: string
    /**
     * Formats submissions as a code block in this language, which must be one
     * Linguist knows. The field then no longer expands for attachments.
     *
     * @see https://github.com/github-linguist/linguist/blob/main/lib/linguist/languages.yml
     */
    readonly render?: string
  }

  readonly validations?: TextValidations
}

/**
 * A dropdown menu.
 */
export interface DropdownElement {
  readonly type: 'dropdown'

  /**
   * Letters, digits, `-` and `_` only, and unique within the form.
   */
  readonly id?: string

  readonly attributes: {
    /**
     * Unique within the form, unless an `id` tells the two elements apart.
     */
    readonly label: string
    readonly description?: string
    /**
     * Allow selecting more than one option.
     *
     * @default false
     */
    readonly multiple?: boolean
    /**
     * Non-empty and distinct. `None` is reserved: GitHub adds it itself to a
     * dropdown that is not required.
     */
    readonly options: readonly string[]
    /**
     * Index of the preselected option. Rules out `None` and `n/a` as options.
     */
    readonly default?: number
  }

  readonly validations?: Validations
}

/**
 * A set of checkboxes.
 */
export interface CheckboxesElement {
  readonly type: 'checkboxes'

  /**
   * Letters, digits, `-` and `_` only, and unique within the form.
   */
  readonly id?: string

  readonly attributes: {
    readonly label: string
    /**
     * Supports Markdown.
     */
    readonly description?: string
    /**
     * Option labels are unique among themselves and among the form's other
     * labels, unless an `id` on the clashing element tells them apart. Options
     * cannot carry an `id` of their own.
     */
    readonly options: readonly {
      /**
       * Supports Markdown for bold, italic and links.
       */
      readonly label: string
      /**
       * Prevents form submission until this box is checked.
       *
       * @default false
       */
      readonly required?: boolean
    }[]
  }

  readonly validations?: Validations
}

/**
 * A file upload field.
 *
 * @remarks `accept` is documented under `validations`, not `attributes`.
 */
export interface UploadElement {
  readonly type: 'upload'

  /**
   * Letters, digits, `-` and `_` only, and unique within the form.
   */
  readonly id?: string

  readonly attributes: {
    readonly label: string
    readonly description?: string
  }

  readonly validations?: UploadValidations
}
