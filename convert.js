import { parseArgs } from 'jsr:@std/cli/parse-args'

const args = parseArgs(Deno.args, {
  string: ['file'],
  alias: {
    file: 'f',
  },
})

const snFile = args.file

let snJson = await Deno.readTextFile(snFile)
snJson = JSON.parse(snJson)
console.log(snJson)

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
  const notes = references.filter((ref) => ref.content_type === 'Note')
  return {
    created_at,
    updated_at,
    uuid,
    title,
    parentTag: parentTag || undefined,
    notes: notes || undefined,
  }
})

const tagObj = {}
tags.map((tag) => {
  tagObj[tag.uuid] = tag
})

function createPath() {
  while (tags.length > 0) {
    tags = tags
      .map((tag, index) => {
        const hasParent = (tag.parentTag === undefined) ? false : true
        // console.log('has a parent', hasParent, tag.parentTag)
        if (!hasParent) {
          tagObj[tag.uuid].path = `./test/${tag.title}`
        } else if (tagObj[tag.parentTag.uuid].path !== undefined) {
          tagObj[tag.uuid].path = `${tagObj[tag.parentTag.uuid].path}/${tag.title}`
        } else {
          return tag
        }
      })
      .filter((tag) => tag !== undefined)
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
        text = frontmatter + text

        await Deno.writeTextFile(fileName, text, { create: true })
      }
    }
  }
}

createPath()
createDirectoriesFiles()
