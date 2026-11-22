// Self-hosted Monaco: the editor and its worker are part of the build, so the app has no runtime dependency on a public CDN
// (works offline, no third-party script origin in the CSP). Only the editor core plus the two languages the app uses (C++ and SQL)
// are bundled. This module is only ever loaded together with a workspace or the SQL lab.
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main';
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution';
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
export { default } from '@monaco-editor/react';

(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
(window as unknown as { monaco: typeof monaco }).monaco = monaco;   // same global the CDN loader provided (the browser tests drive the editor through it)
