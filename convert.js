import { parseArgs } from 'jsr:@std/cli/parse-args'

const args = parseArgs(Deno.args, {
  string: ['file', 'output'],
  alias: {
    file: 'f',
    output: 'o',
  },
  default: { output: './output' },
})

const snFile = args.file

if (!snFile) {
  console.error('File required')
  Deno.exit(1)
}

const output = args.output

let snJson = await Deno.readTextFile(snFile)
snJson = JSON.parse(snJson)

const notes = snJson.items.filter((item) => item.content_type === 'Note')
const notesObj = {}

notes.map((note) => {
  const { created_at, updated_at, content, uuid } = note
  const { title, text, noteType } = content

  notesObj[uuid] = {
    uuid,
    title,
    created_at,
    updated_at,
    text,
    noteType,
    tags: [],
  }
})

let tags = snJson.items.filter((item) => item.content_type === 'Tag')

tags = tags.map((tag) => {
  const { created_at, updated_at, content, uuid } = tag
  const { title, references } = content

  const parentTag = references.find((ref) => ref.reference_type === 'TagToParentTag')

  const notes = references.filter((ref) => ref.content_type === 'Note') || []
  return {
    created_at,
    updated_at,
    uuid,
    title,
    parentTag: parentTag || undefined,
    notes,
  }
})

const tagObj = {}
tags.map((tag) => {
  tagObj[tag.uuid] = tag
})

function sanitize(name) {
  return name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled'
}

function createPath() {
  while (tags.length > 0) {
    const prevLength = tags.length

    tags = tags
      .map((tag) => {
        const hasParent = (tag.parentTag === undefined) ? false : true

        if (!hasParent) {
          tagObj[tag.uuid].path = `${output}/${sanitize(tag.title)}`
        } else if (tagObj[tag.parentTag.uuid].path !== undefined) {
          tagObj[tag.uuid].path = `${tagObj[tag.parentTag.uuid].path}/${sanitize(tag.title)}`
        } else {
          return tag
        }
      })
      .filter((tag) => tag !== undefined)

    if (tags.length === prevLength && tags.length > 0) {
      throw new Error(`Cycle detected in tag hierarchy involving tag: ${tags[0].title} (UUID: ${tags[0].uuid})`)
    }
  }
}

async function createDirectoriesFiles() {
  for (const key in tagObj) {
    const tag = tagObj[key]
    const { path, notes } = tag
    await Deno.mkdir(`${path}`, { recursive: true })

    for (const index in notes) {
      const thisNote = notesObj[notes[index].uuid]

      if (thisNote !== undefined) {
        let { title, text, created_at, updated_at } = notesObj[notes[index].uuid]
        title = (title === undefined) ? created_at : title

        const fileName = `${path}/${title.toLowerCase().replaceAll(' ', '-')}.md`
        const frontmatter = `---\ncreated_at: ${created_at}\nupdate_at: ${updated_at}\n---\n\n`
        const fileName = `${path}/${sanitize(title)}.md`
        text = frontmatter + text

        await Deno.writeTextFile(fileName, text, { create: true })
      }
    }
  }
}

createPath()
createDirectoriesFiles()
