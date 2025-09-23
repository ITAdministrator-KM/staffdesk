import { notFound } from 'next/navigation';
import { projects } from '@/lib/data';

// Generate static params for all projects
export async function generateStaticParams() {
  return projects.map((project) => ({
    id: project.id,
  }));
}

export default function ProjectDashboardPage({
  params,
}: {
  params: { id: string };
}) {
  const project = projects.find((p) => p.id === params.id);

  if (!project) {
    notFound();
  }

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight">{project.name}</h1>
        <p className="mt-2 text-muted-foreground">{project.description}</p>
      </div>
      <div className="p-8 text-center text-muted-foreground">
        <p>Project dashboard functionality available in development mode.</p>
        <p>This is a static export for deployment.</p>
      </div>
    </div>
  );
}
