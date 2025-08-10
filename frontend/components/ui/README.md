# Professional Markdown Editor

A comprehensive, reusable markdown editor component for React/Next.js applications.

## Features

- ✅ **Rich toolbar** with formatting options
- ✅ **Live preview** with syntax highlighting
- ✅ **Keyboard shortcuts** (⌘/Ctrl+B for bold, etc.)
- ✅ **Drag & drop** image support
- ✅ **Export options** (HTML, Markdown)
- ✅ **Fullscreen mode** for distraction-free writing
- ✅ **Customizable** - show/hide toolbar, preview, footer
- ✅ **TypeScript** support
- ✅ **Tailwind CSS** styling
- ✅ **Dynamic imports** - won't break if markdown packages aren't installed

## Installation

### Required Packages

For full rendering features, install these packages:

```bash
npm install remark remark-parse remark-rehype rehype-stringify rehype-highlight rehype-katex remark-gfm remark-footnotes
```

### Optional Packages

- `rehype-highlight` - Syntax highlighting
- `rehype-katex` - Math rendering
- `remark-gfm` - GitHub Flavored Markdown
- `remark-footnotes` - Footnotes support

## Basic Usage

```tsx
import ProfessionalMarkdownEditor from '@/components/ui/MarkdownEditor'

export default function MyComponent() {
  const [content, setContent] = useState('')

  return (
    <ProfessionalMarkdownEditor
      initialValue="# Hello World"
      onChange={(md) => setContent(md)}
      onSave={async (md) => {
        await saveToDatabase(md)
      }}
    />
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialValue` | `string` | `""` | Initial markdown content |
| `onChange` | `(md: string) => void` | `undefined` | Called when content changes |
| `className` | `string` | `""` | Additional CSS classes |
| `placeholder` | `string` | `"Write your markdown here..."` | Placeholder text |
| `showToolbar` | `boolean` | `true` | Show/hide the formatting toolbar |
| `showPreview` | `boolean` | `true` | Show/hide the preview panel |
| `showFooter` | `boolean` | `true` | Show/hide the footer with stats |
| `height` | `string` | `"min-h-[300px]"` | Editor height |
| `onSave` | `(md: string) => Promise<void>` | `undefined` | Save callback |
| `onCancel` | `() => void` | `undefined` | Cancel callback |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl+B | Bold |
| ⌘/Ctrl+I | Italic |
| ⌘/Ctrl+K | Insert Link |
| ⌘/Ctrl+Shift+C | Code Block |
| ⌘/Ctrl+S | Save |

## Usage Examples

### 1. Full Featured Editor

```tsx
<ProfessionalMarkdownEditor
  initialValue="# Welcome"
  onChange={(md) => setContent(md)}
  onSave={handleSave}
  onCancel={() => router.back()}
/>
```

### 2. Minimal Editor (No Toolbar)

```tsx
<ProfessionalMarkdownEditor
  showToolbar={false}
  showPreview={false}
  showFooter={false}
  placeholder="Start typing..."
/>
```

### 3. Preview Only Mode

```tsx
<ProfessionalMarkdownEditor
  initialValue="# Read-only content"
  showToolbar={false}
  showPreview={true}
  showFooter={false}
/>
```

### 4. Compact Editor

```tsx
<ProfessionalMarkdownEditor
  height="min-h-[120px]"
  showFooter={false}
  placeholder="Quick note..."
/>
```

### 5. Custom Styling

```tsx
<ProfessionalMarkdownEditor
  className="border-2 border-blue-200 rounded-lg"
  height="min-h-[400px]"
/>
```

## Toolbar Features

The toolbar includes buttons for:

- **Headings**: H1, H2, H3
- **Text Formatting**: Bold, Italic, Strikethrough
- **Links & Media**: Links, Images
- **Code**: Inline code, Code blocks
- **Lists**: Bullet lists, Numbered lists, Checkboxes
- **Other**: Blockquotes, Tables, Horizontal rules

## Export Options

- **Copy HTML**: Copy rendered HTML to clipboard
- **Download MD**: Download markdown file
- **Download HTML**: Download HTML file

## Integration with Chatbots

Perfect for chatbot responses that need rich formatting:

```tsx
// In your chatbot component
const [response, setResponse] = useState('')

return (
  <div className="chat-response">
    <ProfessionalMarkdownEditor
      initialValue={response}
      onChange={setResponse}
      showToolbar={true}
      showPreview={true}
      height="min-h-[200px]"
      onSave={async (md) => {
        await sendChatResponse(md)
      }}
    />
  </div>
)
```

## Integration with Playground

Great for testing agent responses:

```tsx
// In your playground component
const [testResponse, setTestResponse] = useState('')

return (
  <div className="playground-editor">
    <ProfessionalMarkdownEditor
      initialValue={testResponse}
      onChange={setTestResponse}
      placeholder="Test your agent's response formatting..."
      onSave={async (md) => {
        await updateAgentInstructions(md)
      }}
    />
  </div>
)
```

## Fallback Behavior

If markdown packages aren't installed, the editor will:

1. Still work for editing
2. Show basic HTML escaping in preview
3. Not break your application
4. Log warnings to console

## Customization

You can customize the appearance by:

1. **Modifying CSS classes** in the component
2. **Using Tailwind classes** via the `className` prop
3. **Overriding styles** with CSS modules or styled-components
4. **Extending the toolbar** with custom buttons

## Performance

- **Dynamic imports** ensure markdown packages are only loaded when needed
- **Debounced rendering** prevents excessive re-renders
- **Cancellable operations** prevent memory leaks
- **Optimized for large documents** with efficient text processing

## Browser Support

- Modern browsers with ES6+ support
- Requires clipboard API for copy functionality
- Drag & drop support for file uploads

## License

This component is part of your project and follows the same license terms. 