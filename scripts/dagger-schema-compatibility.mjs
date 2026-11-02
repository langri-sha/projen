import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

import ts from 'typescript'

const schemas = ['dagger-module', 'dagger-workspace']

const readonlyProperties = (text, immutable) => {
  const source = ts.createSourceFile(
    'schema.ts',
    text,
    ts.ScriptTarget.Latest,
    true,
  )
  const changes = []
  const visit = (node) => {
    if (ts.isPropertySignature(node) || ts.isIndexSignatureDeclaration(node)) {
      const modifier = node.modifiers?.find(
        ({ kind }) => kind === ts.SyntaxKind.ReadonlyKeyword,
      )

      if (immutable && !modifier && ts.isPropertySignature(node)) {
        changes.push({
          start: node.getStart(source),
          end: node.getStart(source),
          text: 'readonly ',
        })
      } else if (!immutable && modifier) {
        changes.push({
          start: modifier.getStart(source),
          end: text[modifier.end] === ' ' ? modifier.end + 1 : modifier.end,
          text: '',
        })
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(source)

  for (const change of changes.sort(
    (left, right) => right.start - left.start,
  )) {
    text = text.slice(0, change.start) + change.text + text.slice(change.end)
  }

  return text
}

const commands = {
  prepare() {
    for (const schema of schemas) {
      const file = `src/${schema}.ts`
      let text = readonlyProperties(fs.readFileSync(file, 'utf8'), false)

      if (schema === 'dagger-module') {
        text +=
          '\nexport type SDK = { -readonly [Key in keyof Sdk]: Sdk[Key] };\n'
      }

      fs.writeFileSync(file, text)
    }
  },

  build() {
    const originals = new Map(
      schemas.map((schema) => {
        const file = `src/${schema}.ts`
        return [file, fs.readFileSync(file, 'utf8')]
      }),
    )

    try {
      for (const [file, text] of originals) {
        fs.writeFileSync(file, readonlyProperties(text, true))
      }

      execFileSync('jsii', { stdio: 'inherit' })

      for (const schema of schemas) {
        const file = `dist/${schema}.d.ts`
        fs.writeFileSync(
          file,
          readonlyProperties(fs.readFileSync(file, 'utf8'), false),
        )
      }
    } finally {
      for (const [file, text] of originals) {
        fs.writeFileSync(file, text)
      }
    }
  },
}

const [command] = process.argv.slice(2)

if (!Object.hasOwn(commands, command)) {
  throw new Error(`Expected ${Object.keys(commands).join(', ')}.`)
}

commands[command]()
