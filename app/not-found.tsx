import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container mx-auto py-12 text-center">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-muted-foreground mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold">
        Go back home
      </Link>
    </div>
  );
}

