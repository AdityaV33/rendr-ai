import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/v1/health");

        if (!response.ok) {
          throw new Error("Failed to fetch");
        }

        const data = await response.json();

        setMessage(data.message);
      } catch (error) {
        console.error(error);
        setMessage("Failed to connect to server");
      }
    };

    fetchHealth();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black">
      <h1 className="text-4xl font-bold text-white">{message}</h1>
    </main>
  );
}

export default App;