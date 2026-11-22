// Self-hosted Monaco: the editor and its worker are part of the build, so the app has no runtime dependency on a public CDN
// (works offline, no third-party script origin in the CSP). Only the editor core plus the two languages the app uses (C++ and SQL)
// are bundled. This module is only ever loaded together with a workspace or the SQL lab.
import { loader } from '@monaco-editor/react';
import Editor, { EditorProps } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main';
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution';
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import { useTheme } from '../theme';

(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
(window as unknown as { monaco: typeof monaco }).monaco = monaco;   // same global the CDN loader provided (the browser tests drive the editor through it)

// editor themes that match the app's own palette (dark and light)
monaco.editor.defineTheme('csquest-dark', {
  base: 'vs-dark', inherit: true,
  rules: [{ token: 'keyword', foreground: 'a5b0ff', fontStyle: 'bold' }, { token: 'string', foreground: '7ee0b5' }, { token: 'number', foreground: 'fbbf24' }, { token: 'comment', foreground: '6b7494', fontStyle: 'italic' }, { token: 'type', foreground: '67d4f5' }],
  colors: { 'editor.background': '#121626', 'editor.foreground': '#eceffa', 'editorLineNumber.foreground': '#555e80', 'editorLineNumber.activeForeground': '#aab3d6', 'editor.lineHighlightBackground': '#1a203600', 'editorGutter.background': '#121626', 'editorCursor.foreground': '#7c8cff', 'editor.selectionBackground': '#3a4690aa' },
});
monaco.editor.defineTheme('csquest-light', {
  base: 'vs', inherit: true,
  rules: [{ token: 'keyword', foreground: '4a56e6', fontStyle: 'bold' }, { token: 'string', foreground: '0e8f62' }, { token: 'number', foreground: 'b45309' }, { token: 'comment', foreground: '8a93b2', fontStyle: 'italic' }, { token: 'type', foreground: '0877a0' }],
  colors: { 'editor.background': '#ffffff', 'editor.foreground': '#131a30', 'editorLineNumber.foreground': '#9aa3c2', 'editorGutter.background': '#ffffff', 'editor.lineHighlightBackground': '#f0f2fb00', 'editorCursor.foreground': '#4a56e6' },
});

/** The app's code editor: always uses the theme the user picked. */
export default function CodeEditor(props: EditorProps) {
  const theme = useTheme(s => s.theme);
  return <Editor {...props} theme={theme === 'light' ? 'csquest-light' : 'csquest-dark'} options={{ fontFamily: "'JetBrains Mono Variable', Consolas, monospace", padding: { top: 10 }, stickyScroll: { enabled: false }, ...props.options }} />;
}
