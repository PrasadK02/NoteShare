import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useEffect, useCallback, useRef } from 'react'
import {
  Bold, Italic, Strikethrough, Code, Quote,
  Heading1, Heading2, List, ListOrdered, Minus,
} from 'lucide-react'

const ToolbarBtn = ({ onClick, active, title, children }) => (
  <button
    onMouseDown={e => { e.preventDefault(); onClick() }}
    title={title}
    style={{
      width: 30, height: 30,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      background: active ? 'var(--accent-dim)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--text-secondary)',
      cursor: 'pointer',
      transition: 'var(--transition)',
      flexShrink: 0,
    }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-primary)' }}}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}}
  >
    {children}
  </button>
)

const Divider = () => (
  <span style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />
)

export function NoteEditor({ content, onChange, readOnly = false, placeholder = 'Start writing…' }) {
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate({ editor }) {
      onChangeRef.current?.(editor.getJSON())
    },
  })

  // Sync external content updates (from socket)
  const lastExternal = useRef(null)
  useEffect(() => {
    if (!editor || !content) return
    const json = JSON.stringify(content)
    if (json !== lastExternal.current) {
      lastExternal.current = json
      const cur = JSON.stringify(editor.getJSON())
      if (json !== cur) {
        editor.commands.setContent(content, false)
      }
    }
  }, [content, editor])

  useEffect(() => {
    if (editor) editor.setEditable(!readOnly)
  }, [readOnly, editor])

  if (!editor) return null

  const iconSize = 14

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Toolbar */}
      {!readOnly && (
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.15rem',
          padding: '0.4rem 0.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
          position: 'sticky', top: 56, zIndex: 10,
        }}>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (⌘B)">
            <Bold size={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (⌘I)">
            <Italic size={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <Strikethrough size={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
            <Code size={iconSize} />
          </ToolbarBtn>

          <Divider />

          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
            <Heading1 size={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
            <Heading2 size={iconSize} />
          </ToolbarBtn>

          <Divider />

          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
            <List size={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
            <ListOrdered size={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
            <Quote size={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider">
            <Minus size={iconSize} />
          </ToolbarBtn>

          {/* Char count */}
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}>
            {editor.storage.characterCount.characters()} chars
          </span>
        </div>
      )}

      {/* Editor area */}
      <div style={{
        padding: '1.5rem 1.75rem',
        background: 'var(--bg-elevated)',
        borderRadius: readOnly ? 'var(--radius-md)' : '0 0 var(--radius-md) var(--radius-md)',
        border: '1px solid var(--border)',
        borderTop: readOnly ? undefined : 'none',
        minHeight: 320,
      }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
