import { notFound } from 'next/navigation';
import { PageHero, Section } from '@/components/ui';
import { getCmsForm } from '@/lib/cms';
import FormRenderer from '@/components/FormRenderer';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const form = await getCmsForm(params.slug);
  return {
    title: form ? `${form.name} | World Direct Link` : 'Form | World Direct Link',
    description: form?.description,
  };
}

export default async function DynamicFormPage({ params }: { params: { slug: string } }) {
  const form = await getCmsForm(params.slug);
  if (!form) notFound();

  return (
    <>
      <PageHero eyebrow="World Direct Link" title={form.name} subtitle={form.description} />
      <Section>
        <div className="max-w-2xl">
          <FormRenderer form={form} />
        </div>
      </Section>
    </>
  );
}
