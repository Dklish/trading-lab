export default async function Home() {
  const markets = await fetch("http://localhost:4000/markets")
    .then((res) => res.json())
    .catch((err) => {
      console.error("Failed to fetch markets:", err);
      return null;
    });

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div>
        <h1 className="text-2xl font-semibold mb-4">Trading Lab UI</h1>
        <pre>{JSON.stringify(markets, null, 2)}</pre>
      </div>
    </main>
  );
}
