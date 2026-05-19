import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { normalizeNoteForEditor, noteHtmlForStorage } from '../utils/noteContent.js';

function FormatButton({ active, onClick, label, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`rounded px-2 py-1 text-xs font-semibold ${
        active ? 'bg-blue-100 text-blue-800' : 'text-slate-600 hover:bg-slate-100'
      } ${className}`}
    >
      {children}
    </button>
  );
}

function FormatToolbar({ editor }) {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 px-2 py-1.5">
      <FormatButton
        active={editor.isActive('bold')}
        label="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </FormatButton>
      <FormatButton
        active={editor.isActive('italic')}
        label="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className="italic"
      >
        I
      </FormatButton>
      <FormatButton
        active={editor.isActive('underline')}
        label="Underline"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className="underline"
      >
        U
      </FormatButton>
      <span className="mx-1 text-slate-300" aria-hidden="true">
        |
      </span>
      <FormatButton
        active={editor.isActive('bulletList')}
        label="Bullet list"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </FormatButton>
      <FormatButton
        active={editor.isActive('orderedList')}
        label="Ordered list"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </FormatButton>
    </div>
  );
}

const RichTextEditor = forwardRef(function RichTextEditor({ content, slideKey, onChange }, ref) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: normalizeNoteForEditor(content),
    editorProps: {
      attributes: {
        class: 'notes-editor__content',
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      onChange(noteHtmlForStorage(activeEditor.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.commands.setContent(normalizeNoteForEditor(content), { emitUpdate: false });
  }, [slideKey, editor]);

  useImperativeHandle(
    ref,
    () => ({
      insertHighlightMarker(marker) {
        if (!editor) {
          return;
        }

        const isEmpty = !noteHtmlForStorage(editor.getHTML());

        if (isEmpty) {
          editor.chain().focus().insertContent(`<p>${marker}</p>`).run();
        } else {
          editor.chain().focus('end').insertContent(`<p>${marker}</p>`).run();
        }

        onChange(noteHtmlForStorage(editor.getHTML()));
      },
    }),
    [editor, onChange],
  );

  return (
    <div className="notes-editor mt-3 flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
      <FormatToolbar editor={editor} />
      <EditorContent editor={editor} className="notes-editor__surface min-h-0 flex-1 overflow-y-auto" />
    </div>
  );
});

export default RichTextEditor;
