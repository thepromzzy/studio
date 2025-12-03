import { Timer } from '@/components/timer';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-headline text-center font-bold mb-2 text-foreground/90">
          Zenith Timer
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Your minimalist companion for focused work sessions.
        </p>
        <Timer />
      </div>
    </main>
  );
}
