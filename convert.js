import { parseArgs } from 'jsr:@std/cli/parse-args'

const args = parseArgs(Deno.args, {
  string: ['file', 'output'],
  alias: {
    file: 'f',
    output: 'o',
  },
  default: { output: './output' },
})

const { file: snFile, output } = args

if (!snFile) {
  console.error('File required')
  Deno.exit(1)
}

let snJson
try {
  snJson = await Deno.readTextFile(snFile)
  snJson = JSON.parse(snJson)
} catch (error) {
  console.error(`error reading or parsing file (${snFile}):`, error.message)
  Deno.exit(1)
}

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

async function writeNoteFile(basePath, note) {
  let { title, text, created_at, updated_at } = note
  title = title ?? created_at
  let fileName = `${basePath}/${sanitize(title)}.md`
  let counter = 1

  while (true) {
    try {
      await Deno.stat(fileName)
      fileName = `${basePath}/${sanitize(title)}-${counter}.md`
      counter++
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        break
      }

      throw error
    }
  }

  const frontmatter = `---\ncreated_at: ${created_at}\nupdated_at: ${updated_at}\n---\n\n`
  text = frontmatter + text

  await Deno.writeTextFile(fileName, text, { create: true })
}

async function createDirectoriesFiles() {
  const taggedNotes = new Set()

  for (const key in tagObj) {
    const tag = tagObj[key]
    const { path, notes } = tag

    try {
      await Deno.mkdir(`${path}`, { recursive: true })
    } catch (error) {
      console.error(`Error creating directory ${path}:`, error.message)
    }

    for (const index in notes) {
      const thisNote = notesObj[notes[index].uuid]

      if (thisNote) {
        taggedNotes.add(notes[index].uuid)
        await writeNoteFile(path, thisNote)
      }
    }
  }

  const miscPath = `${output}/misc-no-tags`

  try {
    await Deno.mkdir(miscPath, { recursive: true })
  } catch (error) {
    console.error(`Error creating directory ${miscPath}:`, error.message)
  }

  for (const uuid in notesObj) {
    if (!taggedNotes.has(uuid)) {
      await writeNoteFile(miscPath, notesObj[uuid])
    }
  }
}

createPath()
await createDirectoriesFiles()
