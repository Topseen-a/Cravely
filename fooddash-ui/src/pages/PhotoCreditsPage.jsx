import { Card, PageTitle } from '../components/ui';
import { PHOTO_CREDITS } from '../lib/photoCredits';

// Attribution required by the Creative Commons licences of the food photos.
export default function PhotoCreditsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle eyebrow="Thank you" title="Photo credits">
        Our food photos come from Wikimedia Commons. We resized and cropped them for this site.
      </PageTitle>
      <Card className="divide-y divide-ink/10">
        {PHOTO_CREDITS.map((c) => (
          <div key={c.file} className="flex items-center gap-4 p-4">
            <img src={`/food/${c.file}`} alt="" loading="lazy" className="h-14 w-[4.5rem] shrink-0 rounded-xl object-cover" />
            <p className="min-w-0 text-sm">
              <a href={c.source} target="_blank" rel="noreferrer" className="font-semibold underline-offset-2 hover:underline">{c.title}</a>
              <span className="block text-ink-soft">
                by {c.author} ·{' '}
                <a href={c.licenseUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{c.license}</a>
              </span>
            </p>
          </div>
        ))}
      </Card>
    </div>
  );
}
