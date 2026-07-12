import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Astro bundles this module into dist/ at a location that varies by route,
// so a relative import.meta.url path breaks after build — anchor to the
// project root (Astro always runs the build with cwd there) instead.
const fontDir = join(process.cwd(), 'src/assets/og-fonts');
const loadFont = (file: string) => readFileSync(join(fontDir, file));

const fonts = [
  { name: 'Fraunces', data: loadFont('Fraunces-Bold.woff'), weight: 700 as const, style: 'normal' as const },
  { name: 'Fraunces', data: loadFont('Fraunces-SemiBold.woff'), weight: 600 as const, style: 'normal' as const },
  { name: 'Inter', data: loadFont('Inter-Regular.woff'), weight: 400 as const, style: 'normal' as const },
  { name: 'Inter', data: loadFont('Inter-SemiBold.woff'), weight: 600 as const, style: 'normal' as const },
];

const INK = '#14110F';
const PAPER = '#FFFBF2';
const SLATE = '#6B6358';
const SIGNAL = '#FF2D78';
const PAPER_LINE = '#ECE3CF';

export interface OgImageOptions {
  eyebrow: string;
  title: string;
  meta: string;
}

// The Wire's clustering feature can produce very long titles; scale the
// display size down so satori still lays the card out within 630px tall
// instead of overflowing.
function titleFontSize(title: string): number {
  if (title.length > 100) return 42;
  if (title.length > 70) return 50;
  if (title.length > 45) return 58;
  return 68;
}

export async function renderOgImage({ eyebrow, title, meta }: OgImageOptions): Promise<Buffer> {
  const markup = {
    type: 'div',
    props: {
      style: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '1200px',
        height: '630px',
        backgroundColor: PAPER,
        padding: '64px',
        fontFamily: 'Inter',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '10px',
              backgroundColor: SIGNAL,
              display: 'flex',
            },
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontFamily: 'Fraunces',
                    fontWeight: 700,
                    fontSize: '32px',
                    color: INK,
                  },
                  children: [
                    { type: 'span', props: { children: 'The Duke' } },
                    { type: 'span', props: { style: { color: SIGNAL, marginLeft: '8px' }, children: 'Post' } },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    fontSize: '20px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: INK,
                    border: `2px solid ${INK}`,
                    borderRadius: '999px',
                    padding: '10px 22px',
                  },
                  children: eyebrow,
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              fontFamily: 'Fraunces',
              fontWeight: 700,
              fontSize: `${titleFontSize(title)}px`,
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              color: INK,
            },
            children: title,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: `2px solid ${PAPER_LINE}`,
              paddingTop: '28px',
              fontFamily: 'Inter',
              fontSize: '20px',
              color: SLATE,
            },
            children: [
              { type: 'div', props: { style: { display: 'flex' }, children: meta } },
              { type: 'div', props: { style: { display: 'flex' }, children: 'thedukepost.com' } },
            ],
          },
        },
      ],
    },
  };

  const svg = await satori(markup as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts,
  });

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return resvg.render().asPng();
}
