import { useEffect } from "react";

import { useAuthStore } from "@/features/auth/store/auth.store";
import AppRouter from "@/router/AppRouter";

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return <AppRouter />;
}

export default App;