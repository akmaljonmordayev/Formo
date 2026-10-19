import { registerRootComponent } from 'expo';
import App from './src/App';

// DEV-ONLY instrumentation: logs every TextInput focus/blur transition that
// flows through the shared RN TextInputState registry. No-op in release
// bundles. Delete this single line (and src/debug/focusTrace.js) when the
// focus investigation is finished.
import { install as installFocusTrace } from './src/debug/focusTrace';
installFocusTrace();

registerRootComponent(App);