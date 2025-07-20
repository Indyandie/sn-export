import standard from './data.json' with { type: 'json' }
import { parseArgs } from 'jsr:@std/cli/parse-args'

const args = parseArgs(Deno.args, {
  string: ['file'],
  alias: {
    file: 'f',
  },
})

const snFile = args.file
console.log(snFile)

let snJson = await Deno.readTextFile(snFile)
snJson = JSON.parse(snJson)
console.log(snJson)

// using file = await Deno.open(snFile, { read: true });
// const fileInfo = await file.stat();
// if (fileInfo.isFile) {
//   const buf = new Uint8Array(100);
//   const numberOfBytesRead = await file.read(buf); // 11 bytes
//   const text = new TextDecoder().decode(buf);  // "hello world"
// } else {
//   console.snFile, " is not a file"
// }

let notes = standard.items.filter((item) => item.content_type === 'Note')

notes = notes.map((note) => {
  const { created_at, updated_at, content, uuid } = note
  const { title, text, noteType } = content

  return {
    created_at,
    updated_at,
    uuid,
    title,
    text,
    noteType,
    tags: [],
  }
})

const notesObj = {}
notes.map((note) => {
  notesObj[note.uuid] = note
})

let tags = standard.items.filter((item) => item.content_type === 'Tag')

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

async function _createDirectoriesFiles() {
  for (const key in tagObj) {
    const tag = tagObj[key]
    const { path, notes } = tag
    // console.log(notes)
    // console.log(notesObj[notes[0].uuid])
    await Deno.mkdir(`${path}`, { recursive: true })

    for (const index in notes) {
      // console.log('note: ', notesObj[notes[index].uuid])
      const thisNote = notesObj[notes[index].uuid]

      // console.log(typeof thisNote)
      if (thisNote !== undefined) {
        let { title, text, created_at, updated_at } = notesObj[notes[index].uuid]
        // console.log('\n', path, title)
        title = (title === undefined) ? created_at : title
        const fileName = `${path}/${title.toLowerCase().replaceAll(' ', '-')}.md`
        const frontmatter = `---\ncreated_at: ${created_at}\nupdate_at: ${updated_at}\n---\n\n`
        console.log(fileName, '\n', frontmatter, text)
        text = frontmatter + text

        await Deno.writeTextFile(fileName, text, { create: true })
      }
    }

    // create dir
  }
}

createPath()
_createDirectoriesFiles()

// console.log(tagObj)
// await Deno.mkdir("test/test")
