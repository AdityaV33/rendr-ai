import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

import { useAuthStore } from "@/features/auth/store/auth.store";
import AppRouter from "@/router/AppRouter";

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <>
      <Toaster position="bottom-right" />
      <AppRouter />
    </>
  );
}

export default App;