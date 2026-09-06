import { SideleafProvider } from './hooks/useSideleaf';
import { AppShell } from './components/AppShell';

export function App() {
  return (
    <SideleafProvider>
      <AppShell />
    </SideleafProvider>
  );
}

export default App;
