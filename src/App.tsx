import { WorkpadProvider } from './hooks/useWorkpad';
import { AppShell } from './components/AppShell';

export function App() {
  return (
    <WorkpadProvider>
      <AppShell />
    </WorkpadProvider>
  );
}

export default App;
